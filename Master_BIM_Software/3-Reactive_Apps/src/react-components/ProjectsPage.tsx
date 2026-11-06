import * as React from "react";
import { IProject, Project, ProjectStatus, UserRole } from "../classes/Project";
import { ProjectsManager } from "../classes/ProjectsManager";
import { ProjectCard } from "./ProjectCard";

export interface ProjectsPageProps {
    projectsManager?: ProjectsManager;
}

// Lesson 3.3, 3.4, 3.5 & 3.6: ProjectsPage Component with Events, Nested <ProjectCard />, React.useState & React.useEffect
export function ProjectsPage(props: ProjectsPageProps) {
    // Lesson 3.6: Store projectsManager in component state so the same instance persists across re-renders
    const [projectsManager] = React.useState<ProjectsManager>(
        () => props.projectsManager ?? new ProjectsManager()
    );

    // Lesson 3.5: Introducing React State with TypeScript Generics (React.useState<Project[]>)
    const [projects, setProjects] = React.useState<Project[]>(projectsManager.list);
    const [searchQuery, setSearchQuery] = React.useState<string>("");
    const [statusFilter, setStatusFilter] = React.useState<string>("all");
    const [sortBy, setSortBy] = React.useState<string>("name-asc");

    // Lesson 3.6: Wire ProjectsManager custom events (onProjectCreated & onProjectDeleted) to update React state
    projectsManager.onProjectCreated = () => {
        setProjects([...projectsManager.list]);
    };

    projectsManager.onProjectDeleted = () => {
        setProjects([...projectsManager.list]);
    };

    projectsManager.onProjectsChanged = (updatedList) => {
        setProjects([...updatedList]);
    };

    // Lesson 3.6: Observe projects state changes after mount & on every update via React.useEffect
    React.useEffect(() => {
        console.log("Updated projects state", projects);
    }, [projects]);

    // Helper to display styled error dialog (or fallback alert)
    const showError = (message: string) => {
        const errorMsgEl = document.getElementById("error-modal-message");
        const errorModal = document.getElementById("error-modal");
        if (errorModal && errorModal instanceof HTMLDialogElement && errorMsgEl) {
            errorMsgEl.textContent = message;
            errorModal.showModal();
        } else {
            alert(message);
        }
    };

    // Lesson 3.4: Callback to open the New Project modal via React onClick
    const onNewProjectClick = () => {
        const projectForm = document.getElementById("new-project-form") as HTMLFormElement | null;
        projectForm?.reset();
        delete projectForm?.dataset.editingProjectId;

        const modalTitle = document.getElementById("project-modal-title");
        const submitBtn = document.getElementById("project-submit-btn");
        if (modalTitle) modalTitle.textContent = "New Project";
        if (submitBtn) submitBtn.textContent = "Accept";

        const modal = document.getElementById("new-project-modal");
        if (!(modal && modal instanceof HTMLDialogElement)) { return; }
        modal.showModal();
    };

    // Lesson 3.4: Callback to close the New Project modal
    const onCancelClick = () => {
        const projectForm = document.getElementById("new-project-form") as HTMLFormElement | null;
        delete projectForm?.dataset.editingProjectId;

        const modal = document.getElementById("new-project-modal");
        if (!(modal && modal instanceof HTMLDialogElement)) { return; }
        modal.close();
    };

    // Lesson 3.4 & 3.5: Callback for form onSubmit using React.FormEvent + setProjects state update
    const onFormSubmit = (e: React.FormEvent) => {
        const projectForm = document.getElementById("new-project-form");
        if (!(projectForm && projectForm instanceof HTMLFormElement)) { return; }
        e.preventDefault();

        const formData = new FormData(projectForm);
        const rawDate = formData.get("finishDate") as string;
        const parsedDate = rawDate ? new Date(rawDate) : new Date();
        const rawCost = Number(formData.get("cost") ?? 0);
        const rawProgress = Number(formData.get("progress") ?? 25);
        const clampedProgress = Math.min(100, Math.max(0, isNaN(rawProgress) ? 25 : rawProgress)) / 100;
        const selectedModelType = (formData.get("modelType") as "cube" | "gear") || "cube";

        const projectData: IProject = {
            name: (formData.get("name") as string).trim(),
            description: (formData.get("description") as string).trim(),
            status: formData.get("status") as ProjectStatus,
            userRole: formData.get("userRole") as UserRole,
            finishDate: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
            cost: isNaN(rawCost) ? 0 : rawCost,
            progress: clampedProgress,
            modelType: selectedModelType,
        };

        try {
            const editingId = projectForm.dataset.editingProjectId;
            if (editingId) {
                projectsManager.updateProject(editingId, projectData);
            } else {
                projectsManager.newProject(projectData);
            }

            delete projectForm.dataset.editingProjectId;
            projectForm.reset();

            const modal = document.getElementById("new-project-modal");
            if (!(modal && modal instanceof HTMLDialogElement)) { return; }
            modal.close();
        } catch (err: any) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            showError(errorMessage);
        }
    };

    // Lesson 3.4 Assignment: Export & Import projects JSON inside ProjectsPage component
    const onExportProject = () => {
        try {
            projectsManager.exportToJSON();
        } catch (err: any) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            showError(errorMessage);
        }
    };

    const onImportProject = () => {
        projectsManager.importFromJSON();
    };

    // Filter & sort projects declaratively via React state
    const q = searchQuery.toLowerCase().trim();
    const visibleProjects = projects
        .filter((project) => {
            const matchesSearch =
                !q ||
                project.name.toLowerCase().includes(q) ||
                project.description.toLowerCase().includes(q) ||
                project.userRole.toLowerCase().includes(q);
            const matchesStatus =
                statusFilter === "all" || project.status.toLowerCase() === statusFilter;
            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
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

    const totalCount = projects.length;
    const activeCount = projects.filter((p) => p.status.toLowerCase() === "active").length;
    const pendingCount = projects.filter((p) => p.status.toLowerCase() === "pending").length;
    const finishedCount = projects.filter((p) => p.status.toLowerCase() === "finished").length;

    // Lesson 3.5: Map projects state to <ProjectCard /> components
    const projectCards = visibleProjects.map((project) => (
        <ProjectCard
            key={project.id}
            project={project}
            onClick={(selectedProject) => projectsManager.selectProject(selectedProject)}
        />
    ));

    return (
        <div className="page" id="projects-page">
            {/* New / Edit Project Modal Dialog */}
            <dialog id="new-project-modal">
                <form
                    onSubmit={(e) => onFormSubmit(e)}
                    id="new-project-form"
                    onInvalid={(e) => {
                        const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                        if (target && "validity" in target) {
                            if (target.validity.valueMissing) {
                                target.setCustomValidity("Please fill out this field.");
                            } else if (target.validity.typeMismatch && target.type === "email") {
                                target.setCustomValidity("Please enter a valid email address.");
                            } else if (target.validity.rangeUnderflow) {
                                target.setCustomValidity(`Value must be greater than or equal to ${target.getAttribute("min")}.`);
                            } else if (target.validity.rangeOverflow) {
                                target.setCustomValidity(`Value must be less than or equal to ${target.getAttribute("max")}.`);
                            }
                        }
                    }}
                    onInput={(e) => {
                        const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                        if (target && "setCustomValidity" in target) {
                            target.setCustomValidity("");
                        }
                    }}
                >
                    <h2 id="project-modal-title">New Project</h2>
                    <div className="input-list">
                        <div className="form-field">
                            <label>
                                <span className="material-icons-round">corporate_fare</span> Name
                            </label>
                            <input
                                name="name"
                                type="text"
                                id="project-name-input"
                                placeholder="Riverfront Promenade"
                                required
                            />
                            <p className="input-tip">TIP: Give it a short name (min. 5 chars).</p>
                        </div>

                        <div className="form-field">
                            <label>
                                <span className="material-icons-round">subject</span> Description
                            </label>
                            <textarea
                                name="description"
                                id="project-desc-input"
                                placeholder="Enter architectural & structural scope description..."
                                cols={30}
                                rows={3}
                                defaultValue={""}
                            />
                        </div>

                        <div className="form-row-2col">
                            <div className="form-field">
                                <label>
                                    <span className="material-icons-round">person</span> Role
                                </label>
                                <select name="userRole" id="project-role-input">
                                    <option value="Architect">Architect</option>
                                    <option value="Engineer">Engineer</option>
                                    <option value="Developer">Developer</option>
                                </select>
                            </div>

                            <div className="form-field">
                                <label>
                                    <span className="material-icons-round">help_outline</span> Status
                                </label>
                                <select name="status" id="project-status-input">
                                    <option value="Active">Active</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Finished">Finished</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row-2col">
                            <div className="form-field">
                                <label>
                                    <span className="material-icons-round">payments</span> Cost ($)
                                </label>
                                <input
                                    name="cost"
                                    type="number"
                                    id="project-cost-input"
                                    min={0}
                                    step={1000}
                                    defaultValue={0}
                                />
                            </div>

                            <div className="form-field">
                                <label>
                                    <span className="material-icons-round">trending_up</span> Progress (%)
                                </label>
                                <input
                                    name="progress"
                                    type="number"
                                    id="project-progress-input"
                                    min={0}
                                    max={100}
                                    defaultValue={25}
                                />
                            </div>
                        </div>

                        <div className="form-row-2col">
                            <div className="form-field">
                                <label>
                                    <span className="material-icons-round">calendar_today</span> Finish Date
                                </label>
                                <input name="finishDate" type="date" id="project-date-input" lang="en" />
                            </div>

                            <div className="form-field">
                                <label>
                                    <span className="material-icons-round">view_in_ar</span> 3D Model Type
                                </label>
                                <select name="modelType" id="project-model-input">
                                    <option value="cube">Cube Massing Model</option>
                                    <option value="gear">Mechanical Gear HVAC</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button
                            onClick={onCancelClick}
                            type="button"
                            id="cancel-btn"
                            className="btn-cancel"
                        >
                            Cancel
                        </button>
                        <button type="submit" id="project-submit-btn" className="btn-accept">
                            Accept
                        </button>
                    </div>
                </form>
            </dialog>

            {/* Top Action Header */}
            <header id="main-header">
                <div className="header-title-box">
                    <span className="header-eyebrow">CDE WORKSPACE / MODELS</span>
                    <h2>BIM Projects</h2>
                </div>
                <div className="header-actions">
                    <button
                        onClick={onImportProject}
                        className="btn-icon btn-action-tool"
                        id="import-projects-btn"
                        title="Import Projects (JSON)"
                    >
                        <span className="material-icons-round">upload_file</span>
                        <span className="btn-tool-label">Import JSON</span>
                    </button>
                    <button
                        onClick={onExportProject}
                        className="btn-icon btn-action-tool"
                        id="export-projects-btn"
                        title="Export Projects (JSON)"
                    >
                        <span className="material-icons-round">file_download</span>
                        <span className="btn-tool-label">Export JSON</span>
                    </button>
                    <button onClick={onNewProjectClick} className="btn-primary" id="new-project-btn">
                        <span className="material-icons-round">add</span>
                        <span>New Project</span>
                    </button>
                </div>
            </header>

            {/* Projects Search & Status Filter Toolbar */}
            <div className="projects-toolbar">
                <div className="search-input-pill projects-search-box">
                    <span className="material-icons-round">search</span>
                    <input
                        type="text"
                        id="project-search-input"
                        placeholder="Search projects by name, description, or role..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery.trim().length > 0 && (
                        <button
                            type="button"
                            className="btn-clear-search"
                            id="clear-search-btn"
                            title="Clear search text"
                            onClick={() => setSearchQuery("")}
                        >
                            <span className="material-icons-round">close</span>
                        </button>
                    )}
                </div>
                <div className="projects-filter-group" id="project-filter-group">
                    <button
                        type="button"
                        className={`filter-pill ${statusFilter === "all" ? "active" : ""}`}
                        data-status-filter="all"
                        onClick={() => setStatusFilter("all")}
                    >
                        All <span className="filter-count">{totalCount}</span>
                    </button>
                    <button
                        type="button"
                        className={`filter-pill ${statusFilter === "active" ? "active" : ""}`}
                        data-status-filter="active"
                        onClick={() => setStatusFilter("active")}
                    >
                        Active <span className="filter-count">{activeCount}</span>
                    </button>
                    <button
                        type="button"
                        className={`filter-pill ${statusFilter === "pending" ? "active" : ""}`}
                        data-status-filter="pending"
                        onClick={() => setStatusFilter("pending")}
                    >
                        Pending <span className="filter-count">{pendingCount}</span>
                    </button>
                    <button
                        type="button"
                        className={`filter-pill ${statusFilter === "finished" ? "active" : ""}`}
                        data-status-filter="finished"
                        onClick={() => setStatusFilter("finished")}
                    >
                        Finished <span className="filter-count">{finishedCount}</span>
                    </button>
                </div>
                <div className="projects-sort-group">
                    <label htmlFor="project-sort-select" className="sort-label">
                        <span className="material-icons-round">sort</span>
                        <span>Sort:</span>
                    </label>
                    <select
                        id="project-sort-select"
                        className="sort-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="name-asc">Name (A → Z)</option>
                        <option value="name-desc">Name (Z → A)</option>
                        <option value="cost-desc">Cost (High → Low)</option>
                        <option value="progress-desc">Progress (High → Low)</option>
                        <option value="date-asc">Finish Date (Earliest)</option>
                    </select>
                </div>
            </div>

            {/* Projects Grid (Declaratively rendered by React <ProjectCard /> components) */}
            <section id="projects-list">
                {projectCards.length > 0 ? (
                    projectCards
                ) : (
                    <div id="projects-empty-state" className="projects-empty-state">
                        <div className="empty-state-icon-box">
                            <span className="material-icons-round">search_off</span>
                        </div>
                        <div className="empty-state-text">
                            <h3>No Projects Found</h3>
                            <p>There are no projects matching your current filter in the CDE workspace.</p>
                        </div>
                        <div className="empty-state-actions">
                            {(q || statusFilter !== "all") && (
                                <button
                                    type="button"
                                    className="btn-clear-filters"
                                    onClick={() => {
                                        setSearchQuery("");
                                        setStatusFilter("all");
                                    }}
                                >
                                    <span className="material-icons-round">filter_alt_off</span>
                                    <span>Clear Filters & Show All</span>
                                </button>
                            )}
                            <button type="button" className="btn-primary" onClick={onNewProjectClick}>
                                <span className="material-icons-round">add</span>
                                <span>New Project</span>
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* Floating Export Button */}
            <button
                onClick={onExportProject}
                id="floating-export-btn"
                className="fab-btn"
                title="Export Projects"
            >
                <span className="material-icons-round">download</span>
            </button>
        </div>
    );
}
