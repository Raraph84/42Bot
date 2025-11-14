type PrePreLogin = { url: URL; cookies: string[] };
type PreLogin = { url: string; cookies: string[] };
type Login = { url: URL; cookies: string[] };
type PostLogin = { cookies: string[] };

const getPrePreLogin = async (): Promise<PrePreLogin> => {
    const res = await fetch("https://profile.intra.42.fr/users/auth/keycloak_student", {
        redirect: "manual"
    });
    if (res.status !== 302) throw new Error("Error pre-pre-logging in " + res.status);

    const url = new URL(res.headers.get("location")!);
    const cookies = res.headers.getSetCookie().map((entry) => entry.split(";")[0]!);
    return { url, cookies };
};

const getPreLogin = async (prePreLogin: PrePreLogin): Promise<PreLogin> => {
    const res = await fetch(prePreLogin.url, {
        redirect: "manual"
    });
    if (res.status !== 200) throw new Error("Error pre-logging in " + res.status);

    const data = await res.text();
    const url = data
        .split("\n")
        .find((line) => line.trim().startsWith('<form id="kc-form-login"'))!
        .split('action="')
        .pop()!
        .split('" method=')
        .shift()!
        .replaceAll("&amp;", "&");
    const cookies = res.headers.getSetCookie().map((entry) => entry.split(";")[0]!);
    return { url, cookies };
};

const getLogin = async (preLogin: PreLogin): Promise<Login> => {
    const body = new URLSearchParams();
    body.set("username", process.env.INTRA_USERNAME!);
    body.set("password", Buffer.from(process.env.INTRA_PASSWORD!, "base64").toString());

    const res = await fetch(preLogin.url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: preLogin.cookies.join("; ")
        },
        body: body.toString(),
        redirect: "manual"
    });
    if (res.status !== 302) throw new Error("Error logging in " + res.status + " " + (await res.text()));

    const url = new URL(res.headers.get("location")!);
    const cookies = res.headers.getSetCookie().map((entry) => entry.split(";")[0]!);
    return { url, cookies };
};

const getPostLogin = async (prePreLogin: PrePreLogin, login: Login): Promise<PostLogin> => {
    const res = await fetch(login.url, {
        headers: { Cookie: prePreLogin.cookies.join("; ") },
        redirect: "manual"
    });
    if (res.status !== 302) throw new Error("Error post-logging in " + res.status);

    const cookies = res.headers.getSetCookie().map((entry) => entry.split(";")[0]!);
    return { cookies };
};

let login: Login | null = null;
let cookies: string | null = null;

const getCookies = async (): Promise<string> => {
    if (cookies) return cookies;

    const prePreLogin = await getPrePreLogin();
    const preLogin = await getPreLogin(prePreLogin);
    login = await getLogin(preLogin);
    const postLogin = await getPostLogin(prePreLogin, login);
    cookies = postLogin.cookies.join("; ");
    return cookies;
};

const cookiesRequest = async (url: string): Promise<Response> => {
    const cookies = await getCookies();
    const res = await fetch(url, {
        headers: { Cookie: cookies }
    });
    if (res.status !== 200) throw new Error(`Error getting ${url}: ${res.status} ${await res.text()}`);
    return res;
};

const jsonCookiesRequest = (url: string): Promise<any> => cookiesRequest(url).then((res) => res.json());

export const getUserCoalition = (user: string, cursus: string) =>
    jsonCookiesRequest("https://profile.intra.42.fr/users/" + user + "/coalitions?cursus=" + cursus);
