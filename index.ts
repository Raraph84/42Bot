import discord from "discord.js";
import mysql2 from "mysql2/promise";
import dotenv from "dotenv";

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

const bot = new discord.Client({ intents: [] });
console.log("Connecting to the bot...");
bot.login(process.env.BOT_TOKEN)
    .then(() => console.log("Connected to the bot."))
    .catch((error) => console.error("Failed to connect to the bot:", error));

bot.on("clientReady", () => {
    console.log("The bot is ready.");
});
