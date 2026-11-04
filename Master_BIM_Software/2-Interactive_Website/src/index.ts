// Lesson 3.3: Introducing Typescript to the code
import { Project } from "./classes/Project";

// 1. Statically typed function parameter (id: string)
// 2. Type Guard using 'instanceof HTMLDialogElement' to safely invoke .showModal()
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

// Lesson 3.3 Assignment: Type guard with 'instanceof HTMLFormElement'
// Explanation: getElementById returns HTMLElement, but FormData constructor requires HTMLFormElement.
if (projectForm && projectForm instanceof HTMLFormElement) {
    projectForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const formData = new FormData(projectForm);

        const projectData = {
            name: formData.get("name"),
            description: formData.get("description"),
            userRole: formData.get("userRole"),
            status: formData.get("status"),
            finishDate: formData.get("finishDate"),
        };

        const project = new Project(projectData);
        console.log("New Project Instance Created:", project);
    });
} else {
    console.warn("Project form was not found or is not an HTMLFormElement");
}
