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

        // Lesson 4.1 & 4.3: Navigate to Project Details page and populate dynamic data on card click
        project.ui.addEventListener("click", () => {
            const projectsPage = document.getElementById("projects-page");
            const detailsPage = document.getElementById("project-details");
            if (!projectsPage || !detailsPage) { return; }

            // Call the private method before displaying
            this.setDetailsPage(project);

            projectsPage.style.display = "none";
            detailsPage.style.display = "flex";
        });

        this.ui.append(project.ui);
        this.list.push(project);
        return project;
    }

    // Lesson 4.3: Internal private method to update all project details UI elements via data-project-info
    private setDetailsPage(project: Project): void {
        const detailsPage = document.getElementById("project-details");
        if (!detailsPage) { return; }

        // 1. Update Project Name across header and card title
        const nameElements = detailsPage.querySelectorAll("[data-project-info='name']");
        nameElements.forEach((el) => {
            el.textContent = project.name;
        });

        // 2. Update Project Description across header and card
        const descElements = detailsPage.querySelectorAll("[data-project-info='description']");
        descElements.forEach((el) => {
            el.textContent = project.description;
        });

        // 3. Update Status
        const status = detailsPage.querySelector("[data-project-info='status']");
        if (status) {
            status.textContent = project.status;
        }

        // 4. Update Cost (Formatted as currency)
        const cost = detailsPage.querySelector("[data-project-info='cost']");
        if (cost) {
            cost.textContent = `$ ${Number(project.cost || 0).toLocaleString("en-US")}`;
        }

        // 5. Update User Role
        const role = detailsPage.querySelector("[data-project-info='role']");
        if (role) {
            role.textContent = project.userRole;
        }

        // 6. Update Finish Date (Formatted as readable date)
        const finishDate = detailsPage.querySelector("[data-project-info='finishDate']");
        if (finishDate) {
            const dateObj = new Date(project.finishDate);
            finishDate.textContent = isNaN(dateObj.getTime())
                ? String(project.finishDate)
                : dateObj.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
        }

        // 7. Update Progress Bar Width & Percentage Text
        const progress = detailsPage.querySelector("[data-project-info='progress']") as HTMLDivElement | null;
        if (progress) {
            const percentage = Math.round((project.progress || 0) * 100);
            progress.style.width = `${percentage}%`;
            progress.textContent = `${percentage}%`;
        }

        // 8. Update Avatar Initials & Role Badge Color
        const avatar = detailsPage.querySelector("[data-project-info='avatar']") as HTMLDivElement | null;
        if (avatar) {
            avatar.textContent = project.name.slice(0, 2).toUpperCase();
            avatar.className = "card-avatar-circle";
            if (project.userRole === "Architect") avatar.classList.add("badge-purple");
            else if (project.userRole === "Engineer") avatar.classList.add("badge-orange");
            else if (project.userRole === "Developer") avatar.classList.add("badge-green");
            else avatar.classList.add("badge-blue");
        }
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
