// Lesson 3.4, 3.5 & 3.7: Custom types, interfaces, dynamic UI, and UUID
import { v4 as uuidv4 } from "uuid";

// 1. Custom union types for properties with fixed choices
export type ProjectStatus = "pending" | "active" | "finished" | "Pending" | "Active" | "Finished";
export type UserRole = "architect" | "engineer" | "developer" | "Architect" | "Engineer" | "Developer";

// 2. TypeScript interface describing the data contract for a project
export interface IProject {
    name: string;
    description: string;
    userRole: UserRole;
    status: ProjectStatus;
    finishDate: Date;
    cost?: number;
    progress?: number;
}

// 3. Project class implementing IProject with dynamic DOM card generation
export class Project implements IProject {
    // Properties from IProject
    name: string;
    description: string;
    userRole: UserRole;
    status: ProjectStatus;
    finishDate: Date;

    // Unique alphanumeric UUID identifier
    id: string;

    // Internal class properties with default values
    cost: number = 0;
    progress: number = 0;
    ui!: HTMLDivElement;

    constructor(data: IProject, id: string = uuidv4()) {
        this.id = id;

        // Lesson 3.10: Dynamic object iteration using for...in and bracket notation
        for (const key in data) {
            const k = key as keyof IProject;
            (this as any)[k] = data[k];
        }

        // ⚠️ Resolving "The Trap" from Lesson 3.10:
        // 1. Form inputs and JSON imports provide finishDate as a string ("2026-11-04").
        // Direct assignment leaves this.finishDate as string, crashing Date methods like toLocaleDateString()!
        this.finishDate = new Date(data.finishDate);

        // 2. Form submission payload does not contain cost or progress; ensure reliable fallbacks:
        this.cost = data.cost ?? 0;
        this.progress = data.progress ?? 0;

        // Automatically create and bind the UI element upon instantiation
        this.setUI();
    }

    // Method dedicated to creating the project card UI with professional BIM aesthetics
    setUI() {
        if (this.ui) { return; }

        this.ui = document.createElement("div");
        this.ui.className = "project-card";
        this.ui.dataset.projectId = this.id;

        // Calculate initials
        const initials = this.name ? this.name.substring(0, 2).toUpperCase() : "PR";

        // Assign badge color based on role
        let avatarClass = "badge-orange";
        const roleLower = (this.userRole || "").toLowerCase();
        if (roleLower.includes("arch")) avatarClass = "badge-purple";
        else if (roleLower.includes("eng")) avatarClass = "badge-blue";
        else if (roleLower.includes("dev")) avatarClass = "badge-green";

        // Format date cleanly
        const dateStr = this.finishDate instanceof Date && !isNaN(this.finishDate.getTime())
            ? this.finishDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
            : "Ongoing";

        const progressPercent = Math.round(this.progress * 100);

        this.ui.innerHTML = `
            <div class="card-header">
                <div class="card-avatar ${avatarClass}">${initials}</div>
                <div class="card-title-group">
                    <h3>${this.name}</h3>
                    <p>${this.description}</p>
                </div>
            </div>
            <div class="card-details">
                <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span class="detail-value status-tag ${this.status.toLowerCase()}">${this.status}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Role</span>
                    <span class="detail-value">${this.userRole}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Cost</span>
                    <span class="detail-value">$ ${Number(this.cost).toLocaleString()}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Finish Date</span>
                    <span class="detail-value">${dateStr}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Progress</span>
                    <span class="detail-value">${progressPercent}%</span>
                </div>
            </div>
            <div class="card-progress-bar">
                <div class="card-progress-fill" style="width: ${Math.max(5, progressPercent)}%;"></div>
            </div>
        `;
    }
}
