import { AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Pool, RowDataPacket } from "mysql2/promise";
import { months } from "./utils";
import * as intra from "./42api";

let campuses: any[] | null = null;
let cursuses: any[] | null = null;

const formatRuleConditions = (rule: any) => {
    const conditions: string[] = [];
    if (rule.pool_year && !rule.pool_month) conditions.push(`Piscine ${rule.pool_year}`);
    if (rule.pool_month && !rule.pool_year) conditions.push(`Piscine ${Object.values(months)[rule.pool_month - 1]}`);
    if (rule.pool_month && rule.pool_year)
        conditions.push(`Piscine ${Object.values(months)[rule.pool_month - 1]} ${rule.pool_year}`);
    if (rule.campus_id)
        conditions.push(`Campus ${campuses!.find((c) => c.id === rule.campus_id)?.name || rule.campus_id}`);
    if (rule.cursus_id)
        conditions.push(`Cursus ${cursuses!.find((c) => c.id === rule.cursus_id)?.name || rule.cursus_id}`);
    return conditions;
};

export const command = async (interaction: ChatInputCommandInteraction, database: Pool) => {
    const subcommand = interaction.options.getSubcommandGroup() ?? interaction.options.getSubcommand();

    try {
        if (!campuses) campuses = await intra.getCampuses();
        if (!cursuses) cursuses = await intra.getCursuses();
    } catch (error) {
        interaction.editReply(":x: Un problème est survenu.");
        return;
    }

    if (subcommand === "show") {
        await interaction.deferReply();

        const [rules] = await database.query<RowDataPacket[]>("SELECT * FROM linked_roles WHERE guild_id=?", [
            interaction.guildId
        ]);

        if (!rules.length) {
            interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle("Configuration du serveur")
                        .setDescription("Aucune règle de rôle n'est configurée pour ce serveur.")
                        .setColor(0xffffff)
                ]
            });
            return;
        }

        const description = ["**Règles d'attribution de rôles :**"];
        for (const rule of rules) {
            const conditions = formatRuleConditions(rule);
            if (conditions.length) description.push(`<@&${rule.role_id}> : ${conditions.join(" + ")}`);
            else description.push(`<@&${rule.role_id}> : *Aucune condition*`);
        }

        interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle("Configuration du serveur")
                    .setDescription(description.join("\n"))
                    .setColor(0xffffff)
            ]
        });
    } else if (subcommand === "rolerules") {
        const action = interaction.options.getSubcommand();

        if (action === "add") {
            const role = interaction.options.getRole("role", true);
            const poolYear = interaction.options.getNumber("poolyear");
            const poolMonth = interaction.options.getNumber("poolmonth");
            const campusId = interaction.options.getNumber("campus");
            const cursusId = interaction.options.getNumber("cursus");

            if (role.id === interaction.guildId) {
                interaction.reply(":x: Vous ne pouvez pas utiliser le rôle @everyone.");
                return;
            }

            const self = await interaction.guild!.members.fetchMe();
            if (role.position >= self.roles.highest.position) {
                interaction.reply(
                    ":x: Le rôle sélectionné est au-dessus ou au même niveau que le rôle le plus élevé du bot. Veuillez placer le rôle du bot au-dessus dans les paramètres du serveur."
                );
                return;
            }

            try {
                await database.query(
                    "INSERT INTO linked_roles (guild_id, role_id, pool_year, pool_month, campus_id, cursus_id) VALUES (?, ?, ?, ?, ?, ?)",
                    [interaction.guildId, role.id, poolYear, poolMonth, campusId, cursusId]
                );
            } catch (error) {
                interaction.reply(":x: Un problème est survenu.");
                return;
            }

            const conditions = formatRuleConditions({
                pool_year: poolYear,
                pool_month: poolMonth,
                campus_id: campusId,
                cursus_id: cursusId
            });
            const ruleText = conditions.length
                ? `<@&${role.id}> : ${conditions.join(" + ")}`
                : `<@&${role.id}> : *Aucune condition*`;
            interaction.reply(`:white_check_mark: Règle ajoutée : ${ruleText}`);
        } else if (action === "remove") {
            const ruleId = interaction.options.getNumber("rule", true);

            const [rules] = await database.query<RowDataPacket[]>(
                "SELECT * FROM linked_roles WHERE guild_id=? AND rule_id=?",
                [interaction.guildId, ruleId]
            );

            if (!rules[0]) {
                interaction.reply(":x: Règle introuvable.");
                return;
            }

            try {
                await database.query("DELETE FROM linked_roles WHERE rule_id=?", [ruleId]);
            } catch (error) {
                interaction.reply(":x: Un problème est survenu.");
                return;
            }

            const conditions = formatRuleConditions(rules[0]);
            const ruleText = conditions.length
                ? `<@&${rules[0].role_id}> : ${conditions.join(" + ")}`
                : `<@&${rules[0].role_id}> : *Aucune condition*`;
            interaction.reply(`:white_check_mark: Règle supprimée : ${ruleText}`);
        }
    }
};

export const autocomplete = async (interaction: AutocompleteInteraction, database: Pool) => {
    if (interaction.options.getSubcommandGroup() !== "rolerules") return;

    try {
        if (!campuses) campuses = await intra.getCampuses();
        if (!cursuses) cursuses = await intra.getCursuses();
    } catch (error) {
        interaction.respond([]).catch(() => {});
        return;
    }

    const subcommand = interaction.options.getSubcommand();
    const option = interaction.options.getFocused(true);
    if (subcommand === "add" && option.name === "campus") {
        campuses!.sort((a, b) => a.name.localeCompare(b.name));

        const options = campuses!
            .filter((campus: any) => campus.name.toLowerCase().includes(option.value.toLowerCase()))
            .slice(0, 25)
            .map((campus: any) => ({ name: campus.name, value: campus.id.toString() }));

        interaction.respond(options).catch(() => {});
    } else if (subcommand === "add" && option.name === "cursus") {
        cursuses!.sort((a, b) => a.name.localeCompare(b.name));

        const options = cursuses!
            .filter((cursus: any) => cursus.name.toLowerCase().includes(option.value.toLowerCase()))
            .slice(0, 25)
            .map((cursus: any) => ({ name: cursus.name, value: cursus.id.toString() }));

        interaction.respond(options).catch(() => {});
    } else if (subcommand === "remove" && option.name === "rule") {
        const [rules] = await database.query<RowDataPacket[]>("SELECT * FROM linked_roles WHERE guild_id=?", [
            interaction.guildId
        ]);

        const options = rules
            .map((rule) => {
                const role = interaction.guild!.roles.cache.get(rule.role_id);
                const conditions = formatRuleConditions(rule);
                const name = `${role?.name ?? `Rôle ${rule.role_id}`} : ${conditions.length ? conditions.join(" + ") : "Aucune condition"}`;
                return {
                    name: name.length > 100 ? name.substring(0, 97) + "..." : name,
                    value: rule.rule_id.toString()
                };
            })
            .filter((rule) => rule.name.toLowerCase().includes(option.value.toLowerCase()))
            .slice(0, 25);

        interaction.respond(options).catch(() => {});
    }
};
