import { Pool, RowDataPacket } from "mysql2/promise";

export const randomString = (length: number): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
};

export const months: { [key: string]: string } = {
    january: "Janvier",
    february: "Février",
    march: "Mars",
    april: "Avril",
    may: "Mai",
    june: "Juin",
    july: "Juillet",
    august: "Août",
    september: "Septembre",
    october: "Octobre",
    november: "Novembre",
    december: "Décembre"
};

export const getUserLink = async (database: Pool, discordUserId: string): Promise<any> => {
    let links;
    try {
        [links] = await database.query<RowDataPacket[]>("SELECT * FROM linked_users WHERE discord_user_id=?", [
            discordUserId
        ]);
    } catch (error) {
        console.error("Database error", error);
        throw error;
    }
    return links[0];
};
