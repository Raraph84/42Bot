import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Pool } from "mysql2/promise";
import { getUserLink, months } from "../utils.js";
import * as intra from "../42api.js";
import * as intraScraper from "../42scraper.js";

export const command = async (interaction: ChatInputCommandInteraction, database: Pool) => {
    const link = await getUserLink(database, interaction.user.id);
    if (!link) {
        interaction.reply(":x: Votre compte Discord n'est pas lié à votre intra 42, utilisez /link !");
        return;
    }

    await interaction.deferReply();

    let user;
    try {
        user = await intra.getUser(interaction.options.getString("login") ?? link.login, { link, database });
    } catch (error) {
        if (error instanceof Error && error.message.includes("404"))
            interaction.editReply(":x: Utilisateur intra 42 introuvable.");
        else interaction.editReply(":x: Un problème est survenu.");
        return;
    }

    let logtime;
    try {
        logtime = await intraScraper.getUserLocationsStats(user.login);
    } catch (error) {
        interaction.editReply(":x: Un problème est survenu.");
        return;
    }

    const toSeconds = (time: string): number =>
        parseInt(time.slice(0, 2)) * 60 * 60 + parseInt(time.slice(3, 5)) * 60 + parseInt(time.slice(6, 8));
    const toHuman = (seconds: number): string => {
        const hours = Math.floor(seconds / 60 / 60);
        const minutes = Math.round((seconds % (60 * 60)) / 60);
        return `${hours}h${minutes.toString().padStart(2, "0")}m`;
    };
    const getLogtime = (start: number, end: number): number => {
        let total = 0;
        for (const day in logtime) {
            const timestamp = new Date(day).getTime();
            if (timestamp >= start && timestamp < end) total += toSeconds(logtime[day]!);
        }
        return total;
    };

    const now = new Date();
    const getMonthLogtime = (month: number): string => {
        const start = new Date(now.getFullYear(), now.getMonth() - month, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - month + 1, 1);
        return toHuman(getLogtime(start.getTime(), end.getTime()));
    };
    const getWeekLogtime = (week: number): string => {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1 - week * 7);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1 - week * 7 + 7);
        return toHuman(getLogtime(start.getTime(), end.getTime()));
    };

    interaction.editReply({
        embeds: [
            new EmbedBuilder()
                .setTitle(`Temps de connexion de ${user.login}`)
                .setColor(0xffffff)
                .setDescription(
                    [
                        `:white_check_mark: **${Object.values(months)[(now.getMonth() - 2 + 12) % 12]} :** ${getMonthLogtime(2)}`,
                        `:white_check_mark: **${Object.values(months)[(now.getMonth() - 1 + 12) % 12]} :** ${getMonthLogtime(1)}`,
                        `:hourglass_flowing_sand: **${Object.values(months)[now.getMonth()]} :** ${getMonthLogtime(0)}`,
                        "",
                        `:white_check_mark: **Semaine W-2 :** ${getWeekLogtime(2)}`,
                        `:white_check_mark: **Semaine W-1 :** ${getWeekLogtime(1)}`,
                        `:hourglass_flowing_sand: **Semaine en cours :** ${getWeekLogtime(0)}`
                    ].join("\n")
                )
        ]
    });
};
