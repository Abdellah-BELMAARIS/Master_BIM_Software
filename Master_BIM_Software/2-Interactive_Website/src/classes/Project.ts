// Lesson 3.4 & 3.5: Custom types, interfaces, and dynamic UI generation

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
}

// 3. Project class implementing IProject with dynamic DOM card generation
export class Project implements IProject {
    // Properties from IProject
    name: string;
    description: string;
    userRole: UserRole;
    status: ProjectStatus;
    finishDate: Date;

    // Internal class properties with default values (Lesson 3.5)
    cost: number = 0;
    progress: number = 0;
    ui!: HTMLDivElement;

    constructor(data: IProject) {
        this.name = data.name;
        this.description = data.description;
        this.userRole = data.userRole;
        this.status = data.status;
        this.finishDate = data.finishDate;

        // Automatically create and bind the UI element upon instantiation
        this.setUI();
    }

    // Method dedicated to creating the project card UI
    setUI() {
        // Prevent duplicate UI creations if ui is already defined
        if (this.ui) { return; }

        this.ui = document.createElement("div");
        this.ui.className = "project-card";

        // Template literals inserting dynamic project values
        const initials = this.name ? this.name.substring(0, 2).toUpperCase() : "PR";
        this.ui.innerHTML = `
            <div class="card-header">
                <div class="card-avatar badge-orange">${initials}</div>
                <div class="card-title-group">
                    <h3>${this.name}</h3>
                    <p>${this.description}</p>
                </div>
            </div>
            <div class="card-details">
                <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span class="detail-value">${this.status}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Role</span>
                    <span class="detail-value">${this.userRole}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Cost</span>
                    <span class="detail-value">$ ${this.cost}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Estimated Progress</span>
                    <span class="detail-value">${this.progress * 100}%</span>
                </div>
            </div>
        `;
    }
}
