// Lesson 3.6, 3.7, 3.8 & 3.9: Projects Manager with Queries, Validation & JSON I/O
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
            cost: 0,
            progress: 0.25,
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

    // Lesson 3.9: Export all projects to JSON and trigger automatic download
    exportToJSON(fileName: string = "projects") {
        // Serialize project data into clean formatted JSON
        const plainProjects = this.list.map((project) => ({
            id: project.id,
            name: project.name,
            description: project.description,
            userRole: project.userRole,
            status: project.status,
            finishDate: project.finishDate,
            cost: project.cost,
            progress: project.progress,
        }));

        const json = JSON.stringify(plainProjects, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        // Programmatic click on ghost anchor element
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName.endsWith(".json") ? fileName : `${fileName}.json`;
        a.click();

        // Cleanup temporary URL
        URL.revokeObjectURL(url);
    }

    // Lesson 3.9: Import projects from a selected JSON file
    importFromJSON() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";

        const reader = new FileReader();

        reader.addEventListener("load", () => {
            if (!reader.result) { return; }
            try {
                const projects: IProject[] = JSON.parse(reader.result as string);
                let importedCount = 0;
                let skippedCount = 0;

                // for...of loop generic iteration over imported projects
                for (const projectData of projects) {
                    try {
                        this.newProject(projectData);
                        importedCount++;
                    } catch (err: any) {
                        skippedCount++;
                        console.warn(`Skipped duplicate project "${projectData.name}":`, err.message);
                    }
                }
                console.log(`Import completed: ${importedCount} added, ${skippedCount} duplicates skipped.`);
            } catch (err: any) {
                console.error("JSON parse error during import:", err);
                throw new Error("The selected file is not a valid JSON projects file");
            }
        });

        input.addEventListener("change", () => {
            const filesList = input.files;
            if (!filesList || filesList.length === 0) { return; }
            reader.readAsText(filesList[0]);
        });

        input.click();
    }
}
