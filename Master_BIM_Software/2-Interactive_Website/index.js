// Lesson 2.4: Flow control with conditional statements

// 1. Dynamic function that accepts an argument (id) instead of hardcoding the modal ID
const showModal = (id) => {
    const modal = document.getElementById(id);
    if (modal && "showModal" in modal) {
        modal.showModal();
    } else {
        console.warn(`The provided modal with id "${id}" was not found`);
    }
};

// 2. Referencing the button element
const newProjectBtn = document.getElementById("new-project-btn");

// 3. Flow control with if/else (truthy check: if newProjectBtn is not null)
if (newProjectBtn) {
    // Enclosing the call in an anonymous arrow function to avoid premature invocation
    newProjectBtn.addEventListener("click", () => {
        showModal("new-project-modal");
    });
} else {
    // Warning with yellow background in console if the element was not found
    console.warn("New projects button was not found");
}

// Lesson 2.5: Catching up form data

// 1. Referencing the form element
const projectForm = document.getElementById("new-project-form");

// 2. Flow control: only attach listener if projectForm exists
if (projectForm) {
    // 3. Listening to the form 'submit' event
    projectForm.addEventListener("submit", (e) => {
        // Prevent default browser behavior (page reload)
        e.preventDefault();

        // 4. Instantiating FormData with the 'new' keyword (class blueprint instantiation)
        const formData = new FormData(projectForm);

        // 5. Lesson Challenge: Construct a project data object using formData.get()
        const projectData = {
            name: formData.get("name"),
            description: formData.get("description"),
            userRole: formData.get("userRole"),
            status: formData.get("status"),
            finishDate: formData.get("finishDate"),
        };

        // 6. Log the structured project object to the console
        console.log("Project Data Submitted:", projectData);
    });
} else {
    console.warn("Project form was not found");
}
