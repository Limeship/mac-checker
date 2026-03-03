import { Surreal } from "surrealdb";
import { robinService } from "../services/robin.service";
import { COLLECTIONS } from "../constants";
import { DbUser } from "../types/db";

export async function syncRobinReservations(db: Surreal) {
    try {
        console.log('🚀 Starting Robin reservations sync...');
        const { accessToken } = await robinService.login();

        // Get all users with a robinId
        const users = await db.query<[DbUser[]]>(
            `SELECT id, name, robinId FROM ${COLLECTIONS.USERS} WHERE robinId != NONE`
        );

        for (const user of users[0]) {
            console.log(`Checking reservations for user: ${user.name} (${user.robinId})`);
            const response = await robinService.getTodaysReservations(accessToken, user.robinId!, new Date());

            const reservations = response.data.getDeskReservationsByUserId.reservations;
            if (reservations.length === 0) {
                console.log(`No reservations for ${user.name}`);
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
            console.log(`Logged ${reservations.length} Robin sessions for ${user.name}`);
        }
        console.log('✅ Robin reservations sync complete.');
    } catch (err: any) {
        console.error('❌ Robin sync error:', err.message);
    }
}
