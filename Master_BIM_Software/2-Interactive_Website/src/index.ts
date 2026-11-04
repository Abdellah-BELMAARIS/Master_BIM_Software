// Lesson 3.6, 3.7 & 3.8: Project Management & Custom Error Interception
import { IProject, ProjectStatus, UserRole } from "./classes/Project";
import { ProjectsManager } from "./classes/ProjectsManager";

// Reusable toggleModal function controlling open / close state
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

// Cancel button listener closes modal without submitting
const cancelProjectBtn = document.getElementById("cancel-btn");
if (cancelProjectBtn) {
    cancelProjectBtn.addEventListener("click", () => {
        toggleModal("new-project-modal", false);
    });
}

// Lesson 3.8 Challenge: Wire error modal close button
const closeErrorModalBtn = document.getElementById("close-error-modal-btn");
if (closeErrorModalBtn) {
    closeErrorModalBtn.addEventListener("click", () => {
        toggleModal("error-modal", false);
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

        // Lesson 3.8: Intercepting errors using try-catch statement
        try {
            // Delegating creation and UI rendering to the ProjectsManager
            const project = projectsManager.newProject(projectData);
            console.log("New Project Created & Rendered:", project);

            // Clean up form inputs
            projectForm.reset();

            // Close the dialog after successful submission
            toggleModal("new-project-modal", false);
        } catch (err: any) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.warn("Caught Project Creation Error:", errorMessage);

            // Lesson 3.8 Challenge: Render to custom <dialog id="error-modal"> or fallback to alert()
            const errorMsgEl = document.getElementById("error-modal-message");
            const errorModal = document.getElementById("error-modal");

            if (errorModal && errorModal instanceof HTMLDialogElement && errorMsgEl) {
                errorMsgEl.textContent = errorMessage;
                toggleModal("error-modal", true);
            } else {
                // Standard alert demonstration from lesson
                alert(errorMessage);
            }
        }
    });
} else {
    console.warn("Project form was not found or is not an HTMLFormElement");
}
