// Module 04: Creating BIM Apps (That Open Engine & Fragments)
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { flushSync } from "react-dom";
import * as Router from "react-router-dom";
import * as BUI from "@thatopen/ui";
import * as WEBIFC from "web-ifc";
import { Sidebar } from "./react-components/Sidebar";
import { ProjectsPage } from "./react-components/ProjectsPage";
import { ProjectDetailsPage } from "./react-components/ProjectDetailsPage";
import { ProjectsManager } from "./classes/ProjectsManager";

// Emscripten WASM 3-arg vs 4-arg compatibility bridge for web-ifc
if ((WEBIFC as any)?.IfcAPI?.prototype) {
    const proto = (WEBIFC as any).IfcAPI.prototype;
    const origStreamMeshes = proto.StreamMeshes;
    proto.StreamMeshes = function (modelID: number, expressIDs: any, meshCallback: any, applyLinearScalingFactor?: boolean) {
        try {
            return origStreamMeshes.call(this, modelID, expressIDs, meshCallback, applyLinearScalingFactor);
        } catch (err: any) {
            if (err && String(err).includes("expected 3")) {
                return (this as any).wasmModule.StreamMeshes(modelID, expressIDs, meshCallback);
            }
            throw err;
        }
    };
    const origStreamAllMeshes = proto.StreamAllMeshes;
    proto.StreamAllMeshes = function (modelID: number, meshCallback: any, applyLinearScalingFactor?: boolean) {
        try {
            return origStreamAllMeshes.call(this, modelID, meshCallback, applyLinearScalingFactor);
        } catch (err: any) {
            if (err && String(err).includes("expected 2")) {
                return (this as any).wasmModule.StreamAllMeshes(modelID, meshCallback);
            }
            throw err;
        }
    };
}

// Initialize That Open Engine UI Web Components
BUI.Manager.init();

const projectsManager = new ProjectsManager();

const showMainReactView = () => {
    const content = document.getElementById("content");
    if (content) {
        content.style.display = "none";
    }
    const usersPage = document.getElementById("users-page");
    if (usersPage) {
        usersPage.style.display = "none";
    }
    const projectsPage = document.getElementById("projects-page");
    if (projectsPage) {
        projectsPage.style.display = "flex";
    }
    const detailsPage = document.getElementById("project-details");
    if (detailsPage) {
        detailsPage.style.display = "flex";
    }
};

const showUsersPage = () => {
    const projectsPage = document.getElementById("projects-page");
    const detailsPage = document.getElementById("project-details");
    const content = document.getElementById("content");
    const usersPage = document.getElementById("users-page");
    if (projectsPage) {
        projectsPage.style.display = "none";
    }
    if (detailsPage) {
        detailsPage.style.display = "none";
    }
    if (content) {
        content.style.display = "flex";
    }
    if (usersPage) {
        usersPage.style.display = "flex";
    }
};

// Lesson 3.8: Mount React Root with BrowserRouter, Routes, and Route
const appRoot = document.getElementById("app");
if (appRoot) {
    const root = ReactDOM.createRoot(appRoot);
    flushSync(() => {
        root.render(
            <Router.BrowserRouter>
                <Sidebar
                    activeTab="projects"
                    onNavigate={(tab) => {
                        if (tab === "projects") {
                            showMainReactView();
                        } else {
                            showUsersPage();
                        }
                    }}
                />
                <Router.Routes>
                    <Router.Route
                        path="/"
                        element={<ProjectsPage projectsManager={projectsManager} />}
                    />
                    <Router.Route
                        path="/project/:id"
                        element={<ProjectDetailsPage projectsManager={projectsManager} />}
                    />
                </Router.Routes>
            </Router.BrowserRouter>
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

// Wire error modal close button
const closeErrorModalBtn = document.getElementById("close-error-modal-btn");
closeErrorModalBtn?.addEventListener("click", () => toggleModal("error-modal", false));

// Global HTML5 Constraint Validation English Override (prevents browser OS locale messages like French "Veuillez renseigner ce champ.")
document.addEventListener(
    "invalid",
    (e) => {
        const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (!target || !("validity" in target)) { return; }
        if (target.validity.valueMissing) {
            target.setCustomValidity("Please fill out this field.");
        } else if (target.validity.typeMismatch && target.type === "email") {
            target.setCustomValidity("Please enter a valid email address.");
        } else if (target.validity.rangeUnderflow) {
            target.setCustomValidity(`Value must be greater than or equal to ${target.getAttribute("min")}.`);
        } else if (target.validity.rangeOverflow) {
            target.setCustomValidity(`Value must be less than or equal to ${target.getAttribute("max")}.`);
        } else if (target.validity.tooShort) {
            target.setCustomValidity(`Please lengthen this text to at least ${target.getAttribute("minlength")} characters.`);
        }
    },
    true
);

document.addEventListener(
    "input",
    (e) => {
        const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
        if (target && "setCustomValidity" in target) {
            target.setCustomValidity("");
        }
    },
    true
);

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
document.getElementById("user-menu-edit")?.addEventListener("click", (e) => {
    e.stopPropagation();
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

    if (userDropdown) userDropdown.style.display = "none";
    toggleModal("new-user-modal", true);
});

// Dropdown Action 2: Toggle Member Status
document.getElementById("user-menu-status")?.addEventListener("click", (e) => {
    e.stopPropagation();
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
    if (userDropdown) userDropdown.style.display = "none";
});

// Dropdown Action 3: Delete Member
document.getElementById("user-menu-delete")?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!activeUserRow) { return; }
    activeUserRow.remove();
    activeUserRow = null;
    applyUserFilters();
    if (userDropdown) userDropdown.style.display = "none";
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
