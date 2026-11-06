// Lesson 3.4, 3.5 & 3.7: Custom types, interfaces, and UUID (UI moved to ProjectCard React component in Module 3 Lesson 3.5)
import { v4 as uuidv4 } from "uuid";

// 1. Custom union types for properties with fixed choices
export type ProjectStatus = "pending" | "active" | "finished" | "Pending" | "Active" | "Finished";
export type UserRole = "architect" | "engineer" | "developer" | "Architect" | "Engineer" | "Developer";
export type TodoStatus = "pending" | "in-progress" | "completed";

export interface IProjectTask {
    id: number;
    text: string;
    date: string;
    status: TodoStatus;
    completed: boolean;
}

// Array of 6 possible icon colors for Challenge #2 (Random Project Avatar Color)
export const PROJECT_ICON_COLORS = [
    "#2563eb", // Cobalt Blue
    "#c2410c", // Terracotta Orange
    "#15803d", // Structural Green
    "#7c3aed", // Royal Violet
    "#b45309", // Amber Gold
    "#0f766e", // Deep Teal
];

// 2. TypeScript interface describing the data contract for a project
export interface IProject {
    name: string;
    description: string;
    userRole: UserRole;
    status: ProjectStatus;
    finishDate: Date;
    cost?: number;
    progress?: number;
    iconColor?: string;
    todos?: IProjectTask[];
    modelType?: "cube" | "gear";
}

// 3. Project class implementing IProject (UI is now managed by React <ProjectCard /> component)
export class Project implements IProject {
    // Properties from IProject
    name: string;
    description: string;
    userRole: UserRole;
    status: ProjectStatus;
    finishDate: Date;
    todos: IProjectTask[] = [];
    modelType: "cube" | "gear";

    // Unique alphanumeric UUID identifier
    id: string;

    // Internal class properties with default values
    cost: number = 0;
    progress: number = 0;
    iconColor: string;

    constructor(data: IProject, id: string = uuidv4()) {
        this.id = id;
        this.modelType = data.modelType || (data.name.toLowerCase().includes("gear") ? "gear" : "cube");

        // Challenge #2: Pick a random background color from the 6-color palette (or preserve imported color)
        const randomIndex = Math.floor(Math.random() * PROJECT_ICON_COLORS.length);
        this.iconColor = data.iconColor || PROJECT_ICON_COLORS[randomIndex];

        // Lesson 3.10: Dynamic object iteration using for...in and bracket notation
        for (const key in data) {
            const k = key as keyof IProject;
            (this as any)[k] = data[k];
        }

        // Resolving "The Trap" from Lesson 3.10 & Challenge #4 (Default Date fallback):
        const parsedDate = data.finishDate ? new Date(data.finishDate) : new Date();
        this.finishDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

        // Form submission payload fallbacks:
        this.cost = data.cost ?? 0;
        this.progress = data.progress ?? 0.25;

        // Structural BCF / To-Do Tasks (Challenge #6, #7, #9: Stored inside project data with status)
        this.todos = data.todos
            ? data.todos.map((t) => ({
                  ...t,
                  status: t.status || (t.completed ? "completed" : "pending"),
                  completed: t.status === "completed" || Boolean(t.completed),
              }))
            : [
                  { id: 1, text: "Verify structural foundation loads & seismic joints", date: "Fri, 20 Sep", status: "in-progress", completed: false },
                  { id: 2, text: "Perform CYPECAD concrete reinforcement calculation & detailing", date: "Mon, 23 Sep", status: "pending", completed: false },
                  { id: 3, text: "Resolve MEP HVAC collision with concrete beam in IFC viewer", date: "Thu, 26 Sep", status: "completed", completed: true },
              ];
    }
}
