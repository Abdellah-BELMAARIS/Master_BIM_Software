// Module 03 — Section 2: Implementing 3D with ThreeJS
import * as THREE from "three";
import { IProject, ProjectStatus, TodoStatus, UserRole } from "./classes/Project";
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

// Helper to show styled error modal
const showErrorModal = (message: string) => {
    const errorMsgEl = document.getElementById("error-modal-message");
    const errorModal = document.getElementById("error-modal");
    if (errorModal && errorModal instanceof HTMLDialogElement && errorMsgEl) {
        errorMsgEl.textContent = message;
        toggleModal("error-modal", true);
    } else {
        alert(message);
    }
};

// Wire error modal close button
const closeErrorModalBtn = document.getElementById("close-error-modal-btn");
closeErrorModalBtn?.addEventListener("click", () => toggleModal("error-modal", false));

// Instantiate ProjectsManager
const projectsListUI = document.getElementById("projects-list") as HTMLDivElement;
const projectsManager = new ProjectsManager(projectsListUI);

// Track whether we are creating a new project or editing an existing one
let editingProjectId: string | null = null;

// Form input elements for Project Modal
const projectForm = document.getElementById("new-project-form") as HTMLFormElement | null;
const projectModalTitle = document.getElementById("project-modal-title");
const projectSubmitBtn = document.getElementById("project-submit-btn");
const projectNameInput = document.getElementById("project-name-input") as HTMLInputElement | null;
const projectDescInput = document.getElementById("project-desc-input") as HTMLTextAreaElement | null;
const projectRoleInput = document.getElementById("project-role-input") as HTMLSelectElement | null;
const projectStatusInput = document.getElementById("project-status-input") as HTMLSelectElement | null;
const projectCostInput = document.getElementById("project-cost-input") as HTMLInputElement | null;
const projectProgressInput = document.getElementById("project-progress-input") as HTMLInputElement | null;
const projectDateInput = document.getElementById("project-date-input") as HTMLInputElement | null;

// Open 'New Project' modal in Create mode
const newProjectBtn = document.getElementById("new-project-btn");
newProjectBtn?.addEventListener("click", () => {
    editingProjectId = null;
    projectForm?.reset();
    if (projectModalTitle) projectModalTitle.textContent = "New Project";
    if (projectSubmitBtn) projectSubmitBtn.textContent = "Create Project";
    if (projectCostInput) projectCostInput.value = "0";
    if (projectProgressInput) projectProgressInput.value = "25";
    toggleModal("new-project-modal", true);
});

// Open 'New Project' modal in Edit mode from Details Page
const editProjectBtn = document.getElementById("edit-project-btn");
editProjectBtn?.addEventListener("click", () => {
    const active = projectsManager.activeProject;
    if (!active) { return; }

    editingProjectId = active.id;
    if (projectModalTitle) projectModalTitle.textContent = "Edit Project";
    if (projectSubmitBtn) projectSubmitBtn.textContent = "Save Changes";

    if (projectNameInput) projectNameInput.value = active.name;
    if (projectDescInput) projectDescInput.value = active.description;
    if (projectRoleInput) projectRoleInput.value = active.userRole;
    if (projectStatusInput) projectStatusInput.value = active.status;
    if (projectCostInput) projectCostInput.value = String(active.cost ?? 0);
    if (projectProgressInput) projectProgressInput.value = String(Math.round((active.progress ?? 0) * 100));

    if (projectDateInput) {
        const d = new Date(active.finishDate);
        if (!isNaN(d.getTime())) {
            projectDateInput.value = d.toISOString().split("T")[0];
        }
    }

    toggleModal("new-project-modal", true);
});

// Cancel button listener closes project modal
const cancelProjectBtn = document.getElementById("cancel-btn");
cancelProjectBtn?.addEventListener("click", () => {
    editingProjectId = null;
    toggleModal("new-project-modal", false);
});

// Handle New / Edit Project Form Submission
if (projectForm) {
    projectForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const formData = new FormData(projectForm);

        const rawDate = formData.get("finishDate") as string;
        const parsedDate = rawDate ? new Date(rawDate) : new Date();
        const rawCost = Number(formData.get("cost") ?? 0);
        const rawProgress = Number(formData.get("progress") ?? 25);
        const clampedProgress = Math.min(100, Math.max(0, isNaN(rawProgress) ? 25 : rawProgress)) / 100;

        const projectData: IProject = {
            name: (formData.get("name") as string).trim(),
            description: (formData.get("description") as string).trim(),
            userRole: formData.get("userRole") as UserRole,
            status: formData.get("status") as ProjectStatus,
            finishDate: parsedDate,
            cost: isNaN(rawCost) ? 0 : rawCost,
            progress: clampedProgress,
        };

        try {
            if (editingProjectId) {
                projectsManager.updateProject(editingProjectId, projectData);
            } else {
                projectsManager.newProject(projectData);
            }

            editingProjectId = null;
            projectForm.reset();
            toggleModal("new-project-modal", false);
            applyProjectFilters();
        } catch (err: any) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            showErrorModal(errorMessage);
        }
    });
}

// Projects Search & Status Filter Bar
let currentProjectSearch = "";
let currentProjectStatus = "all";

const projectSearchInput = document.getElementById("project-search-input") as HTMLInputElement | null;
const clearSearchBtn = document.getElementById("clear-search-btn") as HTMLButtonElement | null;
const projectFilterPills = document.querySelectorAll("#project-filter-group .filter-pill");
const projectSortSelect = document.getElementById("project-sort-select") as HTMLSelectElement | null;

const resetProjectFilters = () => {
    currentProjectSearch = "";
    currentProjectStatus = "all";
    if (projectSearchInput) {
        projectSearchInput.value = "";
    }
    if (clearSearchBtn) {
        clearSearchBtn.style.display = "none";
    }
    projectFilterPills.forEach((p) => {
        if ((p as HTMLElement).dataset.statusFilter === "all") {
            p.classList.add("active");
        } else {
            p.classList.remove("active");
        }
    });
    applyProjectFilters();
};

const openNewProjectFromEmpty = () => {
    editingProjectId = null;
    projectForm?.reset();
    if (projectModalTitle) projectModalTitle.textContent = "New Project";
    if (projectSubmitBtn) projectSubmitBtn.textContent = "Create Project";
    if (projectCostInput) projectCostInput.value = "0";
    if (projectProgressInput) projectProgressInput.value = "25";
    if (projectStatusInput && currentProjectStatus !== "all") {
        projectStatusInput.value = currentProjectStatus.charAt(0).toUpperCase() + currentProjectStatus.slice(1);
    }
    toggleModal("new-project-modal", true);
};

const applyProjectFilters = () => {
    projectsManager.filterProjects(
        currentProjectSearch,
        currentProjectStatus,
        resetProjectFilters,
        openNewProjectFromEmpty
    );
};

// Input event listener for real-time search
projectSearchInput?.addEventListener("input", (e) => {
    currentProjectSearch = (e.target as HTMLInputElement).value;
    if (clearSearchBtn) {
        clearSearchBtn.style.display = currentProjectSearch.trim().length > 0 ? "inline-flex" : "none";
    }
    applyProjectFilters();
});

// Clear search button click
clearSearchBtn?.addEventListener("click", () => {
    if (projectSearchInput) {
        projectSearchInput.value = "";
    }
    currentProjectSearch = "";
    clearSearchBtn.style.display = "none";
    applyProjectFilters();
});

// Filter pill click handlers
projectFilterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
        projectFilterPills.forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        currentProjectStatus = (pill as HTMLElement).dataset.statusFilter || "all";
        applyProjectFilters();
    });
});

// Sort select change listener
projectSortSelect?.addEventListener("change", (e) => {
    const sortBy = (e.target as HTMLSelectElement).value;
    projectsManager.sortProjects(sortBy);
    applyProjectFilters();
});

// Lesson 3.9: Connect Import and Export buttons
const importBtn = document.getElementById("import-projects-btn");
importBtn?.addEventListener("click", () => projectsManager.importFromJSON());

const exportBtn = document.getElementById("export-projects-btn");
exportBtn?.addEventListener("click", () => {
    try {
        projectsManager.exportToJSON();
    } catch (err: any) {
        showErrorModal(err.message);
    }
});

const floatingExportBtn = document.getElementById("floating-export-btn");
floatingExportBtn?.addEventListener("click", () => {
    try {
        projectsManager.exportToJSON();
    } catch (err: any) {
        showErrorModal(err.message);
    }
});

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

navProjectsBtn?.addEventListener("click", showProjectsPage);
backToProjectsBtn?.addEventListener("click", showProjectsPage);

navUsersBtn?.addEventListener("click", () => {
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

// Delete Project Button from Details Page
const deleteProjectBtn = document.getElementById("delete-project-btn");
deleteProjectBtn?.addEventListener("click", () => {
    if (!projectsManager.activeProject) { return; }
    projectsManager.deleteProject(projectsManager.activeProject.id);
    projectsManager.activeProject = null;
    showProjectsPage();
});

// ============================================================================
// To-Do / BCF Tasks Management (Add, Edit, Toggle, Delete, Search)
// ============================================================================
let editingTodoId: number | null = null;
const todoForm = document.getElementById("todo-form") as HTMLFormElement | null;
const todoModalTitle = document.getElementById("todo-modal-title");
const todoTextInput = document.getElementById("todo-text-input") as HTMLInputElement | null;
const todoDateInput = document.getElementById("todo-date-input") as HTMLInputElement | null;
const todoStatusInput = document.getElementById("todo-status-input") as HTMLSelectElement | null;
const todoSearchInput = document.getElementById("todo-search-input") as HTMLInputElement | null;

// Open To-Do Modal in Create mode
const addTodoBtn = document.getElementById("add-todo-btn");
addTodoBtn?.addEventListener("click", () => {
    if (!projectsManager.activeProject) { return; }
    editingTodoId = null;
    todoForm?.reset();
    if (todoModalTitle) todoModalTitle.textContent = "New Task / BCF Issue";
    if (todoStatusInput) todoStatusInput.value = "pending";
    if (todoDateInput) todoDateInput.value = new Date().toISOString().split("T")[0];
    toggleModal("todo-modal", true);
});

// Open To-Do Modal in Edit mode when Edit icon is clicked on a task
projectsManager.onEditTodo = (todoId: number) => {
    const active = projectsManager.activeProject;
    if (!active) { return; }
    const targetTodo = active.todos.find((t) => t.id === todoId);
    if (!targetTodo) { return; }

    editingTodoId = todoId;
    if (todoModalTitle) todoModalTitle.textContent = "Edit Task / BCF Issue";
    if (todoTextInput) todoTextInput.value = targetTodo.text;
    if (todoStatusInput) {
        todoStatusInput.value = targetTodo.status || (targetTodo.completed ? "completed" : "pending");
    }
    toggleModal("todo-modal", true);
};

const cancelTodoBtn = document.getElementById("cancel-todo-btn");
cancelTodoBtn?.addEventListener("click", () => {
    editingTodoId = null;
    toggleModal("todo-modal", false);
});

todoForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const active = projectsManager.activeProject;
    if (!active || !todoTextInput) { return; }

    const text = todoTextInput.value.trim();
    if (!text) { return; }

    const rawDate = todoDateInput?.value ? new Date(todoDateInput.value) : new Date();
    const dateStr = isNaN(rawDate.getTime())
        ? new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })
        : rawDate.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
    const selectedStatus = (todoStatusInput?.value || "pending") as TodoStatus;
    const isCompleted = selectedStatus === "completed";

    if (editingTodoId !== null) {
        const existing = active.todos.find((t) => t.id === editingTodoId);
        if (existing) {
            existing.text = text;
            existing.date = dateStr;
            existing.status = selectedStatus;
            existing.completed = isCompleted;
        }
    } else {
        active.todos.unshift({
            id: Date.now(),
            text,
            date: dateStr,
            status: selectedStatus,
            completed: isCompleted,
        });
    }

    editingTodoId = null;
    todoForm.reset();
    toggleModal("todo-modal", false);
    projectsManager.renderTodos(active, todoSearchInput?.value || "");
});

todoSearchInput?.addEventListener("input", (e) => {
    if (!projectsManager.activeProject) { return; }
    const target = e.target as HTMLInputElement;
    projectsManager.renderTodos(projectsManager.activeProject, target.value);
});

// ============================================================================
// AEC Team / Users Page Management (Search, Filter, Add, Edit, Toggle, Delete)
// ============================================================================
const usersTableBody = document.getElementById("users-table-body");
const userSearchInput = document.getElementById("user-search-input") as HTMLInputElement | null;
const userFilterPills = document.querySelectorAll("#users-filter-group .filter-pill");
const userForm = document.getElementById("new-user-form") as HTMLFormElement | null;
const userModalTitle = document.getElementById("user-modal-title");
const userNameInput = document.getElementById("user-name-input") as HTMLInputElement | null;
const userEmailInput = document.getElementById("user-email-input") as HTMLInputElement | null;
const userRoleInput = document.getElementById("user-role-input") as HTMLSelectElement | null;
const userModelsInput = document.getElementById("user-models-input") as HTMLInputElement | null;
const userStatusInput = document.getElementById("user-status-input") as HTMLSelectElement | null;
const userDropdown = document.getElementById("user-actions-dropdown");

let currentUserSearch = "";
let currentUserRoleFilter = "all";
let activeUserRow: HTMLTableRowElement | null = null;
let editingUserRow: HTMLTableRowElement | null = null;

const getRoleBadgeClass = (role: string): string => {
    const r = role.toLowerCase();
    if (r.includes("arch")) return "role-arch";
    if (r.includes("eng")) return "role-eng";
    if (r.includes("coord")) return "role-bim";
    return "role-dev";
};

const getAvatarBadgeClass = (role: string): string => {
    const r = role.toLowerCase();
    if (r.includes("arch")) return "badge-orange";
    if (r.includes("eng")) return "badge-green";
    if (r.includes("coord")) return "badge-purple";
    return "badge-blue";
};

const getInitials = (name: string): string => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase() || "MB";
};

const applyUserFilters = () => {
    if (!usersTableBody) { return; }
    const rows = Array.from(usersTableBody.querySelectorAll("tr"));
    const allPill = document.querySelector("[data-role-filter='all']");
    if (allPill) {
        allPill.textContent = `All (${rows.length})`;
    }

    const q = currentUserSearch.toLowerCase().trim();
    rows.forEach((row) => {
        const text = (row.textContent || "").toLowerCase();
        const roleText = (row.querySelector(".role-badge")?.textContent || "").toLowerCase();

        const matchesSearch = !q || text.includes(q);
        let matchesRole = true;
        if (currentUserRoleFilter === "arch") {
            matchesRole = roleText.includes("arch");
        } else if (currentUserRoleFilter === "eng") {
            matchesRole = roleText.includes("eng");
        } else if (currentUserRoleFilter === "lead") {
            matchesRole = roleText.includes("lead") || roleText.includes("coord") || roleText.includes("dev");
        }

        (row as HTMLElement).style.display = (matchesSearch && matchesRole) ? "" : "none";
    });
};

userSearchInput?.addEventListener("input", (e) => {
    currentUserSearch = (e.target as HTMLInputElement).value;
    applyUserFilters();
});

userFilterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
        userFilterPills.forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        currentUserRoleFilter = (pill as HTMLElement).dataset.roleFilter || "all";
        applyUserFilters();
    });
});

// Wire 3-dots options button on a user table row
const bindUserRowOptions = (row: HTMLTableRowElement) => {
    const btn = row.querySelector(".user-options-btn") as HTMLButtonElement | null;
    if (!btn || !userDropdown) { return; }

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        activeUserRow = row;
        const rect = btn.getBoundingClientRect();
        userDropdown.style.display = "flex";
        userDropdown.style.top = `${Math.min(window.innerHeight - 140, rect.bottom + 6)}px`;
        userDropdown.style.left = `${Math.max(12, rect.right - 175)}px`;
    });
};

// Bind initial rows in #users-table-body
usersTableBody?.querySelectorAll("tr").forEach((row) => {
    bindUserRowOptions(row as HTMLTableRowElement);
});

// Close dropdown when clicking anywhere outside
document.addEventListener("click", () => {
    if (userDropdown) {
        userDropdown.style.display = "none";
    }
});

// Open New Member Modal in Create mode
const newUserBtn = document.getElementById("new-user-btn");
newUserBtn?.addEventListener("click", () => {
    editingUserRow = null;
    userForm?.reset();
    if (userModalTitle) userModalTitle.textContent = "New Team Member";
    toggleModal("new-user-modal", true);
});

const cancelUserBtn = document.getElementById("cancel-user-btn");
cancelUserBtn?.addEventListener("click", () => {
    editingUserRow = null;
    toggleModal("new-user-modal", false);
});

// Dropdown Action 1: Edit Member
document.getElementById("user-menu-edit")?.addEventListener("click", () => {
    if (!activeUserRow) { return; }
    editingUserRow = activeUserRow;

    const name = activeUserRow.querySelector(".user-name")?.textContent?.trim() || "";
    const email = activeUserRow.querySelector(".user-email")?.textContent?.trim() || "";
    const role = activeUserRow.querySelector(".role-badge")?.textContent?.trim() || "Lead Architect";
    const models = activeUserRow.querySelector(".user-models-cell")?.textContent?.trim() || "";
    const status = activeUserRow.querySelector(".status-indicator")?.textContent?.trim() || "Active";

    if (userModalTitle) userModalTitle.textContent = "Edit Team Member";
    if (userNameInput) userNameInput.value = name;
    if (userEmailInput) userEmailInput.value = email;
    if (userRoleInput) userRoleInput.value = role;
    if (userModelsInput) userModelsInput.value = models;
    if (userStatusInput) userStatusInput.value = status === "Active" ? "Active" : "Away";

    toggleModal("new-user-modal", true);
});

// Dropdown Action 2: Toggle Member Status
document.getElementById("user-menu-status")?.addEventListener("click", () => {
    if (!activeUserRow) { return; }
    const statusEl = activeUserRow.querySelector(".status-indicator");
    if (!statusEl) { return; }

    const isOnline = statusEl.classList.contains("status-online");
    if (isOnline) {
        statusEl.className = "status-indicator status-offline";
        statusEl.textContent = "Away";
    } else {
        statusEl.className = "status-indicator status-online";
        statusEl.textContent = "Active";
    }
});

// Dropdown Action 3: Delete Member
document.getElementById("user-menu-delete")?.addEventListener("click", () => {
    if (!activeUserRow) { return; }
    activeUserRow.remove();
    activeUserRow = null;
    applyUserFilters();
});

// Create or Update Member on Form Submit
userForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!usersTableBody) { return; }

    const name = userNameInput?.value.trim() || "New Member";
    const email = userEmailInput?.value.trim() || "member@bimpulse.com";
    const role = userRoleInput?.value || "Lead Architect";
    const models = userModelsInput?.value.trim() || "Default Project";
    const status = userStatusInput?.value || "Active";

    const initials = getInitials(name);
    const avatarClass = getAvatarBadgeClass(role);
    const roleClass = getRoleBadgeClass(role);
    const statusClass = status === "Active" ? "status-online" : "status-offline";

    const rowHTML = `
        <td>
            <div class="user-cell">
                <div class="user-avatar-circle ${avatarClass}">${initials}</div>
                <div>
                    <div class="user-name">${name}</div>
                    <div class="user-email">${email}</div>
                </div>
            </div>
        </td>
        <td><span class="role-badge ${roleClass}">${role}</span></td>
        <td class="user-models-cell">${models}</td>
        <td><span class="status-indicator ${statusClass}">${status}</span></td>
        <td style="text-align: right;">
            <button type="button" class="btn-icon user-options-btn" title="Options">
                <span class="material-icons-round">more_vert</span>
            </button>
        </td>
    `;

    if (editingUserRow) {
        editingUserRow.innerHTML = rowHTML;
        bindUserRowOptions(editingUserRow);
        editingUserRow = null;
    } else {
        const tr = document.createElement("tr");
        tr.innerHTML = rowHTML;
        bindUserRowOptions(tr);
        usersTableBody.appendChild(tr);
    }

    userForm.reset();
    toggleModal("new-user-modal", false);
    applyUserFilters();
});

// ==============================================================
// 🎬 LESSON 2.2 & 2.3: 3D VIEWER WITH MESHES, LIGHTS & CAMERA
// ==============================================================

// 1. Get reference to the viewer container in Project Details
const viewerContainer = document.getElementById("viewer-container") as HTMLElement;

// 2. Create the Scene (The Location / Set to shoot the video)
const scene = new THREE.Scene();

// 3. Configure the Perspective Camera (The Recording Device)
const viewerContainerDimensions = viewerContainer.getBoundingClientRect();
const aspectRatio = viewerContainerDimensions.width / viewerContainerDimensions.height;
const camera = new THREE.PerspectiveCamera(75, aspectRatio);

// 4. Create the Cameraman (WebGLRenderer)
const renderer = new THREE.WebGLRenderer();

// 5. Append the cameraman's monitor screen (domElement <canvas>) to the container
viewerContainer.appendChild(renderer.domElement);

// 6. Match renderer dimensions with viewer container
renderer.setSize(viewerContainerDimensions.width, viewerContainerDimensions.height);

// --- LESSON 2.3: ADDING ELEMENTS TO THE SCENE ---

// 7. Create a 3D Mesh: Geometry (Shape / Triangles) + Material (Appearance / Shaders)
const boxGeometry = new THREE.BoxGeometry();
const material = new THREE.MeshStandardMaterial();
const cube = new THREE.Mesh(boxGeometry, material);

// 8. Add Lighting (World starts in complete darkness)
const directionalLight = new THREE.DirectionalLight();
const ambientLight = new THREE.AmbientLight();

// 9. Add Mesh and Lights to the Scene
scene.add(cube, directionalLight, ambientLight);

// 10. Position the Camera (Move back on Z-axis so camera isn't inside the cube at 0,0,0)
camera.position.z = 5;

// 11. Render the Scene (Shot taken AFTER elements and lights are placed in the scene)
renderer.render(scene, camera);
