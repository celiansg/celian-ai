import assert from "node:assert/strict";
import test from "node:test";
import { normalizeAgentHandle, routeGoal } from "../lib/ai/orchestration/router.ts";
import { buildProjectMemory } from "../lib/ai/memory/project-memory.ts";

test("le routage reconnaît @Célian et les mots-clés accentués", () => {
  assert.equal(normalizeAgentHandle("Célian"), "celian");
  assert.deepEqual(routeGoal("@Célian organise cette demande"), ["celian"]);
  assert.deepEqual(routeGoal("Vérifie le grammage et prépare une réponse client"), ["celian", "prod", "client"]);
});

test("la mémoire projet est construite uniquement depuis le contexte fourni", () => {
  const memory = buildProjectMemory("p1", {
    projects: [{ id: "p1", name: "Nivo", description: "Packaging bouteille" }],
    tasks: [{ projectId: "p1", title: "Vérifier le BAT", status: "todo" }],
    files: [{ projectId: "p1", name: "BAT-v2.pdf" }],
    activities: [{ projectId: "p1", description: "Le grammage reste à confirmer." }],
  });
  assert.equal(memory.client, "Nivo");
  assert.deepEqual(memory.products, ["Packaging bouteille"]);
  assert.deepEqual(memory.tasks, ["Vérifier le BAT"]);
  assert.deepEqual(memory.files, ["BAT-v2.pdf"]);
  assert.deepEqual(memory.communications, ["Le grammage reste à confirmer."]);
});
