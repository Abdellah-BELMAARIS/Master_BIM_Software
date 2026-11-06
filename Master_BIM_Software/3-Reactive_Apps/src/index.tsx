// Module 03 — Section 3: Migrating to a React App
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { flushSync } from "react-dom";
import { Sidebar } from "./react-components/Sidebar";
import { ProjectsPage } from "./react-components/ProjectsPage";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "three/examples/jsm/libs/lil-gui.module.min.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { TodoStatus } from "./classes/Project";
import { ProjectsManager } from "./classes/ProjectsManager";

// --- LESSON 3.2, 3.3 & 3.4: MOUNT REACT ROOT & RENDER SIDEBAR + PROJECTSPAGE ---
const projectsManager = new ProjectsManager();

const showProjectsPage = () => {
    const projectsPage = document.getElementById("projects-page");
    const detailsPage = document.getElementById("project-details");
    const usersPage = document.getElementById("users-page");
    if (!projectsPage || !detailsPage) { return; }

    projectsPage.style.display = "flex";
    detailsPage.style.display = "none";
    if (usersPage) { usersPage.style.display = "none"; }

    document.getElementById("nav-projects-btn")?.classList.add("active");
    document.getElementById("nav-users-btn")?.classList.remove("active");
};

const showUsersPage = () => {
    const projectsPage = document.getElementById("projects-page");
    const detailsPage = document.getElementById("project-details");
    const usersPage = document.getElementById("users-page");
    if (!projectsPage || !detailsPage || !usersPage) { return; }

    projectsPage.style.display = "none";
    detailsPage.style.display = "none";
    usersPage.style.display = "flex";

    document.getElementById("nav-users-btn")?.classList.add("active");
    document.getElementById("nav-projects-btn")?.classList.remove("active");
};

const appRoot = document.getElementById("app");
if (appRoot) {
    const root = ReactDOM.createRoot(appRoot);
    flushSync(() => {
        root.render(
            <>
                <Sidebar
                    activeTab="projects"
                    onNavigate={(tab) => {
                        if (tab === "projects") {
                            showProjectsPage();
                        } else {
                            showUsersPage();
                        }
                    }}
                />
                <ProjectsPage projectsManager={projectsManager} />
            </>
        );
    });
}

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

// Form input elements for Edit Project trigger from Details Page
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
const projectModelInput = document.getElementById("project-model-input") as HTMLSelectElement | null;

// Open 'New Project' modal in Edit mode from Details Page (submission is handled inside ProjectsPage.tsx)
const editProjectBtn = document.getElementById("edit-project-btn");
editProjectBtn?.addEventListener("click", () => {
    const active = projectsManager.activeProject;
    if (!active || !projectForm) { return; }

    projectForm.dataset.editingProjectId = active.id;
    if (projectModalTitle) projectModalTitle.textContent = "Edit Project";
    if (projectSubmitBtn) projectSubmitBtn.textContent = "Save Changes";

    if (projectNameInput) projectNameInput.value = active.name;
    if (projectDescInput) projectDescInput.value = active.description;
    if (projectRoleInput) projectRoleInput.value = active.userRole;
    if (projectStatusInput) projectStatusInput.value = active.status;
    if (projectCostInput) projectCostInput.value = String(active.cost ?? 0);
    if (projectProgressInput) projectProgressInput.value = String(Math.round((active.progress ?? 0) * 100));
    if (projectModelInput) projectModelInput.value = active.modelType || "cube";

    if (projectDateInput) {
        const d = new Date(active.finishDate);
        if (!isNaN(d.getTime())) {
            projectDateInput.value = d.toISOString().split("T")[0];
        }
    }

    toggleModal("new-project-modal", true);
});

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
    delete projectForm?.dataset.editingProjectId;
    projectForm?.reset();
    if (projectModalTitle) projectModalTitle.textContent = "New Project";
    if (projectSubmitBtn) projectSubmitBtn.textContent = "Accept";
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

// Lesson 4.1 Assignment & SPA Navigation: Switch between Projects, Details, and Users pages
const backToProjectsBtn = document.getElementById("back-to-projects-btn");
backToProjectsBtn?.addEventListener("click", showProjectsPage);

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
// 🏛️ PRO BIM 3D VIEWER (Lessons 2.2 & 2.3 Upgraded with CAD Pro Polish)
// ==============================================================

// 1. Get reference to viewer container and clear placeholder elements
const viewerContainer = document.getElementById("viewer-container") as HTMLElement;
const placeholder = viewerContainer?.querySelector(".viewer-placeholder");
if (placeholder) {
    placeholder.remove();
}

if (viewerContainer) {
    // 2. Create the 3D Scene (World Container)
    const scene = new THREE.Scene();

    // 3. Configure Perspective Camera for the Mechanical Model
    const camera = new THREE.PerspectiveCamera(60);
    camera.position.set(14, 10, 18); // Elevated angle viewing the mechanical gear
    camera.lookAt(0, 6, 0);

    // 4. Create WebGLRenderer with Antialiasing & Transparent Background (Lesson 2.5)
    const renderer = new THREE.WebGLRenderer({
        alpha: true,     // Transparent background allows CAD engineering grid to show through
        antialias: true, // Smooths out jagged, pixelated edges
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.outline = "none";
    viewerContainer.appendChild(renderer.domElement);

    // --- LESSON 2.5: MAKING THE VIEWER RESPONSIVE (DRY REFACTORING) ---
    const resizeViewer = () => {
        const containerDimensions = viewerContainer.getBoundingClientRect();
        if (containerDimensions.width === 0 || containerDimensions.height === 0) {
            return;
        }
        renderer.setSize(containerDimensions.width, containerDimensions.height);
        camera.aspect = containerDimensions.width / containerDimensions.height;
        camera.updateProjectionMatrix(); // Tell Three.js to recompute projection matrix
    };

    window.addEventListener("resize", resizeViewer);
    // ResizeObserver automatically detects when #project-details becomes visible or changes width
    const viewerResizeObserver = new ResizeObserver(() => resizeViewer());
    viewerResizeObserver.observe(viewerContainer);
    resizeViewer(); // Initialize initial size and aspect ratio without code duplication

    // 5. Create 3D Architectural Cube (Project 1 & 3 Model)
    const boxGeometry = new THREE.BoxGeometry(2, 2, 2);
    const cubeMaterial = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.35,
        metalness: 0.2,
    });
    const cube = new THREE.Mesh(boxGeometry, cubeMaterial);
    cube.position.y = 1;

    const edges = new THREE.EdgesGeometry(boxGeometry);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0284c7, linewidth: 2 });
    cube.add(new THREE.LineSegments(edges, lineMaterial));
    scene.add(cube);

    // 6. Ground Coordinate Grid & 3D Axes Helper (Lesson 2.6)
    const axes = new THREE.AxesHelper(6); // Visual representation of world origin (0,0,0)

    const grid = new THREE.GridHelper(30, 30);
    const gridMaterial = grid.material as THREE.LineBasicMaterial;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.4;
    gridMaterial.color = new THREE.Color(0x808080);
    grid.position.y = 0; // World ground floor

    // 7. Studio 3-Point Architectural Lighting (Lesson 2.3 & 2.4)
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(15, 25, 20);

    const fillLight = new THREE.DirectionalLight(0x93c5fd, 0.9);
    fillLight.position.set(-15, 10, -10);

    const ambientLight = new THREE.AmbientLight(0xffffff);
    ambientLight.intensity = 0.5;

    // Lesson 2.6 Assignment: DirectionalLightHelper
    const directionalLightHelper = new THREE.DirectionalLightHelper(keyLight, 2);
    directionalLightHelper.visible = false; // Hidden by default for clean view

    // 8. Add Base Helpers and Lights to the Scene
    scene.add(grid, axes, keyLight, fillLight, ambientLight, directionalLightHelper);

    // 9. OrbitControls (Lesson 2.4)
    // Attach OrbitControls to renderer.domElement (NOT viewerContainer) so it never intercepts clicks/wheel events on lil-gui or HUD buttons!
    const cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.enableDamping = true; // Pro CAD smooth inertia damping
    cameraControls.dampingFactor = 0.05;

    // --- LESSON 2.6 & 2.7: MULTI-PROJECT DYNAMIC 3D VIEWER & CONTROLS HUD ---
    let gui: GUI | null = null;
    let gearMesh: THREE.Group | null = null;
    let gearDefaultPos = new THREE.Vector3(0, 6.07, 0);
    const viewerState = {
        autoRotate: false,
        showBoundingBox: false,
    };

    const boundingBoxHelper = new THREE.BoxHelper(cube, 0x38bdf8);
    boundingBoxHelper.visible = false;
    scene.add(boundingBoxHelper);

    // Fast PBR material for the Mechanical Gear so Color, Wireframe, Metalness & Roughness work live
    const gearPbrMaterial = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.85,
        roughness: 0.25,
    });

    // Update 3D model, camera viewpoint, and Controls card based on selected project
    const updateViewerForProject = (project: any, resetCameraView: boolean = true) => {
        if (!project) { return; }

        if (gui) {
            gui.destroy();
        }
        gui = new GUI({
            container: viewerContainer,
            title: "Viewer Options",
            width: 280,
        });
        gui.domElement.style.position = "absolute";
        gui.domElement.style.top = "1rem";
        gui.domElement.style.right = "1rem";
        gui.domElement.style.zIndex = "25";

        const isGear = project.modelType === "gear" || project.name.toLowerCase().includes("gear");

        if (isGear) {
            // Show Gear Model, Hide Cube
            cube.visible = false;
            if (gearMesh) {
                gearMesh.visible = true;
                boundingBoxHelper.setFromObject(gearMesh);
            }

            if (resetCameraView) {
                cameraControls.target.set(0, 6, 0);
                camera.position.set(14, 10, 18);
                cameraControls.update();
            }

            // 1. Gear Controls Folder (Open)
            const gearFolder = gui.addFolder("Mechanical Gear Controls");
            gearFolder.open();

            if (gearMesh) {
                const posXCtrl = gearFolder.add(gearMesh.position, "x", -20, 20, 0.5).name("Position X").onChange(() => boundingBoxHelper.update());
                const posYCtrl = gearFolder.add(gearMesh.position, "y", 0, 25, 0.5).name("Position Y").onChange(() => boundingBoxHelper.update());
                const posZCtrl = gearFolder.add(gearMesh.position, "z", -20, 20, 0.5).name("Position Z").onChange(() => boundingBoxHelper.update());
                const rotYCtrl = gearFolder.add(gearMesh.rotation, "y", -Math.PI, Math.PI, 0.05).name("Rotate Y").listen();
                const scaleCtrl = gearFolder.add(gearMesh.scale, "x", 0.2, 3, 0.1).name("Scale").onChange((s: number) => {
                    gearMesh!.scale.set(s, s, s);
                    boundingBoxHelper.update();
                });
                const visCtrl = gearFolder.add(gearMesh, "visible").name("Visible");
                const colorCtrl = gearFolder.addColor(gearPbrMaterial, "color").name("Gear Color").onChange((c: THREE.Color) => {
                    gearMesh?.traverse((child) => {
                        if ((child as THREE.Mesh).isMesh) {
                            const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                            if (mat && mat.color) { mat.color.copy(c); }
                        }
                    });
                });
                const wireCtrl = gearFolder.add(gearPbrMaterial, "wireframe").name("Wireframe").onChange((w: boolean) => {
                    gearMesh?.traverse((child) => {
                        if ((child as THREE.Mesh).isMesh) {
                            const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                            if (mat) { mat.wireframe = w; }
                        }
                    });
                });
                const rotToggleCtrl = gearFolder.add(viewerState, "autoRotate").name("Auto-Rotate");
                gearFolder.add({
                    resetGear: () => {
                        gearMesh!.position.copy(gearDefaultPos);
                        gearMesh!.rotation.set(0, 0, 0);
                        gearMesh!.scale.set(1, 1, 1);
                        gearMesh!.visible = true;
                        gearPbrMaterial.color.setHex(0x94a3b8);
                        gearPbrMaterial.wireframe = false;
                        gearMesh?.traverse((child) => {
                            if ((child as THREE.Mesh).isMesh) {
                                const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                                if (mat) {
                                    mat.color.setHex(0x94a3b8);
                                    mat.wireframe = false;
                                }
                            }
                        });
                        viewerState.autoRotate = false;
                        posXCtrl.updateDisplay();
                        posYCtrl.updateDisplay();
                        posZCtrl.updateDisplay();
                        rotYCtrl.updateDisplay();
                        scaleCtrl.updateDisplay();
                        visCtrl.updateDisplay();
                        colorCtrl.updateDisplay();
                        wireCtrl.updateDisplay();
                        rotToggleCtrl.updateDisplay();
                        boundingBoxHelper.update();
                    }
                }, "resetGear").name("Reset Model");
            } else {
                const loadingObj = { status: "Loading 3D Model..." };
                gearFolder.add(loadingObj, "status").name("Status");
            }
        } else {
            // Show Cube Model, Hide Gear
            cube.visible = true;
            if (gearMesh) {
                gearMesh.visible = false;
            }
            boundingBoxHelper.setFromObject(cube);

            if (resetCameraView) {
                cameraControls.target.set(0, 1, 0);
                camera.position.set(4, 3.5, 5);
                cameraControls.update();
            }

            // 1. Cube Controls Folder (Open)
            const cubeFolder = gui.addFolder("Cube Model Controls");
            cubeFolder.open();

            const posXCtrl = cubeFolder.add(cube.position, "x", -10, 10, 0.1).name("Position X").onChange(() => boundingBoxHelper.update());
            const posYCtrl = cubeFolder.add(cube.position, "y", 0, 10, 0.1).name("Position Y").onChange(() => boundingBoxHelper.update());
            const posZCtrl = cubeFolder.add(cube.position, "z", -10, 10, 0.1).name("Position Z").onChange(() => boundingBoxHelper.update());
            const rotYCtrl = cubeFolder.add(cube.rotation, "y", -Math.PI, Math.PI, 0.05).name("Rotate Y").listen();
            const scaleCtrl = cubeFolder.add(cube.scale, "x", 0.5, 3, 0.1).name("Scale").onChange((s: number) => {
                cube.scale.set(s, s, s);
                boundingBoxHelper.update();
            });
            const visCtrl = cubeFolder.add(cube, "visible").name("Visible");
            const colorCtrl = cubeFolder.addColor(cubeMaterial, "color").name("Cube Color");
            const wireCtrl = cubeFolder.add(cubeMaterial, "wireframe").name("Wireframe");
            const rotToggleCtrl = cubeFolder.add(viewerState, "autoRotate").name("Auto-Rotate");
            cubeFolder.add({
                resetCube: () => {
                    cube.position.set(0, 1, 0);
                    cube.rotation.set(0, 0, 0);
                    cube.scale.set(1, 1, 1);
                    cube.visible = true;
                    cubeMaterial.color.setHex(0x38bdf8);
                    cubeMaterial.wireframe = false;
                    viewerState.autoRotate = false;
                    posXCtrl.updateDisplay();
                    posYCtrl.updateDisplay();
                    posZCtrl.updateDisplay();
                    rotYCtrl.updateDisplay();
                    scaleCtrl.updateDisplay();
                    visCtrl.updateDisplay();
                    colorCtrl.updateDisplay();
                    wireCtrl.updateDisplay();
                    rotToggleCtrl.updateDisplay();
                    boundingBoxHelper.update();
                }
            }, "resetCube").name("Reset Model");
        }

        // 2. CAD Grid & Helpers Folder (Open)
        const helpersFolder = gui.addFolder("CAD Grid & Helpers");
        helpersFolder.open();
        helpersFolder.add(grid, "visible").name("Ground Grid");
        helpersFolder.add(axes, "visible").name("Origin Axes");
        helpersFolder.add(viewerState, "showBoundingBox").name("Bounding Box").onChange((v: boolean) => {
            boundingBoxHelper.visible = v;
            boundingBoxHelper.update();
        });
        helpersFolder.add(directionalLightHelper, "visible").name("Light Ray Helper");

        // 3. Studio Lighting Folder (Closed by default)
        const lightFolder = gui.addFolder("Studio Lighting");
        lightFolder.close();
        lightFolder.add(keyLight, "intensity", 0, 5, 0.1).name("Key Light");
        lightFolder.addColor(keyLight, "color").name("Key Color");
        lightFolder.add(keyLight.position, "x", -30, 30, 1).name("Light X").onChange(() => directionalLightHelper.update());
        lightFolder.add(keyLight.position, "y", 0, 40, 1).name("Light Y").onChange(() => directionalLightHelper.update());
        lightFolder.add(keyLight.position, "z", -30, 30, 1).name("Light Z").onChange(() => directionalLightHelper.update());
        lightFolder.add(ambientLight, "intensity", 0, 2, 0.05).name("Ambient Light");

        // 4. Camera View Controls (Preset CAD Views)
        const cameraFolder = gui.addFolder("Camera View");
        cameraFolder.close();
        cameraFolder.add({
            isoView: () => {
                if (isGear) {
                    cameraControls.target.set(0, 6, 0);
                    camera.position.set(14, 10, 18);
                } else {
                    cameraControls.target.set(0, 1, 0);
                    camera.position.set(4, 3.5, 5);
                }
                cameraControls.update();
            }
        }, "isoView").name("Isometric View");
        cameraFolder.add({
            topView: () => {
                if (isGear) {
                    cameraControls.target.set(0, 6, 0);
                    camera.position.set(0, 26, 0.01);
                } else {
                    cameraControls.target.set(0, 1, 0);
                    camera.position.set(0, 10, 0.01);
                }
                cameraControls.update();
            }
        }, "topView").name("Top Plan View");
        cameraFolder.add({
            frontView: () => {
                if (isGear) {
                    cameraControls.target.set(0, 6, 0);
                    camera.position.set(0, 6, 22);
                } else {
                    cameraControls.target.set(0, 1, 0);
                    camera.position.set(0, 1, 7);
                }
                cameraControls.update();
            }
        }, "frontView").name("Front Elevation");
        cameraFolder.add({
            resetCamera: () => {
                if (isGear) {
                    cameraControls.target.set(0, 6, 0);
                    camera.position.set(14, 10, 18);
                } else {
                    cameraControls.target.set(0, 1, 0);
                    camera.position.set(4, 3.5, 5);
                }
                cameraControls.update();
            }
        }, "resetCamera").name("Reset View");

        gui.open();
    };

    // Register callback so clicking a project card in the dashboard switches the 3D model and controls
    projectsManager.onProjectSelected = (project) => {
        resizeViewer();
        updateViewerForProject(project);
    };

    // Initialize 3D view and controls for the initially active project
    if (projectsManager.activeProject) {
        updateViewerForProject(projectsManager.activeProject);
    }

    // --- LESSON 2.7: LOADING EXTERNAL GEOMETRY (OBJLoader & MTLLoader) ---
    const objLoader = new OBJLoader();
    const mtlLoader = new MTLLoader();
    objLoader.setPath("/Gear/");
    mtlLoader.setPath("/Gear/");

    objLoader.load(
        "Gear1.obj",
        (mesh) => {
            gearMesh = mesh;
            mesh.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    (child as THREE.Mesh).material = gearPbrMaterial;
                    (child as THREE.Mesh).castShadow = true;
                    (child as THREE.Mesh).receiveShadow = true;
                }
            });

            // Center gear with Bounding Box at world origin (Lesson 2.7) and round to avoid 0.0003999 float precision noise
            const box = new THREE.Box3().setFromObject(mesh);
            const center = box.getCenter(new THREE.Vector3());
            mesh.position.sub(center); // Align center with (0,0,0)
            const halfHeight = (box.max.y - box.min.y) / 2;
            mesh.position.set(
                Math.round(mesh.position.x * 100) / 100,
                Math.round((mesh.position.y + halfHeight) * 100) / 100,
                Math.round(mesh.position.z * 100) / 100
            );
            gearDefaultPos.copy(mesh.position);

            scene.add(mesh);

            // Update view if current project is Gear
            if (projectsManager.activeProject) {
                updateViewerForProject(projectsManager.activeProject);
            } else {
                mesh.visible = false;
            }

            // Preload MTL definition while keeping gearPbrMaterial connected to live GUI controls
            mtlLoader.load(
                "Gear1.mtl",
                (materials) => {
                    materials.preload();
                    objLoader.setMaterials(materials);
                },
                undefined,
                (err) => console.warn("MTL load notice:", err)
            );
        },
        undefined,
        (err) => console.error("OBJ load error:", err)
    );
    cameraControls.update();

    // 10. Continuous 60 FPS Render Loop (Lesson 2.4)
    // requestAnimationFrame executes before the browser's next screen repaint
    const renderScene = () => {
        if (viewerState.autoRotate) {
            if (cube.visible) {
                cube.rotation.y += 0.01;
                if (cube.rotation.y > Math.PI) { cube.rotation.y = -Math.PI; }
            }
            if (gearMesh && gearMesh.visible) {
                gearMesh.rotation.y += 0.01;
                if (gearMesh.rotation.y > Math.PI) { gearMesh.rotation.y = -Math.PI; }
            }
        }
        if (boundingBoxHelper.visible) {
            boundingBoxHelper.update();
        }
        cameraControls.update(); // Update camera position according to user mouse gestures
        renderer.render(scene, camera);
        requestAnimationFrame(renderScene);
    };
    renderScene(); // Start continuous recording loop
}
