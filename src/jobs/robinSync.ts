import { Surreal } from "surrealdb";
import { robinService } from "../services/robin.service";
import { COLLECTIONS } from "../constants";
import { DbUser } from "../types/db";
import { logger } from "../utils/logger";

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

            for (const res of reservations) {
                await db.query(`CREATE ${COLLECTIONS.ROBIN_LOGS} CONTENT $data`, {
                    data: {
                        user: user.id,
                        start: new Date(res.startTime),
                        end: new Date(res.endTime)
                    }
                });
            }
            logger.info(`Logged ${reservations.length} Robin sessions for ${user.name}`);
        }
        logger.info("✅ Robin reservations sync complete.");
    } catch (err: any) {
        logger.error("❌ Robin sync error:", err);
    }
}
