type AuthSettings = {
  projectId?: string;
  apiKey?: string;
  allowLocalDevelopment?: boolean;
};

type AiIdentity =
  | { ok: true; userId: string }
  | { ok: false; status: 401 | 403 | 503; message: string };

function invalidSession(): AiIdentity {
  return { ok: false, status: 401, message: "Connectez-vous à Agents pour utiliser un fournisseur IA." };
}

export async function resolveAiIdentity(
  request: Request,
  settings: AuthSettings,
  fetchAccount: typeof fetch = fetch,
): Promise<AiIdentity> {
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return { ok: false, status: 403, message: "Requête externe refusée." };
  }
  const authorization = request.headers.get("authorization");
  if (!authorization && settings.allowLocalDevelopment
    && ["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)) {
    return { ok: true, userId: "local-user" };
  }
  const token = authorization?.match(/^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/i)?.[1];
  if (!token || token.length > 8_192) return invalidSession();

  const { projectId, apiKey } = settings;
  if (!projectId || !apiKey) return { ok: false, status: 503, message: "Firebase Auth doit être configuré pour utiliser l’IA." };

  // Claims screen out tokens from other projects before Firebase validates the token.
  let claims: { aud?: unknown; iss?: unknown; sub?: unknown; exp?: unknown; auth_time?: unknown };
  try {
    claims = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
  } catch {
    return invalidSession();
  }
  const now = Date.now() / 1000;
  if (!claims || claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}`
    || typeof claims.sub !== "string" || !claims.sub || claims.sub.length > 128
    || typeof claims.exp !== "number" || claims.exp <= now
    || typeof claims.auth_time !== "number" || claims.auth_time > now) return invalidSession();

  const unavailable: AiIdentity = { ok: false, status: 503, message: "La vérification Firebase est momentanément indisponible." };
  try {
    const url = new URL("https://identitytoolkit.googleapis.com/v1/accounts:lookup");
    url.searchParams.set("key", apiKey);
    const response = await fetchAccount(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(5_000)]),
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      return ["INVALID_ID_TOKEN", "TOKEN_EXPIRED", "USER_DISABLED", "USER_NOT_FOUND"].includes(error?.error?.message)
        ? invalidSession()
        : unavailable;
    }
    const account = (await response.json())?.users?.[0];
    if (account?.localId !== claims.sub || account.disabled || account.emailVerified !== true
      || (account.validSince && Number(account.validSince) > claims.auth_time)) return invalidSession();
    return { ok: true, userId: claims.sub };
  } catch {
    return unavailable;
  }
}

export function authenticateAiRequest(request: Request) {
  return resolveAiIdentity(request, {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    allowLocalDevelopment: process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_FIREBASE_AUTH_REQUIRED !== "true",
  });
}

export function aiAuthError(identity: Extract<AiIdentity, { ok: false }>) {
  return Response.json({ error: identity.message }, { status: identity.status, headers: { "Cache-Control": "no-store" } });
}
