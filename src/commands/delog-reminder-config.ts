import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Pool } from "mysql2/promise";
import { getUserLink } from "../utils.js";

export const command = async (interaction: ChatInputCommandInteraction, database: Pool) => {
    const link = await getUserLink(database, interaction.user.id);
    if (!link) {
        interaction.reply({
            content: ":x: Votre compte Discord n'est pas lié à votre intra 42, utilisez /link !",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    const updates: any = {};

    const phoneNumber = interaction.options.getString("phonenumber");
    if (phoneNumber !== null) {
        const clean = phoneNumber.replace(/\s+/g, "").toLowerCase();
        if (clean === "disabled") {
            updates.phone_number = null;
        } else {
            if (clean.length !== 10) {
                interaction.reply({
                    content: ":x: Le numéro de téléphone doit comporter exactement 10 caractères !",
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            if (!/^\d+$/.test(clean)) {
                interaction.reply({
                    content: ":x: Le numéro de téléphone ne doit contenir que des chiffres !",
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            if (!clean.startsWith("06") && !clean.startsWith("07")) {
                interaction.reply({
                    content: ":x: Le numéro de téléphone doit commencer par 06 ou 07 !",
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            updates.phone_number = "+33" + clean.slice(1);
        }
    }

    const webhook = interaction.options.getString("discordwebhook");
    if (webhook !== null) {
        const clean = webhook.replace(/\s+/g, "");
        if (clean.toLowerCase() === "disabled") {
            updates.discord_webhook = null;
        } else {
            if (!clean.startsWith("https://discord.com/api/webhooks/")) {
                interaction.reply({
                    content: ":x: Le webhook Discord doit être valide !",
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            updates.discord_webhook = clean;
        }
    }

    const sendDm = interaction.options.getBoolean("senddm");
    if (sendDm !== null) updates.send_dm = sendDm;

    const sendLock = interaction.options.getBoolean("sendlock");
    if (sendLock !== null) updates.send_lock = sendLock;

    const alertMinutes = interaction.options.getString("alertminutes");
    if (alertMinutes !== null) {
        const clean = alertMinutes.replace(/\s+/g, "").split(",");
        if (clean.some((minute) => !/^\d+$/.test(minute))) {
            interaction.reply({
                content: ":x: Les minutes doivent être des nombres valides !",
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        if (clean.some((minute) => parseInt(minute) < 1 || parseInt(minute) > 120)) {
            interaction.reply({
                content: ":x: Les minutes doivent être comprises entre 1 et 120 !",
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        if (clean.some((minute, index) => clean.indexOf(minute) !== index)) {
            interaction.reply({
                content: ":x: Les minutes ne peuvent pas être en double !",
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        updates.alert_minutes = clean.join(",");
    }

    if (!Object.keys(updates).length) {
        interaction.reply({ content: ":x: Il n'y a rien à modifier !", flags: MessageFlags.Ephemeral });
        return;
    }

    let sql = "INSERT INTO delog_reminder_config";
    sql += " (login, discord_user_id, phone_number, discord_webhook, send_dm, send_lock, alert_minutes)";
    sql += " VALUES (?, ?, ?, ?, ?, ?, ?)";
    sql += " ON DUPLICATE KEY UPDATE discord_user_id=?";
    sql += Object.keys(updates)
        .map((key) => ", " + key + "=?")
        .join("");

    try {
        await database.execute(sql, [
            link.login,
            interaction.user.id,
            updates.phone_number ?? null,
            updates.discord_webhook ?? null,
            updates.send_dm ?? 0,
            updates.send_lock ?? 1,
            updates.alert_minutes ?? "16,17,18,19,20,37,38,39,40,41",
            interaction.user.id,
            ...Object.values(updates)
        ]);
    } catch (error) {
        console.error("Database error", error);
        interaction.reply({
            content: ":x: Un problème est survenu.",
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    interaction.reply({
        content:
            ":white_check_mark: Vos paramètres de rappels de reconnexion ont été mis à jour et seront effectifs à votre prochaine reconnexion.",
        flags: MessageFlags.Ephemeral
    });
};
