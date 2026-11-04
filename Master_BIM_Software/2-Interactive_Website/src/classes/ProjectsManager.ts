// Lesson 3.6, 3.7 & 3.8: Projects Manager with Validation & Error Handling
import { IProject, Project } from "./Project";

export class ProjectsManager {
    // 1. Array storing all active Project instances
    list: Project[] = [];

    // 2. HTML container in the DOM where project cards will be rendered
    ui: HTMLDivElement;

    constructor(container: HTMLDivElement) {
        this.ui = container;

        // Create a default project upon manager instantiation
        this.newProject({
            name: "Default Project",
            description: "This is just a default project. You may delete it if you want.",
            userRole: "Architect",
            status: "Active",
            finishDate: new Date(),
        });
    }

    // Creates a new project, renders its UI card, and pushes to list
    newProject(data: IProject): Project {
        // Lesson 3.8: Checking for existing project name using map() and includes()
        const projectNames = this.list.map((project) => project.name);
        const nameInUse = projectNames.includes(data.name);

        // Throw custom Error if name already exists
        if (nameInUse) {
            throw new Error(`A project with the name "${data.name}" already exists`);
        }

        const project = new Project(data);
        this.ui.append(project.ui);
        this.list.push(project);
        return project;
    }

    // Query a project by unique UUID
    getProject(id: string): Project | undefined {
        const project = this.list.find((project) => {
            return project.id === id;
        });
        return project;
    }

    // Delete a project by ID, removing UI card and keeping array immutable
    deleteProject(id: string): void {
        const project = this.getProject(id);
        if (!project) { return; }

        // Remove DOM element from page
        project.ui.remove();

        // Non-destructive filter: keeps only projects that do not match the target ID
        const remaining = this.list.filter((project) => {
            return project.id !== id;
        });
        this.list = remaining;
    }

    // Calculate total cost using Array.prototype.reduce()
    totalCost(): number {
        return this.list.reduce((total, project) => total + project.cost, 0);
    }

    // Find a project by its name
    getProjectByName(name: string): Project | undefined {
        return this.list.find((project) => project.name === name);
    }
}
