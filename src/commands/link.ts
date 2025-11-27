import { ChatInputCommandInteraction, MessageFlags, Client, GuildMember } from "discord.js";
import { Request, Response } from "express";
import { Pool, RowDataPacket } from "mysql2/promise";
import { getUserLink, months, randomString } from "../utils.js";
import * as intra from "../42api.js";

const CALLBACK_URL = "https://api.raraph.fr/42bot/callback?nonce=";

const links: { userId: string; nonce: string }[] = [];

export const command = async (interaction: ChatInputCommandInteraction, database: Pool) => {
    const link = await getUserLink(database, interaction.user.id);
    if (link) {
        interaction.reply({
            content: ":x: Votre compte Discord est déjà lié à votre intra 42, utilisez /unlink !",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

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

export const request = async (req: Request, res: Response, database: Pool, bot: Client) => {
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
        user = await intra.getMe({ token: token.token_type + " " + token.access_token });
    } catch (error) {
        res.status(500).send("Un problème est survenu.");
        return;
    }

    try {
        await database.execute(
            "INSERT INTO linked_users (login, discord_user_id, refresh_token, linked_at) VALUES (?, ?, ?, ?)",
            [user.login, link.userId, token.refresh_token, Date.now()]
        );
    } catch (error) {
        console.error("Database error", error);
        res.status(500).send("Un problème est survenu.");
        return;
    }

    res.send("Votre compte Discord a bien été lié à votre intra 42 !");

    for (const guild of bot.guilds.cache.values()) {
        const member = await guild.members.fetch(link.userId).catch(() => null);
        if (member) await syncMemberRoles(member, database);
    }
};

export const syncMemberRoles = async (member: GuildMember, database: Pool): Promise<void> => {
    const link = await getUserLink(database, member.id);

    const [rules] = await database.query<RowDataPacket[]>("SELECT * FROM linked_roles WHERE guild_id=?", [
        member.guild.id
    ]);
    if (!rules.length) return;

    let userData: any = null;
    if (link) {
        try {
            userData = await intra.getMe({ link, database });
        } catch (error) {
            console.error(`Error fetching 42 data for user ${member.id}:`, error);
            return;
        }
    }

    for (const rule of rules) {
        const role = member.guild.roles.cache.get(rule.role_id);
        if (!role) continue;

        const self = await member.guild.members.fetchMe();
        if (role.position >= self.roles.highest.position) continue;

        let shouldHaveRole = false;
        if (userData) {
            shouldHaveRole = true;
            if (rule.pool_year && userData.pool_year !== rule.pool_year.toString()) shouldHaveRole = false;
            if (rule.pool_month && userData.pool_month !== Object.keys(months)[rule.pool_month - 1])
                shouldHaveRole = false;
            if (rule.campus_id && !userData.campus_users?.some((cu: any) => cu.campus_id === rule.campus_id))
                shouldHaveRole = false;
            if (rule.cursus_id && !userData.cursus_users?.some((cu: any) => cu.cursus_id === rule.cursus_id))
                shouldHaveRole = false;
        }

        if (shouldHaveRole && !member.roles.cache.has(role.id)) await member.roles.add(role).catch(() => {});
        else if (!shouldHaveRole && member.roles.cache.has(role.id)) await member.roles.remove(role).catch(() => {});
    }
};
