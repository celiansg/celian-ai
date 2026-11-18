import { z } from "zod";

export const workspaceTaskInputSchema = z.object({
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().max(2000).optional(),
  projectId: z.string().min(1).max(128).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueAt: z.iso.datetime({ offset: true }).optional(),
});

export const workspaceTaskOutputSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("created"), id: z.string(), title: z.string() }),
  z.object({ status: z.literal("not_persisted"), message: z.string() }),
]);

type TaskInput = z.infer<typeof workspaceTaskInputSchema>;
type TaskOutput = z.infer<typeof workspaceTaskOutputSchema>;

export async function persistAgentTask(
  input: unknown,
  agentId: string,
  repository: {
    listProjects: () => Promise<Array<{ id: string }>>;
    createTask: (task: TaskInput & { assignedAgentId: string }) => Promise<{ id: string; title: string }>;
  },
): Promise<TaskOutput> {
  const parsed = workspaceTaskInputSchema.safeParse(input);
  if (!parsed.success) return { status: "not_persisted", message: "Les informations de la tâche sont invalides." };

  try {
    const { projectId } = parsed.data;
    if (projectId && !(await repository.listProjects()).some((project) => project.id === projectId)) {
      return { status: "not_persisted", message: "Le projet sélectionné est introuvable." };
    }
    const saved = await repository.createTask({ ...parsed.data, assignedAgentId: agentId });
    return { status: "created", id: saved.id, title: saved.title };
  } catch {
    return { status: "not_persisted", message: "Impossible d’enregistrer la tâche dans cet espace." };
  }
}
