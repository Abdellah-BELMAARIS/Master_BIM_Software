// Lesson 3.2: Creating a project class
// 1. Importing the Project class blueprint from its module
import { Project } from "./classes/Project.js";

// Lesson 2.4: Flow control with conditional statements
// Dynamic function to show dialogs safely
const showModal = (id) => {
    const modal = document.getElementById(id);
    if (modal && "showModal" in modal) {
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

// Lesson 2.5 & 3.2: Catching up form data & creating Project instances
const projectForm = document.getElementById("new-project-form");

if (projectForm) {
    projectForm.addEventListener("submit", (e) => {
        // Prevent default browser behavior (page reload)
        e.preventDefault();

        // Getting form data using FormData class
        const formData = new FormData(projectForm);

        // Gathering input data into a project data object
        const projectData = {
            name: formData.get("name"),
            description: formData.get("description"),
            userRole: formData.get("userRole"),
            status: formData.get("status"),
            finishDate: formData.get("finishDate"),
        };

        // Lesson 3.2: Creating a new instance of the Project class
        const project = new Project(projectData);

        // Logging the created instance to the console
        console.log("New Project Instance Created:", project);
    });
} else {
    console.warn("Project form was not found");
}
