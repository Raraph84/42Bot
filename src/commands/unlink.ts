import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Pool, RowDataPacket } from "mysql2/promise";

export const command = async (interaction: ChatInputCommandInteraction, database: Pool) => {
    let links;
    try {
        [links] = await database.query<RowDataPacket[]>("SELECT * FROM linked_users WHERE discord_user_id=?", [
            interaction.user.id
        ]);
    } catch (error) {
        console.error("Database error", error);
        interaction.reply({
            content: ":x: Un problème est survenu.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    if (!links.length) {
        interaction.reply({
            content: ":x: Votre compte Discord n'est pas lié à votre intra 42 !",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    try {
        await database.execute("DELETE FROM linked_users WHERE discord_user_id=?", [interaction.user.id]);
    } catch (error) {
        console.error("Database error", error);
        interaction.reply({
            content: ":x: Un problème est survenu.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    interaction.reply({
        content: "Votre compte Discord a bien été délié de votre intra 42 !",
        flags: MessageFlags.Ephemeral
    });
};
