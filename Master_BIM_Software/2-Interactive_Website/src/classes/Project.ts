// Lesson 3.4: Using custom types for the Project class

// 1. Custom union types for properties with a fixed set of choices
export type ProjectStatus = "pending" | "active" | "finished" | "Pending" | "Active" | "Finished";
export type UserRole = "architect" | "engineer" | "developer" | "Architect" | "Engineer" | "Developer";

// 2. TypeScript interface describing the shape/contract of a project object
export interface IProject {
    name: string;
    description: string;
    userRole: UserRole;
    status: ProjectStatus;
    finishDate: Date;
}

// 3. Class implementing the IProject interface
export class Project implements IProject {
    // Declaring properties with types required by IProject
    name: string;
    description: string;
    userRole: UserRole;
    status: ProjectStatus;
    finishDate: Date;

    // The constructor receives data satisfying the IProject contract
    constructor(data: IProject) {
        this.name = data.name;
        this.description = data.description;
        this.userRole = data.userRole;
        this.status = data.status;
        this.finishDate = data.finishDate;
    }
}
