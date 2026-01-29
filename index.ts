import discord from "discord.js";
import mysql2 from "mysql2/promise";
import express from "express";
import dotenv from "dotenv";
import * as link from "./src/commands/link.js";

dotenv.config({ quiet: true });

const database = mysql2.createPool({
    host: process.env.DATABASE_HOST!,
    user: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_NAME!
});
console.log("Connecting to the database...");
database
    .query("SELECT 1")
    .then(() => console.log("Connected to the database."))
    .catch((error) => console.error("Failed to connect to the database:", error));

const bot = new discord.Client({ intents: [discord.GatewayIntentBits.Guilds, discord.GatewayIntentBits.GuildMembers] });
console.log("Connecting to the bot...");
bot.login(process.env.BOT_TOKEN)
    .then(() => console.log("Connected to the bot."))
    .catch((error) => console.error("Failed to connect to the bot:", error));

bot.on("clientReady", async () => {
    await bot.user!.setPresence({
        activities: [{ name: "Regarde les echecs de Libft." }]
    });
    await (await import("./src/slashCommands.js")).run(bot, database);
    await (await import("./src/clusterLogging.js")).run(bot, database);
    console.log("The bot is ready.");
    console.log("I am in", bot.guilds.cache.size, "servers!");
});

bot.on("guildMemberAdd", (member) => link.syncMemberRoles(member, database));

const api = express();
api.get("/callback", (req, res) => link.request(req, res, database, bot));
api.listen(4000, () => console.log("HTTP server listening on port 4000."));
