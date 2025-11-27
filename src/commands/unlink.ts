import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Pool } from "mysql2/promise";
import { getUserLink } from "../utils";
import * as link from "./link";

export const command = async (interaction: ChatInputCommandInteraction, database: Pool) => {
    const link = await getUserLink(database, interaction.user.id);
    if (!link) {
        interaction.reply({
            content: ":x: Votre compte Discord n'est pas lié à votre intra 42, utilisez /link !",
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

    for (const guild of interaction.client.guilds.cache.values()) {
        const member = await guild.members.fetch(interaction.user.id).catch(() => null);
        if (member) await link.syncMemberRoles(member, database);
    }
};
