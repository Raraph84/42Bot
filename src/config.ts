import { AutocompleteInteraction, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Pool, RowDataPacket } from "mysql2/promise";
import { months } from "./utils";
import * as intra from "./42api";

let campuses: any[] | null = null;
let cursuses: any[] | null = null;

export const command = async (interaction: ChatInputCommandInteraction, database: Pool) => {
    const subcommand = interaction.options.getSubcommandGroup() ?? interaction.options.getSubcommand();

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

        try {
            if (!campuses) campuses = await intra.getCampuses({});
            if (!cursuses) cursuses = await intra.getCursuses({});
        } catch (error) {
            interaction.editReply(":x: Un problème est survenu.");
            return;
        }

        const description = ["### Règles d'attribution de rôles :"];
        for (const rule of rules) {
            const conditions: string[] = [];
            if (rule.pool_year && !rule.pool_month) conditions.push(`Piscine ${rule.pool_year}`);
            if (rule.pool_month && !rule.pool_year)
                conditions.push(`Piscine ${Object.values(months)[rule.pool_month - 1]}`);
            if (rule.pool_month && rule.pool_year)
                conditions.push(`Piscine ${Object.values(months)[rule.pool_month - 1]} ${rule.pool_year}`);
            if (rule.campus_id) conditions.push(`Campus ${campuses!.find((c) => c.id === rule.campus_id).name}`);
            if (rule.cursus_id) conditions.push(`Cursus ${cursuses!.find((c) => c.id === rule.cursus_id).name}`);

            description.push(`<@&${rule.role_id}> :`);
            if (conditions.length) description.push(conditions.map((c) => `- ${c}`).join("\n"));
            else description.push("- *Aucune condition*");
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
        } else if (action === "remove") {
        }
    }
};

export const autocomplete = async (interaction: AutocompleteInteraction) => {
    if (interaction.options.getSubcommandGroup() !== "rolerules") return;

    const subcommand = interaction.options.getSubcommand();
    const option = interaction.options.getFocused(true);
    if (subcommand === "add" && option.name === "campus") {
        if (!campuses) {
            try {
                campuses = await intra.getCampuses({});
            } catch (error) {
                return;
            }
            campuses!.sort((a, b) => a.name.localeCompare(b.name));
        }

        const options = campuses!
            .filter((campus: any) => campus.name.toLowerCase().includes(option.value.toLowerCase()))
            .slice(0, 25)
            .map((campus: any) => ({ name: campus.name, value: campus.id.toString() }));

        interaction.respond(options).catch(() => {});
    } else if (subcommand === "add" && option.name === "cursus") {
        if (!cursuses) {
            try {
                cursuses = await intra.getCursuses({});
            } catch (error) {
                return;
            }
            cursuses!.sort((a, b) => a.name.localeCompare(b.name));
        }

        const options = cursuses!
            .filter((cursus: any) => cursus.name.toLowerCase().includes(option.value.toLowerCase()))
            .slice(0, 25)
            .map((cursus: any) => ({ name: cursus.name, value: cursus.id.toString() }));

        interaction.respond(options).catch(() => {});
    } else if (subcommand === "remove" && option.name === "rule") {
        interaction.respond([]);
    }
};
