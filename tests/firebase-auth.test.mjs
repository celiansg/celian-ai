import test from "node:test";
import assert from "node:assert/strict";
import { resolveAiIdentity } from "../lib/firebase/server-auth.ts";

const projectId = "agents-test";
const apiKey = "test-api-key";

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function token(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: projectId,
    iss: `https://securetoken.google.com/${projectId}`,
    sub: "user-123",
    exp: now + 300,
    auth_time: now - 10,
    ...overrides,
  };
  return `header.${encode(claims)}.signature`;
}

function request({ authorization, url = "https://agents.example/api/chat", site } = {}) {
  return new Request(url, {
    headers: {
      ...(authorization ? { authorization: `Bearer ${authorization}` } : {}),
      ...(site ? { "sec-fetch-site": site } : {}),
    },
  });
}

test("un visiteur local peut rester en mode invité uniquement si le réglage le permet", async () => {
  const allowed = await resolveAiIdentity(
    request({ url: "http://localhost:3000/api/chat" }),
    { allowLocalDevelopment: true },
  );
  assert.deepEqual(allowed, { ok: true, userId: "local-user" });

  const blocked = await resolveAiIdentity(
    request({ url: "https://agents.example/api/chat" }),
    { allowLocalDevelopment: true },
  );
  assert.equal(blocked.ok, false);
  assert.equal(blocked.status, 401);
});

test("les requêtes cross-site sont refusées avant toute vérification distante", async () => {
  let called = false;
  const result = await resolveAiIdentity(
    request({ authorization: token(), site: "cross-site" }),
    { projectId, apiKey },
    async () => {
      called = true;
      throw new Error("ne doit pas être appelé");
    },
  );
  assert.deepEqual(result, { ok: false, status: 403, message: "Requête externe refusée." });
  assert.equal(called, false);
});

test("un JWT expiré ou destiné à un autre projet est rejeté sans appel Firebase", async () => {
  let calls = 0;
  const fetchAccount = async () => {
    calls += 1;
    return new Response("{}", { status: 200 });
  };
  const expired = await resolveAiIdentity(request({ authorization: token({ exp: 1 }) }), { projectId, apiKey }, fetchAccount);
  const wrongAudience = await resolveAiIdentity(request({ authorization: token({ aud: "other-project" }) }), { projectId, apiKey }, fetchAccount);
  assert.equal(expired.status, 401);
  assert.equal(wrongAudience.status, 401);
  assert.equal(calls, 0);
});

test("un compte Firebase vérifié est accepté seulement s’il correspond au sujet du token", async () => {
  const valid = await resolveAiIdentity(
    request({ authorization: token() }),
    { projectId, apiKey },
    async (_url, init) => {
      assert.equal(init?.method, "POST");
      return Response.json({ users: [{ localId: "user-123", emailVerified: true, disabled: false }] });
    },
  );
  assert.deepEqual(valid, { ok: true, userId: "user-123" });

  const unverified = await resolveAiIdentity(
    request({ authorization: token() }),
    { projectId, apiKey },
    async () => Response.json({ users: [{ localId: "user-123", emailVerified: false, disabled: false }] }),
  );
  assert.equal(unverified.status, 401);
});

test("une indisponibilité Firebase ne devient pas une session valide", async () => {
  const result = await resolveAiIdentity(
    request({ authorization: token() }),
    { projectId, apiKey },
    async () => new Response("service unavailable", { status: 503 }),
  );
  assert.deepEqual(result, {
    ok: false,
    status: 503,
    message: "La vérification Firebase est momentanément indisponible.",
  });
});
