// Lesson 3.6: Managing the projects
import { IProject, ProjectStatus, UserRole } from "./classes/Project";
import { ProjectsManager } from "./classes/ProjectsManager";

// Assignment 1: Reusable toggleModal function controlling open / close state
const toggleModal = (id: string, show: boolean = true) => {
    const modal = document.getElementById(id);
    if (modal && modal instanceof HTMLDialogElement) {
        if (show) {
            modal.showModal();
        } else {
            modal.close();
        }
    } else {
        console.warn(`The provided modal with id "${id}" was not found`);
    }
};

// Referencing the 'New Project' button
const newProjectBtn = document.getElementById("new-project-btn");
if (newProjectBtn) {
    newProjectBtn.addEventListener("click", () => {
        toggleModal("new-project-modal", true);
    });
} else {
    console.warn("New projects button was not found");
}

// Assignment 2: Cancel button listener closes the modal without submitting
const cancelProjectBtn = document.getElementById("cancel-btn");
if (cancelProjectBtn) {
    cancelProjectBtn.addEventListener("click", () => {
        toggleModal("new-project-modal", false);
    });
}

// Referencing the projects grid container with safe type assertion
const projectsListUI = document.getElementById("projects-list") as HTMLDivElement;
const projectsManager = new ProjectsManager(projectsListUI);

// Referencing the project form
const projectForm = document.getElementById("new-project-form");

if (projectForm && projectForm instanceof HTMLFormElement) {
    projectForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const formData = new FormData(projectForm);

        const projectData: IProject = {
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            userRole: formData.get("userRole") as UserRole,
            status: formData.get("status") as ProjectStatus,
            finishDate: new Date(formData.get("finishDate") as string),
        };

        // Delegating creation and UI rendering to the ProjectsManager
        const project = projectsManager.newProject(projectData);
        console.log("New Project Created & Rendered:", project);

        // Clean up form inputs
        projectForm.reset();

        // Close the dialog after successful submission
        toggleModal("new-project-modal", false);
    });
} else {
    console.warn("Project form was not found or is not an HTMLFormElement");
}
