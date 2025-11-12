import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Request, Response } from "express";
import { Pool, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { randomString } from "./utils.js";
import * as intra from "./42api.js";

const CALLBACK_URL = "https://api.raraph.fr/42bot/callback?nonce=";

const links: { userId: string; nonce: string }[] = [];

export const command = (interaction: ChatInputCommandInteraction) => {
    const oldIndex = links.findIndex((link) => link.userId === interaction.user.id);
    if (oldIndex !== -1) links.splice(oldIndex, 1);

    const nonce = randomString(16);
    links.push({ userId: interaction.user.id, nonce });

    const url = intra.getOauthUrl(CALLBACK_URL + nonce);
    interaction.reply({
        content: "Veuillez visiter le lien suivant pour lier votre compte :\n" + url,
        flags: MessageFlags.Ephemeral
    });
};

export const request = async (req: Request, res: Response, database: Pool) => {
    const code = req.query.code as string;
    const nonce = req.query.nonce as string;
    if (!code || !nonce) {
        res.status(400).send("Missing code or nonce.");
        return;
    }

    const link = links.find((link) => link.nonce === nonce)!;
    if (!link) {
        res.status(400).send("Invalid nonce.");
        return;
    }

    links.splice(links.indexOf(link), 1);

    let token: any;
    let user: any;
    try {
        token = await intra.getOauthToken(code, CALLBACK_URL + nonce);
        user = await intra.getMe(token);
    } catch (error) {
        res.status(500).send("Un problème est survenu.");
        return;
    }

    let oldLinks;
    try {
        [oldLinks] = await database.query<RowDataPacket[]>("SELECT * FROM linked_users WHERE discord_user_id=?", [
            link.userId
        ]);
    } catch (error) {
        console.error("Failed to query database for existing links:", error);
        res.status(500).send("Un problème est survenu.");
        return;
    }
    if (oldLinks.length) {
        res.send("Votre compte Discord est déjà lié à un compte 42 !");
        return;
    }

    try {
        await database.execute(
            "INSERT INTO linked_users (login, discord_user_id, refresh_token, linked_at) VALUES (?, ?, ?, ?)",
            [user.login, link.userId, token.refresh_token, Date.now()]
        );
    } catch (error) {
        console.error("Failed to insert link into database:", error);
        res.status(500).send("Un problème est survenu.");
        return;
    }

    res.send("Votre compte Discord a bien été lié à votre compte 42, " + user.login + " !");
};
