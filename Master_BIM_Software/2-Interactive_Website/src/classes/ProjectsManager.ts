// Lesson 3.6: Managing the projects
import { IProject, Project } from "./Project";

export class ProjectsManager {
    // 1. Array storing all active Project instances
    list: Project[] = [];

    // 2. HTML container in the DOM where project cards will be rendered
    ui: HTMLDivElement;

    constructor(container: HTMLDivElement) {
        this.ui = container;

        // Assignment 3: Create a default project upon manager instantiation
        this.newProject({
            name: "Default Project",
            description: "This is just a default project. You may delete it if you want.",
            userRole: "Architect",
            status: "Active",
            finishDate: new Date(),
        });
    }

    // 3. Method to create a project, render its card in the UI, and register it in the list
    newProject(data: IProject): Project {
        const project = new Project(data);
        this.ui.append(project.ui);
        this.list.push(project);
        return project;
    }
}
