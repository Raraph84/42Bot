import { Client } from "discord.js";
import { Pool, ResultSetHeader } from "mysql2/promise";
import { getAllLocations } from "./42api";

export const run = async (bot: Client, database: Pool): Promise<void> => {
    let running = false;
    setInterval(async () => {
        if (running) return;
        running = true;

        console.time("Cluster logging cycle");

        let oldActiveConnections;
        try {
            [oldActiveConnections] = await database.query<ResultSetHeader[]>(
                "SELECT * FROM cluster_logs WHERE end_time IS NULL"
            );
        } catch (error) {
            console.error("Database error", error);
            running = false;
            return;
        }

        let params = new URLSearchParams();
        params.set("filter[active]", "true");
        params.set("filter[campus_id]", "9");

        let activeConnections;
        try {
            activeConnections = await getAllLocations(params);
        } catch (error) {
            console.error("Error fetching active connections", error);
            running = false;
            return;
        }

        const newConnections = activeConnections.filter(
            (ac: any) => !oldActiveConnections.some((oac: any) => oac.log_id === ac.id)
        );

        for (const connection of newConnections) {
            try {
                await database.query(
                    "INSERT INTO cluster_logs (log_id, user_id, host, start_time) VALUES (?, ?, ?, ?)",
                    [connection.id, connection.user.id, connection.host, new Date(connection.begin_at).getTime()]
                );
            } catch (error) {
                console.error("Database error", error);
                running = false;
                continue;
            }
        }

        const oldEndedConnections = oldActiveConnections.filter(
            (oac: any) => !activeConnections.some((ac: any) => ac.id === oac.log_id)
        );

        params = new URLSearchParams();
        params.set("filter[id]", oldEndedConnections.map((oac: any) => oac.log_id).join(","));

        let endedConnections = [];
        try {
            if (oldEndedConnections.length) endedConnections = await getAllLocations(params);
        } catch (error) {
            console.error("Error fetching ended connections", error);
            running = false;
            return;
        }

        for (const connection of endedConnections) {
            try {
                await database.query("UPDATE cluster_logs SET end_time=? WHERE log_id=?", [
                    new Date(connection.end_at).getTime(),
                    connection.id
                ]);
            } catch (error) {
                console.error("Database error", error);
                running = false;
                continue;
            }
        }

        console.timeEnd("Cluster logging cycle");

        running = false;
    }, 60 * 1000);
};
