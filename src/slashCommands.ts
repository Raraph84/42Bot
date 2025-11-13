import { ApplicationCommandType, Client } from "discord.js";
import { Pool } from "mysql2/promise";

export const run = async (bot: Client, database: Pool): Promise<void> => {
    await bot.application!.commands.set([
        {
            name: "ping",
            description: "Répond avec Pong !",
            type: ApplicationCommandType.ChatInput
        },
        {
            name: "link",
            description: "Relie votre compte Discord à votre compte 42.",
            type: ApplicationCommandType.ChatInput
        },
        {
            name: "unlink",
            description: "Délie votre compte Discord de votre compte 42.",
            type: ApplicationCommandType.ChatInput
        }
    ]);

    bot.on("interactionCreate", (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === "ping") interaction.reply("Pong !");
        else if (interaction.commandName === "link")
            import("./commands/link.js").then((module) => module.command(interaction, database));
        else if (interaction.commandName === "unlink")
            import("./commands/unlink.js").then((module) => module.command(interaction, database));
    });
};
