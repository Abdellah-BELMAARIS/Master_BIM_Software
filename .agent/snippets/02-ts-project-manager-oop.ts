/**
 * Snippet 02: TypeScript Project Class, Custom Types & ProjectsManager (Module 2)
 * Covers Lessons 3.2 - 3.10:
 * - Custom union types & interfaces (IProject, ProjectRole, ProjectStatus)
 * - Project class with DOM card generation
 * - ProjectsManager with CRUD, total cost calculation, and JSON Export/Import
 */

export type ProjectRole = "architect" | "engineer" | "developer";
export type ProjectStatus = "pending" | "active" | "finished";

export interface IProject {
  name: string;
  description: string;
  role: ProjectRole;
  status: ProjectStatus;
  finishDate: Date;
  cost?: number;
  progress?: number;
}

export class Project implements IProject {
  id: string;
  name: string;
  description: string;
  role: ProjectRole;
  status: ProjectStatus;
  finishDate: Date;
  cost: number = 0;
  progress: number = 0;
  ui!: HTMLDivElement;

  constructor(data: IProject, id = crypto.randomUUID()) {
    this.id = id;
    this.name = data.name;
    this.description = data.description;
    this.role = data.role;
    this.status = data.status;
    this.finishDate = new Date(data.finishDate);
    this.cost = data.cost ?? 0;
    this.progress = data.progress ?? 0;
    this.setUI();
  }

  private setUI(): void {
    this.ui = document.createElement("div");
    this.ui.className = "project-card";
    this.ui.dataset.projectId = this.id;

    const title = document.createElement("h3");
    title.textContent = this.name; // XSS-safe textContent

    const desc = document.createElement("p");
    desc.textContent = this.description;

    this.ui.append(title, desc);
  }
}

export class ProjectsManager {
  list: Project[] = [];
  ui: HTMLElement;

  constructor(container: HTMLElement) {
    this.ui = container;
  }

  newProject(data: IProject): Project {
    if (this.list.some((p) => p.name.toLowerCase() === data.name.toLowerCase())) {
      throw new Error(`A project with the name "${data.name}" already exists.`);
    }
    const project = new Project(data);
    this.list.push(project);
    this.ui.append(project.ui);
    return project;
  }

  getProject(id: string): Project | undefined {
    return this.list.find((p) => p.id === id);
  }

  calculateTotalCost(): number {
    return this.list.reduce((sum, project) => sum + project.cost, 0);
  }

  exportToJSON(fileName = "projects.json"): void {
    const json = JSON.stringify(this.list, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}
