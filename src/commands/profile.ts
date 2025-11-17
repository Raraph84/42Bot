import {
    ActionRowBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    MessageFlags,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from "discord.js";
import { Pool } from "mysql2/promise";
import { getUserLink, months } from "../utils.js";
import * as intra from "../42api.js";
import * as intraScraper from "../42scraper.js";
import moment from "moment";

export const command = async (interaction: ChatInputCommandInteraction, database: Pool) => {
    const link = await getUserLink(database, interaction.user.id);
    if (!link) {
        interaction.reply(":x: Votre compte Discord n'est pas lié à votre intra 42 !");
        return;
    }

    await interaction.deferReply();

    const token = await intra.refreshOauthToken(link.refresh_token);
    try {
        await database.query("UPDATE linked_users SET refresh_token=? WHERE discord_user_id=?", [
            token.refresh_token,
            interaction.user.id
        ]);
    } catch (error) {
        console.error("Database error", error);
        interaction.editReply(":x: Un problème est survenu.");
        return;
    }

    let user;
    try {
        user = await intra.getUser(token, interaction.options.getString("login") ?? link.login);
    } catch (error) {
        interaction.editReply(":x: Utilisateur intra 42 introuvable.");
        return;
    }

    const genMessage = async (cursusId: number | null = null) => {
        const description = [
            `**Cursus :** ${user.cursus_users.map((c: any) => c.cursus.name).join(", ")}`,
            `**Points d'évaluation :** ${user.correction_point}`,
            `**Argent :** ${user.wallet}₳`,
            `**Succès :** ${user.achievements.length}`,
            `**Piscine :** ${months[user.pool_month]} ${user.pool_year}`,
            `**Campus :** ${user.campus.map((c: any) => c.name).join(", ")}`
        ];
        let color = 0xffffff;
        if (user.location) description.push(`**Position :** ${user.location}`);
        if (cursusId) {
            const cursus = user.cursus_users.find((c: any) => c.cursus.id === cursusId);
            const coalition = await intraScraper.getUserCoalition(user.login, cursus.cursus.slug);
            const projects = user.projects_users.filter((p: any) => p.cursus_ids.includes(cursusId));
            const currentProjects = projects.filter((p: any) => !p.marked);
            description.push("");
            description.push(`__**Cursus :**__ ${cursus.cursus.name}`);
            description.push(`**Niveau :** ${cursus.level.toFixed(2)}`);
            if (cursus.grade) description.push(`**Grade :** ${cursus.grade}`);
            description.push(`**Débuté le :** ${moment(cursus.begin_at).format("DD/MM/YYYY")}`);
            if (cursus.end_at) description.push(`**Terminé le :** ${moment(cursus.end_at).format("DD/MM/YYYY")}`);
            if (cursus.blackholed_at)
                description.push(`**Blackhole le :** ${moment(cursus.blackholed_at).format("DD/MM/YYYY")}`);
            description.push(
                `**Projets :** ${projects.length}`,
                `**Projets validés :** ${projects.filter((p: any) => p["validated?"]).length}`
            );
            if (currentProjects.length)
                description.push(
                    `**Projets en cours :** ${currentProjects.map((p: any) => p.project.name).join(", ")}`
                );
            if (coalition.coalitions_user) {
                description.push(`**Coalition :** ${coalition.coalitions_user.coalition.name}`);
                description.push(`**Points de coalition :** ${coalition.coalitions_user.score}`);
                description.push(`**Rang :** ${coalition.coalitions_user.rank}`);
                color = coalition.coalitions_user.coalition.color;
            }
        }
        return {
            embeds: [
                new EmbedBuilder()
                    .setTitle(`${user.displayname} (@${user.login})`)
                    .setDescription(description.join("\n"))
                    .setThumbnail(user.image.link)
                    .setColor(color)
            ],
            components: [
                new ActionRowBuilder<any>().setComponents([
                    new StringSelectMenuBuilder()
                        .setCustomId("cursus")
                        .setPlaceholder("Afficher les détails d'un cursus")
                        .setOptions(
                            user.cursus_users.map((c: any) =>
                                new StringSelectMenuOptionBuilder()
                                    .setDefault(cursusId === c.cursus.id)
                                    .setLabel(c.cursus.name)
                                    .setValue(`c_${c.cursus.id}`)
                            )
                        )
                ])
            ]
        };
    };

    const reply = await interaction.editReply(await genMessage());
    const collector = reply.createMessageComponentCollector({ time: 60000 });
    collector.on("collect", async (i) => {
        if (!i.isStringSelectMenu()) return;
        if (i.user.id !== interaction.user.id) {
            await i.reply({ content: ":x: Ce n'est pas votre commande !", flags: MessageFlags.Ephemeral });
            return;
        }

        collector.resetTimer();
        await i.deferUpdate();
        await i.editReply(await genMessage(parseInt(i.values[0]!.slice(2))));
    });
    collector.on("end", () => {
        interaction.editReply({ components: [] });
    });
};
