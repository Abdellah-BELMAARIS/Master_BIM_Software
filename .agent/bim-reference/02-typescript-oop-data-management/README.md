# 02 · TypeScript OOP & Data Management for BIM

## 1. TypeScript Interfaces vs Python Pydantic Models
In Python/Django, data contracts are enforced via `Pydantic` or `dataclasses`. In TypeScript, interfaces provide compile-time guarantees without runtime overhead:

```typescript
export type ProjectRole = "architect" | "engineer" | "developer";
export type ProjectStatus = "pending" | "active" | "finished";

export interface IProject {
  id: string;
  name: string;
  description: string;
  role: ProjectRole;
  status: ProjectStatus;
  finishDate: Date;
  cost: number;
}
```

---

## 2. ProjectsManager Pattern (Repository / Service Layer)
The `ProjectsManager` acts as an in-memory repository managing projects, validating duplicates, calculating metrics, and handling JSON import/export:

```typescript
export class ProjectsManager {
  private _projects: Map<string, Project> = new Map();

  addProject(data: Omit<IProject, "id">): Project {
    const exists = Array.from(this._projects.values()).some(
      (p) => p.name.toLowerCase() === data.name.toLowerCase()
    );
    if (exists) {
      throw new Error(`Project "${data.name}" already exists.`);
    }

    const project = new Project(data);
    this._projects.set(project.id, project);
    return project;
  }
}
```
