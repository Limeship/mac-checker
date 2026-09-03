import { Surreal } from "surrealdb";
import { robinService } from "../services/robin.service";
import { COLLECTIONS } from "../constants";
import { DbUser } from "../types/db";
import { schedulerLogger as logger } from "../utils/logger";

export async function syncRobinReservations(db: Surreal) {
    try {
        logger.info("🚀 Starting Robin reservations sync...");
        const { accessToken } = await robinService.login();

        // Get all users with a robinId
        const users = await db.query<[DbUser[]]>(
            `SELECT id, name, robinId FROM ${COLLECTIONS.USERS} WHERE robinId != NONE`
        );

        for (const user of users[0]) {
            logger.info(`Checking reservations for user: ${user.name} (${user.robinId})`);
            const response = await robinService.getTodaysReservations(accessToken, user.robinId!, new Date());

            const reservations = response.data.getDeskReservationsByUserId.reservations;
            if (reservations.length === 0) {
                logger.info(`No reservations for ${user.name}`);
                continue;
            }

            let inserted = 0;
            for (const res of reservations) {
                const start = new Date(res.startTime);
                const end = new Date(res.endTime);
                const existing = await db.query<[any[]]>(
                    `SELECT id FROM ${COLLECTIONS.ROBIN_LOGS} WHERE user = $user AND start = <datetime>$start LIMIT 1`,
                    { user: user.id, start: start.toISOString() }
                );
                if ((existing[0] ?? []).length > 0) continue;
                await db.query(`CREATE ${COLLECTIONS.ROBIN_LOGS} CONTENT $data`, {
                    data: { user: user.id, start, end }
                });
                inserted++;
            }
            logger.info(`Logged ${inserted}/${reservations.length} new Robin sessions for ${user.name}`);
        }
        logger.info("✅ Robin reservations sync complete.");
    } catch (err: any) {
        logger.error("❌ Robin sync error:", err);
    }
}
