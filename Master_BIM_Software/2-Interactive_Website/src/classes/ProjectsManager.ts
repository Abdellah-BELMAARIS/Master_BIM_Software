// Lesson 3.6, 3.7, 3.8 & 3.9: Projects Manager with Queries, Validation & JSON I/O
import { IProject, Project, TodoStatus } from "./Project";

export class ProjectsManager {
    // 1. Array storing all active Project instances
    list: Project[] = [];

    // 2. HTML container in the DOM where project cards will be rendered
    ui: HTMLDivElement;

    // 3. Currently selected/active project for details view & actions
    activeProject: Project | null = null;

    // 4. Optional callback triggered when user clicks Edit on a To-Do item
    onEditTodo?: (todoId: number) => void;

    constructor(container: HTMLDivElement) {
        this.ui = container;

        // Create a default project upon manager instantiation
        this.newProject({
            name: "Default Project",
            description: "This is just a default project. You may delete it if you want.",
            userRole: "Architect",
            status: "Active",
            finishDate: new Date(),
            cost: 0,
            progress: 0.25,
        });
    }

    // Creates a new project, renders its UI card, and pushes to list
    newProject(data: IProject): Project {
        // Validate minimum 5 characters for project name
        if (!data.name || data.name.trim().length < 5) {
            throw new Error("Project name must be at least 5 characters long.");
        }

        // Lesson 3.8: Checking for existing project name using map() and includes()
        const projectNames = this.list.map((project) => project.name);
        const nameInUse = projectNames.includes(data.name);

        // Throw custom Error if name already exists
        if (nameInUse) {
            throw new Error(`A project with the name "${data.name}" already exists`);
        }

        const project = new Project(data);

        // Lesson 4.1 & 4.3: Navigate to Project Details page and populate dynamic data on card click
        project.ui.addEventListener("click", () => {
            const projectsPage = document.getElementById("projects-page");
            const detailsPage = document.getElementById("project-details");
            if (!projectsPage || !detailsPage) { return; }

            // Track active project and populate details
            this.activeProject = project;
            this.setDetailsPage(project);

            projectsPage.style.display = "none";
            detailsPage.style.display = "flex";
        });

        this.ui.append(project.ui);
        this.list.push(project);
        this.updateFilterCounts();
        return project;
    }

    // Update an existing project from the Edit Project modal
    updateProject(id: string, data: IProject): Project {
        const project = this.getProject(id);
        if (!project) {
            throw new Error("Project not found.");
        }

        if (!data.name || data.name.trim().length < 5) {
            throw new Error("Project name must be at least 5 characters long.");
        }

        const duplicate = this.list.find((p) => p.id !== id && p.name === data.name);
        if (duplicate) {
            throw new Error(`A project with the name "${data.name}" already exists`);
        }

        project.name = data.name;
        project.description = data.description;
        project.userRole = data.userRole;
        project.status = data.status;
        const parsedDate = data.finishDate ? new Date(data.finishDate) : new Date();
        project.finishDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
        project.cost = data.cost ?? project.cost;
        project.progress = data.progress ?? project.progress;
        if (data.iconColor) {
            project.iconColor = data.iconColor;
        }
        if (data.todos) {
            project.todos = data.todos.map((t) => ({
                ...t,
                status: t.status || (t.completed ? "completed" : "pending"),
                completed: t.status === "completed" || Boolean(t.completed),
            }));
        }

        // Refresh card in Projects grid and refresh Details view if this project is currently active
        project.setUI();
        if (this.activeProject && this.activeProject.id === project.id) {
            this.setDetailsPage(project);
        }
        this.updateFilterCounts();
        return project;
    }

    // Filter projects in #projects-list by search query and status pill with empty state feedback
    filterProjects(
        searchQuery: string = "",
        statusFilter: string = "all",
        onClearFilters?: () => void,
        onNewProject?: () => void
    ): void {
        const q = searchQuery.toLowerCase().trim();
        const status = statusFilter.toLowerCase().trim();

        let visibleCount = 0;
        this.list.forEach((project) => {
            const matchesSearch = !q ||
                project.name.toLowerCase().includes(q) ||
                project.description.toLowerCase().includes(q) ||
                project.userRole.toLowerCase().includes(q);

            const matchesStatus = status === "all" ||
                project.status.toLowerCase() === status;

            const visible = matchesSearch && matchesStatus;
            project.ui.style.display = visible ? "" : "none";
            if (visible) { visibleCount++; }
        });

        // Manage Empty State message in center of #projects-list
        const existingEmptyState = document.getElementById("projects-empty-state");
        if (visibleCount === 0) {
            let title = "No Projects Found";
            let desc = "There are no projects matching your current filter in the CDE workspace.";
            let icon = "search_off";

            if (this.list.length === 0) {
                title = "Your Workspace is Empty";
                desc = "No BIM projects exist yet. Click below to create your first project or import a JSON file.";
                icon = "folder_off";
            } else if (status === "pending") {
                title = "No Pending Projects Found";
                desc = "There are currently no projects marked with 'Pending' status.";
                icon = "pending_actions";
            } else if (status === "active") {
                title = "No Active Projects Found";
                desc = "There are currently no active projects running.";
                icon = "domain_disabled";
            } else if (status === "finished") {
                title = "No Finished Projects Found";
                desc = "There are currently no completed projects in this archive.";
                icon = "task_alt";
            } else if (q) {
                title = `No Results for "${searchQuery}"`;
                desc = "Try checking for spelling errors or search with a different keyword or role.";
                icon = "search_off";
            }

            if (!existingEmptyState) {
                const emptyEl = document.createElement("div");
                emptyEl.id = "projects-empty-state";
                emptyEl.className = "projects-empty-state";

                emptyEl.innerHTML = `
                    <div class="empty-state-icon-box">
                        <span class="material-icons-round">${icon}</span>
                    </div>
                    <div class="empty-state-text">
                        <h3>${title}</h3>
                        <p>${desc}</p>
                    </div>
                    <div class="empty-state-actions">
                        ${(q || status !== "all") ? `
                            <button type="button" class="btn-clear-filters" id="empty-clear-filters-btn">
                                <span class="material-icons-round">filter_alt_off</span>
                                <span>Clear Filters & Show All</span>
                            </button>
                        ` : ""}
                        <button type="button" class="btn-primary" id="empty-new-project-btn">
                            <span class="material-icons-round">add</span>
                            <span>New Project</span>
                        </button>
                    </div>
                `;

                this.ui.appendChild(emptyEl);

                emptyEl.querySelector("#empty-clear-filters-btn")?.addEventListener("click", () => {
                    if (onClearFilters) onClearFilters();
                });
                emptyEl.querySelector("#empty-new-project-btn")?.addEventListener("click", () => {
                    if (onNewProject) onNewProject();
                });
            } else {
                const iconEl = existingEmptyState.querySelector(".empty-state-icon-box .material-icons-round");
                const titleEl = existingEmptyState.querySelector(".empty-state-text h3");
                const descEl = existingEmptyState.querySelector(".empty-state-text p");
                if (iconEl) iconEl.textContent = icon;
                if (titleEl) titleEl.textContent = title;
                if (descEl) descEl.textContent = desc;

                const clearBtn = existingEmptyState.querySelector("#empty-clear-filters-btn") as HTMLButtonElement | null;
                if (clearBtn) {
                    clearBtn.style.display = (q || status !== "all") ? "inline-flex" : "none";
                }
            }
        } else {
            if (existingEmptyState) {
                existingEmptyState.remove();
            }
        }
    }

    // Sort projects in this.list and reorder their DOM elements in this.ui
    sortProjects(sortBy: string = "name-asc"): void {
        this.list.sort((a, b) => {
            switch (sortBy) {
                case "name-asc":
                    return a.name.localeCompare(b.name);
                case "name-desc":
                    return b.name.localeCompare(a.name);
                case "cost-desc":
                    return (b.cost || 0) - (a.cost || 0);
                case "progress-desc":
                    return (b.progress || 0) - (a.progress || 0);
                case "date-asc":
                    return new Date(a.finishDate).getTime() - new Date(b.finishDate).getTime();
                default:
                    return 0;
            }
        });

        // Re-append in sorted order (preserves existing elements & event listeners)
        this.list.forEach((project) => {
            this.ui.appendChild(project.ui);
        });
    }

    // Update count badges on All, Active, Pending, Finished filter pills
    updateFilterCounts(): void {
        const total = this.list.length;
        const active = this.list.filter((p) => p.status.toLowerCase() === "active").length;
        const pending = this.list.filter((p) => p.status.toLowerCase() === "pending").length;
        const finished = this.list.filter((p) => p.status.toLowerCase() === "finished").length;

        const allBtn = document.querySelector("[data-status-filter='all'] .filter-count");
        const activeBtn = document.querySelector("[data-status-filter='active'] .filter-count");
        const pendingBtn = document.querySelector("[data-status-filter='pending'] .filter-count");
        const finishedBtn = document.querySelector("[data-status-filter='finished'] .filter-count");

        if (allBtn) allBtn.textContent = String(total);
        if (activeBtn) activeBtn.textContent = String(active);
        if (pendingBtn) pendingBtn.textContent = String(pending);
        if (finishedBtn) finishedBtn.textContent = String(finished);
    }

    // Lesson 4.3: Internal private method to update all project details UI elements via data-project-info
    private setDetailsPage(project: Project): void {
        const detailsPage = document.getElementById("project-details");
        if (!detailsPage) { return; }

        // 1. Update Project Name across header and card title
        const nameElements = detailsPage.querySelectorAll("[data-project-info='name']");
        nameElements.forEach((el) => {
            el.textContent = project.name;
        });

        // 2. Update Project Description across header and card
        const descElements = detailsPage.querySelectorAll("[data-project-info='description']");
        descElements.forEach((el) => {
            el.textContent = project.description;
        });

        // 3. Update Status
        const status = detailsPage.querySelector("[data-project-info='status']");
        if (status) {
            status.textContent = project.status;
        }

        // 4. Update Cost (Formatted as currency)
        const cost = detailsPage.querySelector("[data-project-info='cost']");
        if (cost) {
            cost.textContent = `$ ${Number(project.cost || 0).toLocaleString("en-US")}`;
        }

        // 5. Update User Role
        const role = detailsPage.querySelector("[data-project-info='role']");
        if (role) {
            role.textContent = project.userRole;
        }

        // 6. Update Finish Date (Formatted as readable date)
        const finishDate = detailsPage.querySelector("[data-project-info='finishDate']");
        if (finishDate) {
            const dateObj = new Date(project.finishDate);
            finishDate.textContent = isNaN(dateObj.getTime())
                ? String(project.finishDate)
                : dateObj.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
        }

        // 7. Update Progress Bar Width & Percentage Text
        const progress = detailsPage.querySelector("[data-project-info='progress']") as HTMLDivElement | null;
        if (progress) {
            const percentage = Math.round((project.progress || 0) * 100);
            progress.style.width = `${percentage}%`;
            progress.textContent = `${percentage}%`;
        }

        // 8. Challenge #1 & #2: Update Avatar Initials (CSS uppercased) & Random Icon Color
        const avatar = detailsPage.querySelector("[data-project-info='avatar']") as HTMLDivElement | null;
        if (avatar) {
            avatar.textContent = project.name.trim().slice(0, 2);
            avatar.className = "card-avatar-circle";
            avatar.style.backgroundColor = project.iconColor;
        }

        // 9. Render the project's tasks/todos in #todos-list
        this.renderTodos(project);
    }

    // Challenge #6 & #9: Render BCF tasks / todos with status-based card background color, toggle, edit, and delete
    renderTodos(project: Project, filterQuery: string = ""): void {
        const todosList = document.getElementById("todos-list");
        const countBadge = document.getElementById("todo-count-badge");
        if (countBadge) {
            countBadge.textContent = String(project.todos.length);
        }
        if (!todosList) { return; }
        todosList.innerHTML = "";

        const query = filterQuery.toLowerCase().trim();
        const filtered = query
            ? project.todos.filter((t) => t.text.toLowerCase().includes(query) || (t.status && t.status.toLowerCase().includes(query)))
            : project.todos;

        if (filtered.length === 0) {
            todosList.innerHTML = `<div class="todo-empty-state">No tasks match your filter. Click + to add a task.</div>`;
            return;
        }

        const statusCycle: Record<TodoStatus, TodoStatus> = {
            "pending": "in-progress",
            "in-progress": "completed",
            "completed": "pending",
        };

        const statusLabels: Record<TodoStatus, string> = {
            "pending": "Pending",
            "in-progress": "In Progress",
            "completed": "Completed",
        };

        const statusIcons: Record<TodoStatus, string> = {
            "pending": "schedule",
            "in-progress": "autorenew",
            "completed": "check_circle",
        };

        filtered.forEach((todo) => {
            const currentStatus: TodoStatus = todo.status || (todo.completed ? "completed" : "pending");
            todo.status = currentStatus;
            todo.completed = currentStatus === "completed";

            const item = document.createElement("div");
            // Challenge #9: Change background color of To-Do card based on its current status
            item.className = `todo-card-item status-${currentStatus} ${todo.completed ? "completed" : ""}`;
            item.innerHTML = `
                <div class="todo-card-left" title="Click to cycle status (${statusLabels[currentStatus]})">
                    <button type="button" class="todo-icon-box">
                        <span class="material-icons-round">${statusIcons[currentStatus]}</span>
                    </button>
                    <div class="todo-text-group">
                        <p class="todo-desc">${todo.text}</p>
                        <span class="todo-status-pill status-${currentStatus}">${statusLabels[currentStatus]}</span>
                    </div>
                </div>
                <div class="todo-card-right">
                    <span class="todo-date-tag">${todo.date}</span>
                    <div class="todo-item-actions">
                        <button type="button" class="todo-action-btn edit" title="Edit Task & Status">
                            <span class="material-icons-round">edit</span>
                        </button>
                        <button type="button" class="todo-action-btn todo-delete-btn delete" title="Delete Task">
                            <span class="material-icons-round">delete</span>
                        </button>
                    </div>
                </div>
            `;

            // Cycle status when clicking the left area (Pending -> In Progress -> Completed)
            const leftArea = item.querySelector(".todo-card-left");
            leftArea?.addEventListener("click", () => {
                const next = statusCycle[currentStatus];
                todo.status = next;
                todo.completed = next === "completed";
                this.renderTodos(project, filterQuery);
            });

            // Edit button opens modal to specify/update task & status
            const editBtn = item.querySelector(".todo-action-btn.edit");
            editBtn?.addEventListener("click", (e) => {
                e.stopPropagation();
                if (this.onEditTodo) {
                    this.onEditTodo(todo.id);
                }
            });

            // Delete button
            const deleteBtn = item.querySelector(".todo-action-btn.delete");
            deleteBtn?.addEventListener("click", (e) => {
                e.stopPropagation();
                project.todos = project.todos.filter((t) => t.id !== todo.id);
                this.renderTodos(project, filterQuery);
            });

            todosList.appendChild(item);
        });
    }

    // Query a project by unique UUID
    getProject(id: string): Project | undefined {
        const project = this.list.find((project) => {
            return project.id === id;
        });
        return project;
    }

    // Delete a project by ID, removing UI card and keeping array immutable
    deleteProject(id: string): void {
        const project = this.getProject(id);
        if (!project) { return; }

        // Remove DOM element from page
        project.ui.remove();

        // Non-destructive filter: keeps only projects that do not match the target ID
        const remaining = this.list.filter((project) => {
            return project.id !== id;
        });
        this.list = remaining;
        this.updateFilterCounts();
    }

    // Calculate total cost using Array.prototype.reduce()
    totalCost(): number {
        return this.list.reduce((total, project) => total + project.cost, 0);
    }

    // Find a project by its name
    getProjectByName(name: string): Project | undefined {
        return this.list.find((project) => project.name === name);
    }

    // Lesson 3.9 & Challenge #7: Export all projects (including ToDos & iconColor) to JSON
    exportToJSON(fileName: string = "projects") {
        if (!this.list || this.list.length === 0) {
            throw new Error("Cannot export: There are no projects in your workspace. Please create or import a project first.");
        }

        // Serialize project data into clean formatted JSON
        const plainProjects = this.list.map((project) => ({
            id: project.id,
            name: project.name,
            description: project.description,
            userRole: project.userRole,
            status: project.status,
            finishDate: project.finishDate,
            cost: project.cost,
            progress: project.progress,
            iconColor: project.iconColor,
            todos: project.todos,
        }));

        const json = JSON.stringify(plainProjects, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        // Programmatic click on ghost anchor element
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName.endsWith(".json") ? fileName : `${fileName}.json`;
        a.click();

        // Cleanup temporary URL
        URL.revokeObjectURL(url);
    }

    // Lesson 3.9 & Challenge #8: Import projects from JSON and UPDATE existing projects if they already exist
    importFromJSON() {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";

        const reader = new FileReader();

        reader.addEventListener("load", () => {
            if (!reader.result) { return; }
            try {
                const projects: (IProject & { id?: string })[] = JSON.parse(reader.result as string);
                let importedCount = 0;
                let updatedCount = 0;

                // Challenge #8: If a project imported from JSON already exists (by ID or Name), update its information!
                for (const projectData of projects) {
                    const existingProject =
                        (projectData.id ? this.getProject(projectData.id) : undefined) ||
                        this.getProjectByName(projectData.name);

                    if (existingProject) {
                        this.updateProject(existingProject.id, projectData);
                        updatedCount++;
                    } else {
                        try {
                            this.newProject(projectData);
                            importedCount++;
                        } catch (err: any) {
                            console.warn(`Could not import project "${projectData.name}":`, err.message);
                        }
                    }
                }
                console.log(`JSON Import complete: ${importedCount} created, ${updatedCount} existing projects updated.`);
            } catch (err: any) {
                console.error("JSON parse error during import:", err);
                throw new Error("The selected file is not a valid JSON projects file");
            }
        });

        input.addEventListener("change", () => {
            const filesList = input.files;
            if (!filesList || filesList.length === 0) { return; }
            reader.readAsText(filesList[0]);
        });

        input.click();
    }
}
