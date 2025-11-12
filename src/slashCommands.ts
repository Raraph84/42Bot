import { ApplicationCommandType, Client } from "discord.js";

export const run = async (bot: Client): Promise<void> => {
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
        }
    ]);

    bot.on("interactionCreate", (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === "ping") interaction.reply("Pong !");
        else if (interaction.commandName === "link") import("./link.js").then((module) => module.command(interaction));
    });
};
