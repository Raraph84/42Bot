const API_HOST = "https://api.raraph.fr";

export const lockSession = async (login: string): Promise<void> => {
    const res = await fetch(`${API_HOST}/fortytwo/sessions/${login}/lock`, {
        method: "POST",
        headers: { Authorization: process.env.RARAPH_API_KEY! }
    });
    if (!res.ok) throw new Error(`Error locking session: ${res.status} ${await res.text()}`);
};

export const getUserCoalition = async (login: string, cursus: string): Promise<any> => {
    const res = await fetch(`${API_HOST}/fortytwo/users/${login}/cursuses/${cursus}/coalitions`, {
        headers: { Authorization: process.env.RARAPH_API_KEY! }
    });
    if (!res.ok) throw new Error(`Error fetching user coalition: ${res.status} ${await res.text()}`);
    return res.json();
};

export const getUserLocationsStats = async (login: string): Promise<any> => {
    const res = await fetch(`${API_HOST}/fortytwo/users/${login}/locations/stats`, {
        headers: { Authorization: process.env.RARAPH_API_KEY! }
    });
    if (!res.ok) throw new Error(`Error fetching user locations stats: ${res.status} ${await res.text()}`);
    return res.json();
};

export const getApplicationCredentials = async (): Promise<any> => {
    const res = await fetch(`${API_HOST}/fortytwo/applications/${process.env.INTRA_APPLICATION_ID}/credentials`, {
        headers: { Authorization: process.env.INTRA_APPLICATION_CREDENTIALS_TOKEN! }
    });
    if (!res.ok) throw new Error(`Error fetching application credentials: ${res.status} ${await res.text()}`);
    return res.json();
};
