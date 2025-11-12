export const getOauthUrl = (redirectUri: string): string => {
    const params = new URLSearchParams();
    params.set("client_id", process.env.INTRA_APP_UID!);
    params.set("redirect_uri", redirectUri);
    params.set("response_type", "code");
    return "https://api.intra.42.fr/oauth/authorize?" + params.toString();
};

const getOauthAppToken = async (): Promise<any> => {
    const params = new URLSearchParams();
    params.set("grant_type", "client_credentials");
    params.set("client_id", process.env.INTRA_APP_UID!);
    params.set("client_secret", process.env.INTRA_APP_SECRET!);

    const res = await fetch("https://api.intra.42.fr/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });
    if (!res.ok) throw new Error("42 API error: " + res.status + " " + (await res.text()));
    return await res.json();
};

export const getOauthToken = async (code: string, redirectUri: string): Promise<string> => {
    const params = new URLSearchParams();
    params.set("grant_type", "authorization_code");
    params.set("client_id", process.env.INTRA_APP_UID!);
    params.set("client_secret", process.env.INTRA_APP_SECRET!);
    params.set("code", code);
    params.set("redirect_uri", redirectUri);

    const res = await fetch("https://api.intra.42.fr/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });
    if (!res.ok) throw new Error("42 API error: " + res.status + " " + (await res.text()));
    return await res.json();
};

export const getMe = async (token: any): Promise<any> => {
    const res = await fetch("https://api.intra.42.fr/v2/me", {
        headers: { Authorization: token.token_type + " " + token.access_token }
    });
    if (!res.ok) throw new Error("42 API error: " + res.status + " " + (await res.text()));
    return await res.json();
};

export const getUser = async (token: any, user: string): Promise<any> => {
    const res = await fetch("https://api.intra.42.fr/v2/users/" + user, {
        headers: { Authorization: token.token_type + " " + token.access_token }
    });
    if (!res.ok) throw new Error("42 API error: " + res.status + " " + (await res.text()));
    return await res.json();
};

const getCursusUsers = async (token: string, cursusId: number, page: number): Promise<any> => {
    const params = new URLSearchParams();
    params.set("sort", "-begin_at");
    params.set("filter[campus_id]", cursusId.toString());
    params.set("page[size]", (100).toString());
    params.set("page[number]", page.toString());

    const res = await fetch("https://api.intra.42.fr/v2/cursus/42cursus/cursus_users?" + params.toString(), {
        headers: { Authorization: token }
    });
    if (!res.ok) throw new Error("42 API error: " + res.status + " " + (await res.text()));
    return await res.json();
};
