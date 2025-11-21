import { ApplicationCommandOptionType, ApplicationCommandType, Client } from "discord.js";
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
            description: "Relie votre compte Discord à votre intra 42.",
            type: ApplicationCommandType.ChatInput
        },
        {
            name: "unlink",
            description: "Délie votre compte Discord de votre intra 42.",
            type: ApplicationCommandType.ChatInput
        },
        {
            name: "profile",
            description: "Affiche votre profil intra 42.",
            type: ApplicationCommandType.ChatInput,
            options: [
                {
                    name: "login",
                    description: "Le login intra 42 de l'utilisateur.",
                    type: ApplicationCommandOptionType.String,
                    required: false
                }
            ]
        },
        {
            name: "logtime",
            description: "Affiche le temps de connexion sur votre intra 42.",
            type: ApplicationCommandType.ChatInput,
            options: [
                {
                    name: "login",
                    description: "Le login intra 42 de l'utilisateur.",
                    type: ApplicationCommandOptionType.String,
                    required: false
                }
            ]
        },
        {
            name: "config",
            description: "Modifie la configuration du serveur.",
            type: ApplicationCommandType.ChatInput,
            options: [
                {
                    name: "show",
                    description: "Affiche la configuration actuelle du serveur.",
                    type: ApplicationCommandOptionType.Subcommand
                },
                {
                    name: "rolerules",
                    description: "Configure les rôles attribué aux utilisateurs liés à 42.",
                    type: ApplicationCommandOptionType.SubcommandGroup,
                    options: [
                        {
                            name: "add",
                            description: "Ajoute une règle de rôle.",
                            type: ApplicationCommandOptionType.Subcommand,
                            options: [
                                {
                                    name: "role",
                                    description: "Le rôle à attribuer.",
                                    type: ApplicationCommandOptionType.Role,
                                    required: true
                                },
                                {
                                    name: "poolyear",
                                    description: "L'année de piscine des utilisateurs concernés.",
                                    type: ApplicationCommandOptionType.Number
                                },
                                {
                                    name: "poolmonth",
                                    description: "Le mois de piscine des utilisateurs concernés.",
                                    type: ApplicationCommandOptionType.Number,
                                    choices: [
                                        { name: "Janvier", value: 1 },
                                        { name: "Février", value: 2 },
                                        { name: "Mars", value: 3 },
                                        { name: "Avril", value: 4 },
                                        { name: "Mai", value: 5 },
                                        { name: "Juin", value: 6 },
                                        { name: "Juillet", value: 7 },
                                        { name: "Août", value: 8 },
                                        { name: "Septembre", value: 9 },
                                        { name: "Octobre", value: 10 },
                                        { name: "Novembre", value: 11 },
                                        { name: "Décembre", value: 12 }
                                    ]
                                },
                                {
                                    name: "campus",
                                    description: "Le campus des utilisateurs concernés.",
                                    type: ApplicationCommandOptionType.Number,
                                    autocomplete: true
                                },
                                {
                                    name: "cursus",
                                    description: "Le cursus des utilisateurs concernés.",
                                    type: ApplicationCommandOptionType.Number,
                                    autocomplete: true
                                }
                            ]
                        },
                        {
                            name: "remove",
                            description: "Supprime une règle de rôle.",
                            type: ApplicationCommandOptionType.Subcommand,
                            options: [
                                {
                                    name: "rule",
                                    description: "La règle à supprimer.",
                                    type: ApplicationCommandOptionType.Number,
                                    required: true,
                                    autocomplete: true
                                }
                            ]
                        }
                    ]
                }
            ],
            dmPermission: false,
            defaultMemberPermissions: "Administrator"
        }
    ]);

    bot.on("interactionCreate", (interaction) => {
        if (!interaction.isChatInputCommand()) return;

        if (interaction.commandName === "ping") interaction.reply("Pong !");
        else if (interaction.commandName === "link")
            import("./commands/link.js").then((module) => module.command(interaction, database));
        else if (interaction.commandName === "unlink")
            import("./commands/unlink.js").then((module) => module.command(interaction, database));
        else if (interaction.commandName === "profile")
            import("./commands/profile.js").then((module) => module.command(interaction, database));
        else if (interaction.commandName === "logtime")
            import("./commands/logtime.js").then((module) => module.command(interaction, database));
        else if (interaction.commandName === "config")
            import("./config.js").then((module) => module.command(interaction, database));
    });

    bot.on("interactionCreate", (interaction) => {
        if (!interaction.isAutocomplete()) return;

        if (interaction.commandName === "config")
            import("./config.js").then((module) => module.autocomplete(interaction, database));
    });
};
