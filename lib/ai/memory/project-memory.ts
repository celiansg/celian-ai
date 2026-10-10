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

export async function getProjectMemory(projectId: string): Promise<ProjectMemory> {
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
