// =========================================================================
// 1. Fundamental Data Types & Persistent Storage Keys (Lesson 2.1 Concepts)
// =========================================================================
// String: Identifier for persistent storage in browser localStorage
const STORAGE_PROJECTS_KEY = "bim_pulse_projects_data_v1";
const STORAGE_USERS_KEY = "bim_pulse_users_data_v1";

// Object: Key-value data structure holding descriptive information about BIM projects
const defaultProjects = {
    "hospital-center": {
        id: "hospital-center",            // String
        name: "Hospital Center",          // String
        desc: "Community hospital located at downtown",
        initials: "HC",
        badgeColor: "badge-orange",
        status: "Active",
        role: "Engineer",
        cost: "$ 2'000.000",
        progress: "43%",
        finishDate: "2023-05-01",
        todos: [                          // Array of Objects
            { id: 1, text: "Verify structural seismic joints in Block B", date: "Fri, 20 Sep", completed: false },
            { id: 2, text: "Review HVAC mechanical room collision report in IFC viewer", date: "Tue, 24 Sep", completed: false },
            { id: 3, text: "Approve electrical distribution schematics with municipal engineer", date: "Mon, 30 Sep", completed: true }
        ]
    },
    "default-project": {
        id: "default-project",
        name: "Default Project",
        desc: "This is just a default project. You may delete it if you want.",
        initials: "DE",
        badgeColor: "badge-green",
        status: "Active",
        role: "Architect",
        cost: "$ 0",
        progress: "0%",
        finishDate: "2024-01-15",
        todos: [
            { id: 4, text: "Configure initial BIM model coordinate origin (EPSG:4326)", date: "Mon, 15 Jan", completed: false },
            { id: 5, text: "Set up project IFC classification schema (IfcWall, IfcSlab)", date: "Thu, 18 Jan", completed: true }
        ]
    },
    "urban-oasis-park": {
        id: "urban-oasis-park",
        name: "Urban Oasis Park",
        desc: "City park with green spaces and community events.",
        initials: "UR",
        badgeColor: "badge-purple",
        status: "Pending",
        role: "Architect",
        cost: "$ 1'200.000",
        progress: "15%",
        finishDate: "2024-08-30",
        todos: [
            { id: 6, text: "Perform topographic laser grading & soil permeability test", date: "Wed, 10 Jul", completed: false },
            { id: 7, text: "Draft sustainable landscape stormwater runoff masterplan", date: "Fri, 19 Jul", completed: false }
        ]
    },
    "techhub-innovation": {
        id: "techhub-innovation",
        name: "TechHub Innovation",
        desc: "Cutting-edge technology center and research labs.",
        initials: "TE",
        badgeColor: "badge-green",
        status: "Active",
        role: "Developer",
        cost: "$ 3'500.000",
        progress: "72%",
        finishDate: "2023-11-20",
        todos: [
            { id: 8, text: "Finalize server room cooling infrastructure & backup genset", date: "Mon, 5 Aug", completed: true },
            { id: 9, text: "Review fiber-optic cable routing with MEP engineering lead", date: "Wed, 14 Aug", completed: false },
            { id: 10, text: "Conduct acoustic reverberation testing in main auditorium", date: "Fri, 23 Aug", completed: false }
        ]
    },
    "sustainable-housing": {
        id: "sustainable-housing",
        name: "Sustainable Housing",
        desc: "Eco-friendly homes community with net-zero energy design.",
        initials: "SU",
        badgeColor: "badge-green",
        status: "Active",
        role: "Engineer",
        cost: "$ 1'850.000",
        progress: "60%",
        finishDate: "2024-04-10",
        todos: [
            { id: 11, text: "Calculate solar PV rooftop tilt angle & annual kWh yield", date: "Thu, 2 May", completed: true },
            { id: 12, text: "Inspect rainwater harvesting cistern waterproofing membranes", date: "Tue, 14 May", completed: false }
        ]
    },
    "heritage-restoration": {
        id: "heritage-restoration",
        name: "Heritage Restoration",
        desc: "Reviving historic landmark with seismic retrofitting.",
        initials: "HE",
        badgeColor: "badge-magenta",
        status: "Pending",
        role: "Architect",
        cost: "$ 950.000",
        progress: "25%",
        finishDate: "2024-12-05",
        todos: [
            { id: 13, text: "Laser scan facade stonework for photogrammetry point-cloud", date: "Wed, 12 Jun", completed: true },
            { id: 14, text: "Obtain municipal historic landmark preservation board permits", date: "Mon, 24 Jun", completed: false }
        ]
    },
    "educational-outreach": {
        id: "educational-outreach",
        name: "Educational Outreach",
        desc: "Modern educational facility empowering underserved students.",
        initials: "ED",
        badgeColor: "badge-blue",
        status: "Finished",
        role: "Developer",
        cost: "$ 2'100.000",
        progress: "100%",
        finishDate: "2023-03-15",
        todos: [
            { id: 15, text: "Final sign-off on sprinkler & fire suppression safety systems", date: "Fri, 10 Mar", completed: true },
            { id: 16, text: "Handover BIM digital twin & operational manuals to client", date: "Wed, 15 Mar", completed: true }
        ]
    }
};

const defaultUsers = [
    {
        id: "user-1",
        name: "Abdellah Belmaaris",
        email: "a.belmaaris@bimpulse.com",
        initials: "AB",
        avatarColor: "badge-blue",
        role: "Full-Stack Dev",
        roleType: "Developer",
        projects: "Hospital Center, Urban Oasis",
        status: "Active"
    },
    {
        id: "user-2",
        name: "Juan Brunetta",
        email: "j.brunetta@thatopen.com",
        initials: "JB",
        avatarColor: "badge-orange",
        role: "Lead Architect",
        roleType: "Architect",
        projects: "Hospital Center, TechHub",
        status: "Active"
    },
    {
        id: "user-3",
        name: "Valeria Alarcon",
        email: "v.alarcon@thatopen.com",
        initials: "VA",
        avatarColor: "badge-green",
        role: "Structural Engineer",
        roleType: "Engineer",
        projects: "Sustainable Housing",
        status: "Active"
    },
    {
        id: "user-4",
        name: "Sarah Connor",
        email: "s.connor@bimpulse.com",
        initials: "SC",
        avatarColor: "badge-purple",
        role: "BIM Coordinator",
        roleType: "BIM Coordinator",
        projects: "Heritage Restoration",
        status: "Away"
    }
];

// Helper functions (reusable set of instructions) for localStorage persistence
function loadProjects() {
    const raw = localStorage.getItem(STORAGE_PROJECTS_KEY);
    if (raw) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.error("Failed to parse stored projects", e);
        }
    }
    return JSON.parse(JSON.stringify(defaultProjects));
}

function saveProjects() {
    localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projectsData));
}

function loadUsers() {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) {
        try {
            return JSON.parse(raw);
        } catch (e) {
            console.error("Failed to parse stored users", e);
        }
    }
    return JSON.parse(JSON.stringify(defaultUsers));
}

function saveUsers() {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(usersData));
}

// Active State
let projectsData = loadProjects();
let usersData = loadUsers();
let currentFilter = "all";

// =========================================================================
// 2. DOM Elements Referencing (Lesson 2.1: getElementById Method)
// =========================================================================
// The `document` object provides access to the DOM.
// `document.getElementById(elementId: string): HTMLElement | null`
const pages = {
    projects: document.getElementById("projects-page"),
    details: document.getElementById("project-details"),
    users: document.getElementById("users-page")
};

const navProjects = document.getElementById("nav-projects-btn");
const navUsers = document.getElementById("nav-users-btn");
let currentProjectId = Object.keys(projectsData)[0] || "hospital-center";
let isEditingProject = false;

function navigateTo(targetPage) {
    Object.values(pages).forEach(page => {
        if (page) page.style.display = "none";
    });

    if (pages[targetPage]) {
        pages[targetPage].style.display = "flex";
    }

    if (navProjects) navProjects.classList.toggle("active", targetPage === "projects" || targetPage === "details");
    if (navUsers) navUsers.classList.toggle("active", targetPage === "users");
}

if (navProjects) navProjects.addEventListener("click", () => navigateTo("projects"));
if (navUsers) navUsers.addEventListener("click", () => navigateTo("users"));

// =========================================================================
// 3. Render Projects Grid (Dynamic & Persistent)
// =========================================================================
const projectsListEl = document.getElementById("projects-list");

function renderProjectsGrid() {
    if (!projectsListEl) return;
    projectsListEl.innerHTML = "";

    const projects = Object.values(projectsData);
    if (projects.length === 0) {
        projectsListEl.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 4rem 1rem; text-align: center; color: var(--text-secondary);">
                <span class="material-icons-round" style="font-size: 3rem; opacity: 0.4;">apartment</span>
                <p style="margin-top: 0.75rem; font-size: 1rem;">No projects yet. Click '+ New Project' to create your first BIM project!</p>
            </div>
        `;
        return;
    }

    projects.forEach(proj => {
        const card = document.createElement("article");
        card.className = "project-card";
        card.dataset.projectId = proj.id;
        card.style.cursor = "pointer";
        card.title = `Click to view ${proj.name} details`;
        card.innerHTML = `
            <div class="card-header">
                <div class="card-avatar ${proj.badgeColor}">${proj.initials}</div>
                <div class="card-title-group">
                    <h3>${proj.name}</h3>
                    <p>${proj.desc}</p>
                </div>
            </div>
            <div class="card-details">
                <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span class="detail-value">${proj.status}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Role</span>
                    <span class="detail-value">${proj.role}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Cost</span>
                    <span class="detail-value">${proj.cost}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Estimated Progress</span>
                    <span class="detail-value">${proj.progress}</span>
                </div>
            </div>
        `;

        card.addEventListener("click", () => populateProjectDetails(proj.id));
        projectsListEl.appendChild(card);
    });
}

// =========================================================================
// 4. Render To-Dos & Project Details
// =========================================================================
const todosList = document.getElementById("todos-list");
const addTodoBtn = document.getElementById("add-todo-btn");
const todoSearchInput = document.getElementById("todo-search-input");
const deleteProjectBtn = document.getElementById("delete-project-btn");

function renderTodos(todos) {
    if (!todosList) return;
    todosList.innerHTML = "";

    if (!todos || todos.length === 0) {
        todosList.innerHTML = `<p style="color: var(--text-secondary); font-size: 0.85rem; padding: 1rem 0; text-align: center;">No To-Dos for this project yet. Click '+' to add one!</p>`;
        return;
    }

    todos.forEach(todo => {
        const item = document.createElement("div");
        item.className = `todo-card-item ${todo.completed ? 'completed' : ''}`;
        item.title = "Click to toggle completion";
        item.innerHTML = `
            <div class="todo-card-left">
                <div class="todo-icon-box">
                    <span class="material-icons-round">${todo.completed ? 'check_circle' : 'construction'}</span>
                </div>
                <p class="todo-desc">${todo.text}</p>
            </div>
            <span class="todo-date-tag">${todo.date}</span>
        `;

        item.addEventListener("click", () => {
            todo.completed = !todo.completed;
            saveProjects();
            renderTodos(projectsData[currentProjectId].todos);
        });

        todosList.appendChild(item);
    });
}

function populateProjectDetails(projectId) {
    const proj = projectsData[projectId];
    if (!proj) return;

    currentProjectId = projectId;

    // Details Header
    const pageTitle = document.getElementById("details-page-title");
    const pageDesc = document.getElementById("details-page-desc");
    if (pageTitle) pageTitle.textContent = proj.name;
    if (pageDesc) pageDesc.textContent = proj.desc;

    // Details Card Top
    const detailsAvatar = document.getElementById("details-avatar");
    const detailsCardTitle = document.getElementById("details-card-title");
    const detailsCardDesc = document.getElementById("details-card-desc");
    const detailsStatus = document.getElementById("details-status");
    const detailsCost = document.getElementById("details-cost");
    const detailsRole = document.getElementById("details-role");
    const detailsDate = document.getElementById("details-date");
    const detailsFill = document.getElementById("details-progress-fill");

    if (detailsAvatar) {
        detailsAvatar.textContent = proj.initials;
        detailsAvatar.className = `card-avatar-circle ${proj.badgeColor}`;
    }
    if (detailsCardTitle) detailsCardTitle.textContent = proj.name;
    if (detailsCardDesc) detailsCardDesc.textContent = proj.desc;
    if (detailsStatus) detailsStatus.textContent = proj.status;
    if (detailsCost) detailsCost.textContent = proj.cost;
    if (detailsRole) detailsRole.textContent = proj.role;
    if (detailsDate) detailsDate.textContent = proj.finishDate;

    if (detailsFill) {
        detailsFill.style.width = proj.progress;
        detailsFill.textContent = proj.progress;
    }

    renderTodos(proj.todos);
    navigateTo("details");
}

// Add To-Do
if (addTodoBtn) {
    addTodoBtn.addEventListener("click", () => {
        const currentProj = projectsData[currentProjectId];
        if (!currentProj) return;

        const text = prompt(`Enter new To-Do task for "${currentProj.name}":`);
        if (!text || text.trim() === "") return;

        const now = new Date();
        const options = { weekday: 'short', day: 'numeric', month: 'short' };
        const dateStr = now.toLocaleDateString('en-US', options);

        currentProj.todos.unshift({
            id: Date.now(),
            text: text.trim(),
            date: dateStr,
            completed: false
        });

        saveProjects();
        renderTodos(currentProj.todos);
    });
}

// Live Search To-Dos
if (todoSearchInput) {
    todoSearchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        const currentProj = projectsData[currentProjectId];
        if (!currentProj) return;

        const filtered = currentProj.todos.filter(t => t.text.toLowerCase().includes(query));
        renderTodos(filtered);
    });
}

// Delete Project Button
if (deleteProjectBtn) {
    deleteProjectBtn.addEventListener("click", () => {
        const proj = projectsData[currentProjectId];
        if (!proj) return;

        if (confirm(`Are you sure you want to delete project "${proj.name}"? This action cannot be undone.`)) {
            delete projectsData[currentProjectId];
            saveProjects();
            renderProjectsGrid();
            navigateTo("projects");
        }
    });
}

// =========================================================================
// 5. Project Modal (Create & Edit Project)
// =========================================================================
const projectModal = document.getElementById("new-project-modal");
const projectForm = document.getElementById("new-project-form");
const newProjectBtn = document.getElementById("new-project-btn");
const cancelProjectBtn = document.getElementById("cancel-btn");
const projectModalTitle = document.getElementById("project-modal-title");
const projectSubmitBtn = document.getElementById("project-submit-btn");

const projectNameInput = document.getElementById("project-name-input");
const projectDescInput = document.getElementById("project-desc-input");
const projectRoleInput = document.getElementById("project-role-input");
const projectStatusInput = document.getElementById("project-status-input");
const projectDateInput = document.getElementById("project-date-input");
const editProjectBtn = document.getElementById("edit-project-btn");

if (newProjectBtn && projectModal) {
    newProjectBtn.addEventListener("click", () => {
        isEditingProject = false;
        projectModalTitle.textContent = "New project";
        projectSubmitBtn.textContent = "Accept";
        projectForm.reset();
        if (projectDateInput) projectDateInput.value = new Date().toISOString().split("T")[0];
        projectModal.showModal();
    });
}

if (editProjectBtn && projectModal) {
    editProjectBtn.addEventListener("click", () => {
        const proj = projectsData[currentProjectId];
        if (!proj) return;

        isEditingProject = true;
        projectModalTitle.textContent = "Edit Project";
        projectSubmitBtn.textContent = "Save Changes";

        projectNameInput.value = proj.name;
        projectDescInput.value = proj.desc;
        projectRoleInput.value = proj.role;
        projectStatusInput.value = proj.status;
        projectDateInput.value = proj.finishDate || new Date().toISOString().split("T")[0];

        projectModal.showModal();
    });
}

if (cancelProjectBtn && projectModal) {
    cancelProjectBtn.addEventListener("click", () => projectModal.close());
}
if (projectModal) {
    projectModal.addEventListener("click", (e) => {
        if (e.target === projectModal) projectModal.close();
    });
}

if (projectForm) {
    projectForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = projectNameInput.value.trim();
        const desc = projectDescInput.value.trim() || "No description provided.";
        const role = projectRoleInput.value;
        const status = projectStatusInput.value;
        const date = projectDateInput.value || new Date().toISOString().split("T")[0];

        if (name.length < 5) {
            alert("Project name must be at least 5 characters long!");
            return;
        }

        const initials = name.slice(0, 2).toUpperCase();

        if (isEditingProject) {
            const proj = projectsData[currentProjectId];
            if (proj) {
                proj.name = name;
                proj.desc = desc;
                proj.role = role;
                proj.status = status;
                proj.finishDate = date;
                proj.initials = initials;

                saveProjects();
                renderProjectsGrid();
                populateProjectDetails(currentProjectId);
            }
        } else {
            const newId = `project-${Date.now()}`;
            const colors = ["badge-orange", "badge-green", "badge-purple", "badge-blue"];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];

            projectsData[newId] = {
                id: newId,
                name: name,
                desc: desc,
                initials: initials,
                badgeColor: randomColor,
                status: status,
                role: role,
                cost: "$ 0",
                progress: "0%",
                finishDate: date,
                todos: [
                    { id: Date.now(), text: "Set up project IFC model and coordinate system", date: "Just now", completed: false }
                ]
            };

            saveProjects();
            renderProjectsGrid();
        }

        projectModal.close();
        projectForm.reset();
    });
}

// =========================================================================
// 6. Users System (Dynamic Rendering, Actions & LocalStorage Persistence)
// =========================================================================
const userActionsDropdown = document.getElementById("user-actions-dropdown");
const userMenuEdit = document.getElementById("user-menu-edit");
const userMenuStatus = document.getElementById("user-menu-status");
const userMenuDelete = document.getElementById("user-menu-delete");

const userModal = document.getElementById("new-user-modal");
const userForm = document.getElementById("new-user-form");
const userModalTitle = document.getElementById("user-modal-title");
const userSubmitBtn = document.getElementById("user-submit-btn");
const newUserBtn = document.getElementById("new-user-btn");
const cancelUserBtn = document.getElementById("cancel-user-btn");
const usersTableBody = document.querySelector(".users-table tbody");

let activeUserId = null;
let isEditingUser = false;

function hideUserMenu() {
    if (userActionsDropdown) userActionsDropdown.style.display = "none";
}

document.addEventListener("click", (e) => {
    if (userActionsDropdown && !userActionsDropdown.contains(e.target) && !e.target.closest(".user-options-btn")) {
        hideUserMenu();
    }
});
window.addEventListener("scroll", hideUserMenu, true);

function renderUsersTable(filter = "all") {
    if (!usersTableBody) return;
    usersTableBody.innerHTML = "";

    let filtered = usersData;
    if (filter === "architects") {
        filtered = usersData.filter(u => u.roleType === "Architect" || u.role.toLowerCase().includes("arch"));
    } else if (filter === "engineers") {
        filtered = usersData.filter(u => u.roleType === "Engineer" || u.role.toLowerCase().includes("eng"));
    } else if (filter === "developers") {
        filtered = usersData.filter(u => u.roleType === "Developer" || u.role.toLowerCase().includes("dev"));
    }

    if (filtered.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
                    No users found in this category. Click 'New User' to add one!
                </td>
            </tr>
        `;
    } else {
        filtered.forEach(user => {
            const roleClassMap = {
                "Developer": "role-dev",
                "Architect": "role-arch",
                "Engineer": "role-eng",
                "BIM Coordinator": "role-bim"
            };
            const roleClass = roleClassMap[user.roleType] || "role-dev";
            const isOnline = user.status === "Active";

            const tr = document.createElement("tr");
            tr.dataset.userId = user.id;
            tr.innerHTML = `
                <td>
                    <div class="user-cell">
                        <div class="user-avatar-circle ${user.avatarColor}">${user.initials}</div>
                        <div>
                            <div class="user-name">${user.name}</div>
                            <div class="user-email">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td><span class="role-badge ${roleClass}">${user.role}</span></td>
                <td>${user.projects || "General"}</td>
                <td><span class="status-indicator ${isOnline ? 'status-online' : 'status-offline'}">${user.status}</span></td>
                <td style="text-align: right;">
                    <button type="button" class="btn-icon user-options-btn" title="Options">
                        <span class="material-icons-round">more_vert</span>
                    </button>
                </td>
            `;

            const btn = tr.querySelector(".user-options-btn");
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                activeUserId = user.id;

                const rect = btn.getBoundingClientRect();
                userActionsDropdown.style.top = `${rect.bottom + 4}px`;
                userActionsDropdown.style.left = `${Math.max(10, rect.right - 175)}px`;
                userActionsDropdown.style.display = "flex";
            });

            usersTableBody.appendChild(tr);
        });
    }

    const allPill = document.querySelector(".users-filter-group .filter-pill:first-child");
    if (allPill) {
        allPill.textContent = `All (${usersData.length})`;
    }
}

// Action 1: Edit User
if (userMenuEdit) {
    userMenuEdit.addEventListener("click", (e) => {
        e.stopPropagation();
        hideUserMenu();
        if (!activeUserId) return;

        const user = usersData.find(u => u.id === activeUserId);
        if (!user) return;

        isEditingUser = true;
        userModalTitle.textContent = "Edit User";
        userSubmitBtn.textContent = "Save Changes";

        document.getElementById("user-name-input").value = user.name;
        document.getElementById("user-email-input").value = user.email;
        document.getElementById("user-role-input").value = user.roleType;
        document.getElementById("user-status-input").value = user.status;

        userModal.showModal();
    });
}

// Action 2: Toggle Status
if (userMenuStatus) {
    userMenuStatus.addEventListener("click", (e) => {
        e.stopPropagation();
        hideUserMenu();
        if (!activeUserId) return;

        const user = usersData.find(u => u.id === activeUserId);
        if (user) {
            user.status = user.status === "Active" ? "Away" : "Active";
            saveUsers();
            renderUsersTable(currentFilter);
        }
    });
}

// Action 3: Delete User
if (userMenuDelete) {
    userMenuDelete.addEventListener("click", (e) => {
        e.stopPropagation();
        hideUserMenu();
        if (!activeUserId) return;

        const user = usersData.find(u => u.id === activeUserId);
        const name = user ? user.name : "this user";

        if (confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
            usersData = usersData.filter(u => u.id !== activeUserId);
            activeUserId = null;
            saveUsers();
            renderUsersTable(currentFilter);
        }
    });
}

// Open User Modal in Create Mode
if (newUserBtn && userModal) {
    newUserBtn.addEventListener("click", () => {
        isEditingUser = false;
        userModalTitle.textContent = "New User";
        userSubmitBtn.textContent = "Create User";
        userForm.reset();
        userModal.showModal();
    });
}

if (cancelUserBtn && userModal) {
    cancelUserBtn.addEventListener("click", () => userModal.close());
}
if (userModal) {
    userModal.addEventListener("click", (e) => {
        if (e.target === userModal) userModal.close();
    });
}

// Add or Update User Form Submission
if (userForm) {
    userForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const name = document.getElementById("user-name-input").value.trim();
        const email = document.getElementById("user-email-input").value.trim();
        const roleType = document.getElementById("user-role-input").value;
        const status = document.getElementById("user-status-input").value;

        const parts = name.split(" ").filter(Boolean);
        const initials = parts.length > 1
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : name.slice(0, 2).toUpperCase();

        if (isEditingUser && activeUserId) {
            const user = usersData.find(u => u.id === activeUserId);
            if (user) {
                user.name = name;
                user.email = email;
                user.role = roleType;
                user.roleType = roleType;
                user.status = status;
                user.initials = initials;

                saveUsers();
                renderUsersTable(currentFilter);
            }
        } else {
            const colors = ["badge-blue", "badge-purple", "badge-orange", "badge-green"];
            const avatarColor = colors[Math.floor(Math.random() * colors.length)];

            usersData.unshift({
                id: `user-${Date.now()}`,
                name: name,
                email: email,
                role: roleType,
                roleType: roleType,
                projects: "Hospital Center",
                status: status,
                initials: initials,
                avatarColor: avatarColor
            });

            saveUsers();
            renderUsersTable(currentFilter);
        }

        userModal.close();
        userForm.reset();
    });
}

// Filter Pills
const filterPills = document.querySelectorAll(".users-filter-group .filter-pill");
filterPills.forEach(pill => {
    pill.addEventListener("click", () => {
        filterPills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");

        const txt = pill.textContent.toLowerCase();
        if (txt.includes("all")) currentFilter = "all";
        else if (txt.includes("architect")) currentFilter = "architects";
        else if (txt.includes("engineer")) currentFilter = "engineers";
        else if (txt.includes("developer")) currentFilter = "developers";

        renderUsersTable(currentFilter);
    });
});

// =========================================================================
// 7. Initialize Application from LocalStorage on Load
// =========================================================================
renderProjectsGrid();
renderUsersTable();
