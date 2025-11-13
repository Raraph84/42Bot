import {
    ActionRowBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from "discord.js";
import { Pool, RowDataPacket } from "mysql2/promise";
import * as intra from "../42api.js";
import moment from "moment";

const months: { [key: string]: string } = {
    january: "Janvier",
    february: "Février",
    march: "Mars",
    april: "Avril",
    may: "Mai",
    june: "Juin",
    july: "Juillet",
    august: "Août",
    september: "Septembre",
    october: "Octobre",
    november: "Novembre",
    december: "Décembre"
};

export const command = async (interaction: ChatInputCommandInteraction, database: Pool) => {
    let links;
    try {
        [links] = await database.query<RowDataPacket[]>("SELECT * FROM linked_users WHERE discord_user_id=?", [
            interaction.user.id
        ]);
    } catch (error) {
        console.error("Database error", error);
        interaction.reply(":x: Un problème est survenu.");
        return;
    }

    if (!links.length) {
        interaction.reply(":x: Votre compte Discord n'est pas lié à votre intra 42 !");
        return;
    }

    await interaction.deferReply();

    const token = await intra.refreshOauthToken(links[0]!.refresh_token);
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

    const genMessage = async (cursusId: number | null = null) => {
        const user = await intra.getMe(token);
        const description = [
            `**Cursus :** ${user.cursus_users.map((c: any) => c.cursus.name).join(", ")}`,
            `**Points d'évaluation :** ${user.correction_point}`,
            `**Argent :** ${user.wallet}₳`,
            `**Succès :** ${user.achievements.length}`,
            `**Piscine :** ${months[user.pool_month]} ${user.pool_year}`,
            `**Campus :** ${user.campus.map((c: any) => c.name).join(", ")}`
        ];
        console.dir(user, { depth: null });
        if (user.location) description.push(`**Position :** ${user.location}`);
        if (cursusId) {
            const cursus = user.cursus_users.find((c: any) => c.cursus.id === cursusId);
            const projects = user.projects_users.filter((p: any) => p.cursus_ids.includes(cursusId));
            const currentProjects = projects.filter((p: any) => !p.marked);
            description.push("", `__**Cursus :**__ ${cursus.cursus.name}`, `**Niveau :** ${cursus.level.toFixed(2)}`);
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
            // TODO Coalition
        }
        return {
            embeds: [
                new EmbedBuilder()
                    .setTitle(`${user.displayname} (@${user.login})`)
                    .setThumbnail(user.image.link)
                    .setDescription(description.join("\n"))
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
            await i.reply({ content: ":x: Ce n'est pas votre profil !", ephemeral: true });
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
