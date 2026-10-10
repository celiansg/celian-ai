export interface ProjectMemory {
  projectId: string;
  decisions: string[];
  constraints: string[];
  preferences: string[];
}

export async function getProjectMemory(projectId: string): Promise<ProjectMemory> {
  return { projectId, decisions: [], constraints: [], preferences: [] };
}
