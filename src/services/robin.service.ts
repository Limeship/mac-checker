import { CONFIG } from "../config";

export interface RobinReservation {
    id: string;
    type: string;
    startTime: string;
    endTime: string;
}

export interface RobinDeskReservationsData {
    getDeskReservationsByUserId: {
        userId: string;
        reservations: RobinReservation[];
        __typename: string;
    };
}

export interface RobinGraphQLResponse {
    data: RobinDeskReservationsData;
}

export class RobinService {
    async login() {
        const response = await fetch('https://api.robinpowered.com/v1.0/auth/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(`${CONFIG.ROBIN_EMAIL}:${CONFIG.ROBIN_PASSWORD}`).toString('base64')}`
            },
            body: JSON.stringify({
                organization: CONFIG.ROBIN_ORGANIZATION_ID,
                remember_me: false
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Robin Login failed: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        const result = await response.json() as any;
        return {
            accessToken: result.data.access_token,
            userId: result.data.account_id
        };
    }

    async getTodaysReservations(accessToken: string, userId: string, date: Date): Promise<RobinGraphQLResponse> {
        const startOfDay = new Date(date).setHours(0, 0, 0, 0);
        const endOfDay = new Date(date).setHours(23, 59, 59, 999);

        const query = [
            {
                operationName: "DeskReservations",
                variables: {
                    userId: userId,
                    start: new Date(startOfDay).toISOString(),
                    end: new Date(endOfDay).toISOString()
                },
                extensions: {
                    persistedQuery: {
                        version: 1,
                        sha256Hash: "b16bfb17a9a68c55d18d8e890d2a1ac640c6a410f23db31ef5ae11bc25d1cdf7"
                    }
                }
            }
        ];

        const response = await fetch('https://federation-gateway.robinpowered.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'tenant-id': CONFIG.ROBIN_ORGANIZATION_ID,
                'Authorization': `Access-Token ${accessToken}`
            },
            body: JSON.stringify(query)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Robin GraphQL request failed: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        return await response.json() as RobinGraphQLResponse;
    }
}

export const robinService = new RobinService();
