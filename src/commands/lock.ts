import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Pool } from "mysql2/promise";
import { getUserLink } from "../utils.js";

export const command = async (interaction: ChatInputCommandInteraction, database: Pool) => {
    const link = await getUserLink(database, interaction.user.id);
    if (!link) {
        interaction.reply(":x: Votre compte Discord n'est pas lié à votre intra 42, utilisez /link !");
        return;
    }

    try {
        const res = await fetch(`https://api.raraph.fr/fortytwo/sessions/${link.login}/lock`, {
            method: "POST",
            headers: { Authorization: process.env.FORTYTWO_SESSIONS_KEY! }
        });
        if (!res.ok) throw new Error(`Error locking session: ${res.status} ${await res.text()}`);
    } catch (error: any) {
        if (error?.message.includes("No session matching this login"))
            interaction.reply(":x: Vous n'êtes pas connecté en cluster !");
        else {
            console.error(error);
            interaction.reply(":x: Un problème est survenu.");
        }
        return;
    }

    interaction.reply(":white_check_mark: Votre session a bien été verrouillée !");
};
