import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();

test("le profil BAT officiel est présent et cohérent avec le PDF local", () => {
  const profilePath = join(root, "knowledge", "templates", "BAT-template.profile.json");
  const pdfPath = join(root, "knowledge", "templates", "BAT template(1).pdf");
  const profile = JSON.parse(readFileSync(profilePath, "utf8"));
  assert.equal(profile.status, "source-verified");
  assert.equal(profile.mappingStatus, "v1-measured");
  assert.equal(profile.pageCount, 1);
  assert.equal(profile.pdfStandard, "PDF/X-4");
  assert.equal(profile.orientation, "landscape");
  assert.equal(profile.fillableForm, false);
  assert.ok(existsSync(pdfPath), "Le PDF officiel doit être fourni localement avant la phase BAT.");
  const hash = createHash("sha256").update(readFileSync(pdfPath)).digest("hex").toUpperCase();
  assert.equal(hash, profile.sourceSha256);
});

test("le provider runner ne dépend plus du MockProvider", () => {
  const providerIndex = readFileSync(join(root, "lib", "ai", "providers", "index.ts"), "utf8");
  assert.match(providerIndex, /GeminiProvider/);
  assert.match(providerIndex, /OpenAIProvider/);
  assert.doesNotMatch(providerIndex, /MockProvider/);
});

test("le workspace local expose les repositories projets et tâches", () => {
  const workspaceDb = readFileSync(join(root, "lib", "local-workspace", "indexed-db.ts"), "utf8");
  for (const contract of ["createLocalProject", "listLocalProjects", "deleteLocalProject", "createLocalTask", "listLocalTasks", "updateLocalTask", "deleteLocalTask"]) {
    assert.match(workspaceDb, new RegExp(`export async function ${contract}`));
  }
});
