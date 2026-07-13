export const lockSession = async (login: string): Promise<void> => {
    const res = await fetch(`https://api.raraph.fr/fortytwo/sessions/${login}/lock`, {
        method: "POST",
        headers: { Authorization: process.env.RARAPH_API_KEY! }
    });
    if (!res.ok) throw new Error(`Error locking session: ${res.status} ${await res.text()}`);
};

export const getUserCoalition = async (login: string, cursus: string): Promise<any> => {
    const res = await fetch(`https://api.raraph.fr/fortytwo/users/${login}/cursuses/${cursus}/coalitions`, {
        headers: { Authorization: process.env.RARAPH_API_KEY! }
    });
    if (!res.ok) throw new Error(`Error fetching user coalition: ${res.status} ${await res.text()}`);
    return res.json();
};

export const getUserLocationsStats = async (login: string): Promise<any> => {
    const res = await fetch(`https://api.raraph.fr/fortytwo/users/${login}/locations/stats`, {
        headers: { Authorization: process.env.RARAPH_API_KEY! }
    });
    if (!res.ok) throw new Error(`Error fetching user locations stats: ${res.status} ${await res.text()}`);
    return res.json();
};
