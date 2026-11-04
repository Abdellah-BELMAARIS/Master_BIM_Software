// Lesson 3.6, 3.7, 3.8 & 3.9: Project Management, Error Handling, and JSON I/O
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

// Wire error modal close button
const closeErrorModalBtn = document.getElementById("close-error-modal-btn");
if (closeErrorModalBtn) {
    closeErrorModalBtn.addEventListener("click", () => {
        toggleModal("error-modal", false);
    });
}

// Referencing the projects grid container with safe type assertion
const projectsListUI = document.getElementById("projects-list") as HTMLDivElement;
const projectsManager = new ProjectsManager(projectsListUI);

// Lesson 3.9: Connect Import and Export buttons
const importBtn = document.getElementById("import-projects-btn");
if (importBtn) {
    importBtn.addEventListener("click", () => {
        projectsManager.importFromJSON();
    });
}

const exportBtn = document.getElementById("export-projects-btn");
if (exportBtn) {
    exportBtn.addEventListener("click", () => {
        projectsManager.exportToJSON();
    });
}

const floatingExportBtn = document.getElementById("floating-export-btn");
if (floatingExportBtn) {
    floatingExportBtn.addEventListener("click", () => {
        projectsManager.exportToJSON();
    });
}

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

        // Intercepting errors using try-catch statement
        try {
            const project = projectsManager.newProject(projectData);
            console.log("New Project Created & Rendered:", project);

            // Clean up form inputs
            projectForm.reset();

            // Close the dialog after successful submission
            toggleModal("new-project-modal", false);
        } catch (err: any) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            console.warn("Caught Project Creation Error:", errorMessage);

            // Render to custom <dialog id="error-modal"> or fallback to alert()
            const errorMsgEl = document.getElementById("error-modal-message");
            const errorModal = document.getElementById("error-modal");

            if (errorModal && errorModal instanceof HTMLDialogElement && errorMsgEl) {
                errorMsgEl.textContent = errorMessage;
                toggleModal("error-modal", true);
            } else {
                alert(errorMessage);
            }
        }
    });
} else {
    console.warn("Project form was not found or is not an HTMLFormElement");
}

// Lesson 4.1 Assignment & SPA Navigation: Switch between Projects, Details, and Users pages
const navProjectsBtn = document.getElementById("nav-projects-btn");
const navUsersBtn = document.getElementById("nav-users-btn");
const backToProjectsBtn = document.getElementById("back-to-projects-btn");

const showProjectsPage = () => {
    const projectsPage = document.getElementById("projects-page");
    const detailsPage = document.getElementById("project-details");
    const usersPage = document.getElementById("users-page");
    if (!projectsPage || !detailsPage) { return; }

    projectsPage.style.display = "flex";
    detailsPage.style.display = "none";
    if (usersPage) { usersPage.style.display = "none"; }

    navProjectsBtn?.classList.add("active");
    navUsersBtn?.classList.remove("active");
};

if (navProjectsBtn) {
    navProjectsBtn.addEventListener("click", showProjectsPage);
}

if (backToProjectsBtn) {
    backToProjectsBtn.addEventListener("click", showProjectsPage);
}

if (navUsersBtn) {
    navUsersBtn.addEventListener("click", () => {
        const projectsPage = document.getElementById("projects-page");
        const detailsPage = document.getElementById("project-details");
        const usersPage = document.getElementById("users-page");
        if (!projectsPage || !detailsPage || !usersPage) { return; }

        projectsPage.style.display = "none";
        detailsPage.style.display = "none";
        usersPage.style.display = "flex";

        navUsersBtn.classList.add("active");
        navProjectsBtn?.classList.remove("active");
    });
}

// Wire Users Modal open/close buttons
const newUserBtn = document.getElementById("new-user-btn");
if (newUserBtn) {
    newUserBtn.addEventListener("click", () => toggleModal("new-user-modal", true));
}
const cancelUserBtn = document.getElementById("cancel-user-btn");
if (cancelUserBtn) {
    cancelUserBtn.addEventListener("click", () => toggleModal("new-user-modal", false));
}
