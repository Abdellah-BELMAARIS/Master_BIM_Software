// Lesson 3.4, 3.5 & 3.7: Custom types, interfaces, and UUID (UI moved to ProjectCard React component in Module 3 Lesson 3.5)
import { v4 as uuidv4 } from "uuid";

// 1. Custom union types for properties with fixed choices
export type ProjectStatus = "pending" | "active" | "finished" | "Pending" | "Active" | "Finished";
export type UserRole =
    | "architect"
    | "engineer"
    | "developer"
    | "bim specialist"
    | "Architect"
    | "Engineer"
    | "Developer"
    | "BIM Specialist";
export type TodoStatus = "pending" | "in-progress" | "completed";
export type TodoPriority = "low" | "medium" | "high" | "critical";
export type ModelType = "cube" | "gear" | "car" | "villa" | "tower" | "bridge";
export type ModelCategory = "ifc" | "3d";

export interface IProjectTask {
    id: number;
    text: string;
    date?: string;
    status?: TodoStatus;
    priority?: TodoPriority;
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
    modelType?: ModelType;
    modelCategory?: ModelCategory;
    ifcFileName?: string;
    ifcSchema?: "IFC4" | "IFC2X3" | "IFC4.3";
}

// 3. Project class implementing IProject (UI is now managed by React <ProjectCard /> component)
export class Project implements IProject {
    // Properties from IProject
    name: string = "";
    description: string = "";
    userRole: UserRole = "Architect";
    status: ProjectStatus = "Active";
    finishDate: Date;
    todos: IProjectTask[] = [];
    modelType: ModelType;
    modelCategory: ModelCategory = "3d";
    ifcFileName?: string;
    ifcSchema?: "IFC4" | "IFC2X3" | "IFC4.3";

    // Unique alphanumeric UUID identifier
    id: string;

    // Internal class properties with default values
    cost: number = 0;
    progress: number = 0;
    iconColor: string = PROJECT_ICON_COLORS[0];

    constructor(data: IProject, id: string = uuidv4()) {
        this.id = id;
        const nameLower = (data.name || "").toLowerCase();
        let detectedModel: ModelType = "cube";
        if (data.modelType) {
            detectedModel = data.modelType;
        } else if (nameLower.includes("gear")) {
            detectedModel = "gear";
        } else if (nameLower.includes("car") || nameLower.includes("auto") || nameLower.includes("vehic")) {
            detectedModel = "car";
        } else if (nameLower.includes("villa") || nameLower.includes("house") || nameLower.includes("building") || nameLower.includes("residence")) {
            detectedModel = "villa";
        } else if (nameLower.includes("tower") || nameLower.includes("skyscraper") || nameLower.includes("apex")) {
            detectedModel = "tower";
        } else if (nameLower.includes("bridge") || nameLower.includes("span") || nameLower.includes("viaduct") || nameLower.includes("nordic")) {
            detectedModel = "bridge";
        }
        this.modelType = detectedModel;
        this.modelCategory = data.modelCategory || (data.ifcFileName || nameLower.includes("ifc") ? "ifc" : "3d");
        this.ifcFileName = data.ifcFileName;
        this.ifcSchema = data.ifcSchema;

        // Dynamic object iteration (ignoring undefined values to avoid overwriting defaults)
        for (const key in data) {
            const k = key as keyof IProject;
            if (data[k] !== undefined && data[k] !== null) {
                (this as any)[k] = data[k];
            }
        }

        // Challenge #2: Guarantee persistent vibrant icon color from 6-color palette
        const randomIndex = Math.floor(Math.random() * PROJECT_ICON_COLORS.length);
        this.iconColor = (data.iconColor && data.iconColor.trim())
            ? data.iconColor
            : (this.iconColor || PROJECT_ICON_COLORS[randomIndex]);

        // Resolving Date fallback:
        const parsedDate = data.finishDate ? new Date(data.finishDate) : new Date();
        this.finishDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

        // Form submission payload fallbacks (support number or numeric string from Firestore):
        this.cost = Number(data.cost) || 0;
        this.progress = data.progress !== undefined ? Number(data.progress) : 0.25;

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
