import { ApplicationCommandType, Client } from "discord.js";

export const run = async (bot: Client): Promise<void> => {
    await bot.application!.commands.set([
        {
            name: "ping",
            description: "Replies with Pong!",
            type: ApplicationCommandType.ChatInput
        }
    ]);

    bot.on("interactionCreate", (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === "ping") {
            interaction.reply("Pong!");
        }
    });
};
