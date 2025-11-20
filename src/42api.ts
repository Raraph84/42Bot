import { Pool } from "mysql2/promise";

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

export const getOauthToken = async (code: string, redirectUri: string): Promise<any> => {
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

const refreshOauthToken = async (refreshToken: string): Promise<any> => {
    const params = new URLSearchParams();
    params.set("grant_type", "refresh_token");
    params.set("client_id", process.env.INTRA_APP_UID!);
    params.set("client_secret", process.env.INTRA_APP_SECRET!);
    params.set("refresh_token", refreshToken);

    const res = await fetch("https://api.intra.42.fr/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });
    if (!res.ok) throw new Error("42 API error: " + res.status + " " + (await res.text()));
    return await res.json();
};

const tokenCache: { login: string | null; token: any }[] = [];

type AuthOptions = { link: any; database: Pool; force?: boolean } | { token: string } | { force?: boolean };

const getToken = async (auth: AuthOptions): Promise<string> => {
    if ("token" in auth) return auth.token;
    const login = "link" in auth ? auth.link.login : null;

    const cached = tokenCache.find((t) => t.login === login);
    if (cached && !auth.force) return cached.token.token_type + " " + cached.token.access_token;
    if (cached && auth.force) tokenCache.splice(tokenCache.indexOf(cached), 1);

    let token;
    if ("link" in auth) {
        try {
            token = await refreshOauthToken(auth.link.refresh_token);
        } catch (error) {
            console.error("Error refreshing token for " + auth.link.login, error);
            throw error;
        }
        try {
            await auth.database.query("UPDATE linked_users SET refresh_token=? WHERE discord_user_id=?", [
                token.refresh_token,
                auth.link.discord_user_id
            ]);
        } catch (error) {
            console.error("Database error", error);
            throw error;
        }
    } else {
        try {
            token = await getOauthAppToken();
        } catch (error) {
            console.error("Error getting app token", error);
            throw error;
        }
    }

    tokenCache.push({ login, token });
    return token.token_type + " " + token.access_token;
};

const request = async (path: string, auth: AuthOptions): Promise<any> => {
    const res = await fetch("https://api.intra.42.fr/v2" + path, {
        headers: { Authorization: await getToken(auth) }
    });
    if (res.status === 401 && !("token" in auth) && !auth.force) return request(path, { ...auth, force: true });
    if (!res.ok) throw new Error(`Error getting ${path}: ${res.status} ${await res.text()}`);
    return await res.json();
};

export const getMe = async (auth: AuthOptions): Promise<any> => request("/me", auth);

export const getUser = async (user: string, auth: AuthOptions): Promise<any> => request("/users/" + user, auth);
