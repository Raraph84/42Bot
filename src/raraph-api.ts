export const lockSession = async (login: string): Promise<void> => {
    const res = await fetch(`https://api.raraph.fr/fortytwo/sessions/${login}/lock`, {
        method: "POST",
        headers: { Authorization: process.env.RARAPH_API_KEY! }
    });
    if (!res.ok) throw new Error(`Error locking session: ${res.status} ${await res.text()}`);
};
