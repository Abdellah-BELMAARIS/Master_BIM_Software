// Lesson 3.4: Using custom types for the Project class
import { Project, IProject, ProjectStatus, UserRole } from "./classes/Project";

// Statically typed function parameter (id: string)
// Type Guard using 'instanceof HTMLDialogElement'
const showModal = (id: string) => {
    const modal = document.getElementById(id);
    if (modal && modal instanceof HTMLDialogElement) {
        modal.showModal();
    } else {
        console.warn(`The provided modal with id "${id}" was not found`);
    }
};

// Referencing the 'New Project' button
const newProjectBtn = document.getElementById("new-project-btn");
if (newProjectBtn) {
    newProjectBtn.addEventListener("click", () => {
        showModal("new-project-modal");
    });
} else {
    console.warn("New projects button was not found");
}

// Referencing the project form
const projectForm = document.getElementById("new-project-form");

if (projectForm && projectForm instanceof HTMLFormElement) {
    projectForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const formData = new FormData(projectForm);

        // Lesson 3.4: Constraining projectData to the IProject interface
        // Using Type Assertion ('as') because formData.get() returns FormDataEntryValue
        // Converting finishDate string into a real Date instance via new Date(...)
        const projectData: IProject = {
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            userRole: formData.get("userRole") as UserRole,
            status: formData.get("status") as ProjectStatus,
            finishDate: new Date(formData.get("finishDate") as string),
        };

        // Instantiating the typed Project class
        const project = new Project(projectData);
        console.log("New Project Instance Created:", project);
    });
} else {
    console.warn("Project form was not found or is not an HTMLFormElement");
}
