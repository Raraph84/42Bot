import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { Pool, RowDataPacket } from "mysql2/promise";
import * as intraScraper from "../42scraper.js";
import { months } from "../utils.js";

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

    const logtime = await intraScraper.getUserLocationsStats(links[0]!.login);

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
                .setTitle(`Temps de connexion de ${links[0]!.login}`)
                .setColor(0x0099ff)
                .setDescription(
                    [
                        `:white_check_mark: **${Object.values(months)[now.getMonth() - 2]} :** ${getMonthLogtime(2)}`,
                        `:white_check_mark: **${Object.values(months)[now.getMonth() - 1]} :** ${getMonthLogtime(1)}`,
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
