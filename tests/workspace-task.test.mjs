import assert from "node:assert/strict";
import test from "node:test";
import { persistAgentTask, workspaceTaskOutputSchema } from "../lib/ai/workspace-task.ts";

test("l’outil renvoie l’identifiant du dépôt et transmet les champs de la tâche", async () => {
  const saved = [];
  const result = await persistAgentTask({
    title: "  Vérifier le BAT  ",
    projectId: "projet-a",
    dueAt: "2026-11-20T10:30:00+01:00",
    priority: "high",
  }, "prod", {
    listProjects: async () => [{ id: "projet-a" }],
    createTask: async (task) => {
      saved.push(task);
      return { ...task, id: "tache-enregistree" };
    },
  });
  assert.deepEqual(saved, [{
    title: "Vérifier le BAT",
    projectId: "projet-a",
    dueAt: "2026-11-20T10:30:00+01:00",
    priority: "high",
    assignedAgentId: "prod",
  }]);
  assert.deepEqual(workspaceTaskOutputSchema.parse(result), {
    status: "created", id: "tache-enregistree", title: "Vérifier le BAT",
  });
});

test("une entrée invalide ou un projet absent ne déclenche aucune écriture", async () => {
  let writes = 0;
  const repository = {
    listProjects: async () => [],
    createTask: async () => {
      writes += 1;
      return { id: "inattendu", title: "Inattendu" };
    },
  };
  for (const input of [{ title: " " }, { title: "Essai", projectId: "projet-absent" }]) {
    assert.equal((await persistAgentTask(input, "celian", repository)).status, "not_persisted");
  }
  assert.equal(writes, 0);
});

test("un échec du dépôt ne devient jamais une confirmation de création", async () => {
  const result = await persistAgentTask({ title: "Vérifier le BAT" }, "prod", {
    listProjects: async () => [],
    createTask: async () => { throw new Error("Dépôt indisponible"); },
  });
  assert.equal(workspaceTaskOutputSchema.parse(result).status, "not_persisted");
  assert.equal("id" in result, false);
});
