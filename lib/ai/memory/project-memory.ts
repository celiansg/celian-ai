export interface ProjectMemory {
  projectId: string;
  client?: string;
  products: string[];
  specifications: string[];
  references: string[];
  decisions: string[];
  constraints: string[];
  preferences: string[];
  designDirection: string[];
  files: string[];
  corrections: string[];
  communications: string[];
  tasks: string[];
  updatedAt?: string;
}

type MemorySource = {
  projects?: Array<{ id: string; name?: string; description?: string }>;
  tasks?: Array<{ projectId?: string; title?: string; description?: string; status?: string }>;
  files?: Array<{ projectId?: string; name?: string }>;
  activities?: Array<{ projectId?: string; description?: string }>;
};

export function buildProjectMemory(projectId: string, source: MemorySource = {}): ProjectMemory {
  const project = source.projects?.find((item) => item.id === projectId);
  const tasks = source.tasks?.filter((item) => item.projectId === projectId && item.status !== "completed" && item.status !== "archived") ?? [];
  const files = source.files?.filter((item) => item.projectId === projectId) ?? [];
  const activities = source.activities?.filter((item) => item.projectId === projectId) ?? [];
  return {
    projectId,
    client: project?.name,
    products: project?.description ? [project.description] : [],
    specifications: [],
    references: [],
    decisions: [],
    constraints: [],
    preferences: [],
    designDirection: [],
    files: files.map((item) => item.name).filter((value): value is string => Boolean(value)),
    corrections: [],
    communications: activities.map((item) => item.description).filter((value): value is string => Boolean(value)),
    tasks: tasks.map((item) => [item.title, item.description].filter(Boolean).join(" — ")),
    updatedAt: new Date().toISOString(),
  };
}

export async function getProjectMemory(projectId: string, source?: MemorySource): Promise<ProjectMemory> {
  if (source) return buildProjectMemory(projectId, source);
  return {
    projectId,
    products: [],
    specifications: [],
    references: [],
    decisions: [],
    constraints: [],
    preferences: [],
    designDirection: [],
    files: [],
    corrections: [],
    communications: [],
    tasks: [],
  };
}
