import { CONFIG } from "./config";

interface RobinAuthResponse {
    data: {
        access_token: string;
        account_id: string;
    };
}

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

export async function loginRobin(email: string, password: string, organizationId: string) {
    const response = await fetch('https://api.robinpowered.com/v1.0/auth/users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${Buffer.from(`${email}:${password}`).toString('base64')}`
        },
        body: JSON.stringify({
            organization: organizationId,
            remember_me: false
        })
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Robin Login failed: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const result = (await response.json()) as RobinAuthResponse;
    return {
        accessToken: result.data.access_token,
        userId: result.data.account_id
    };
}

export async function getTodaysReservations(organizationId: string, accessToken: string, userId: string, date: Date): Promise<RobinGraphQLResponse> {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(date.setHours(23, 59, 59, 999)).toISOString();

    const query = [
        {
            operationName: "DeskReservations",
            variables: {
                userId: userId,
                start: startOfDay,
                end: endOfDay
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
            'tenant-id': organizationId,
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

export async function runRobin() {
    try {
        const email = CONFIG.ROBIN_EMAIL;
        const password = CONFIG.ROBIN_PASSWORD;
        const organizationId = CONFIG.ROBIN_ORGANIZATION_ID;
        console.log('Logging in to Robin...');
        const { accessToken, userId } = await loginRobin(email, password, organizationId);
        console.log(`Success! Logged in as User ID: ${userId}`);

        console.log('Fetching today\'s reservations...');
        const date = new Date();
        date.setDate(date.getDate() + 3)

        const reservations = await getTodaysReservations(organizationId, accessToken, "3545098", date);
        console.log('Reservations:', JSON.stringify(reservations, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}


runRobin();