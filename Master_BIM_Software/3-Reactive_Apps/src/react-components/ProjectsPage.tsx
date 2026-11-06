import * as React from "react";
import { IProject, ProjectStatus, UserRole } from "../classes/Project";
import { ProjectsManager } from "../classes/ProjectsManager";

export interface ProjectsPageProps {
    projectsManager?: ProjectsManager;
}

// Lesson 3.3 & 3.4: Creating a ProjectsPage React component & Working with HTML events inside components
export function ProjectsPage(props: ProjectsPageProps) {
    // Instantiate ProjectsManager inside the component (or use provided instance so 3D viewer / details stay synced)
    const projectsManagerRef = React.useRef<ProjectsManager | null>(null);
    if (!projectsManagerRef.current) {
        projectsManagerRef.current = props.projectsManager ?? new ProjectsManager();
    }
    const projectsManager = props.projectsManager ?? projectsManagerRef.current;

    // Ensure project cards are mounted into #projects-list on initial render
    React.useEffect(() => {
        const container = document.getElementById("projects-list") as HTMLDivElement | null;
        if (container && projectsManager) {
            projectsManager.ui = container;
            projectsManager.list.forEach((project) => {
                if (!container.contains(project.ui)) {
                    container.appendChild(project.ui);
                }
            });
            projectsManager.updateFilterCounts();
        }
    }, [projectsManager]);

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

    // Lesson 3.4: Callback for form onSubmit using React.FormEvent
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
                const updated = projectsManager.updateProject(editingId, projectData);
                console.log(updated);
            } else {
                const project = projectsManager.newProject(projectData);
                console.log(project);
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

    return (
        <div className="page" id="projects-page">
            {/* New / Edit Project Modal Dialog */}
            <dialog id="new-project-modal">
                <form onSubmit={(e) => onFormSubmit(e)} id="new-project-form">
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
                                <input name="finishDate" type="date" id="project-date-input" />
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
                    />
                    <button
                        type="button"
                        className="btn-clear-search"
                        id="clear-search-btn"
                        title="Clear search text"
                        style={{ display: "none" }}
                    >
                        <span className="material-icons-round">close</span>
                    </button>
                </div>
                <div className="projects-filter-group" id="project-filter-group">
                    <button type="button" className="filter-pill active" data-status-filter="all">
                        All <span className="filter-count">0</span>
                    </button>
                    <button type="button" className="filter-pill" data-status-filter="active">
                        Active <span className="filter-count">0</span>
                    </button>
                    <button type="button" className="filter-pill" data-status-filter="pending">
                        Pending <span className="filter-count">0</span>
                    </button>
                    <button type="button" className="filter-pill" data-status-filter="finished">
                        Finished <span className="filter-count">0</span>
                    </button>
                </div>
                <div className="projects-sort-group">
                    <label htmlFor="project-sort-select" className="sort-label">
                        <span className="material-icons-round">sort</span>
                        <span>Sort:</span>
                    </label>
                    <select id="project-sort-select" className="sort-select">
                        <option value="name-asc">Name (A → Z)</option>
                        <option value="name-desc">Name (Z → A)</option>
                        <option value="cost-desc">Cost (High → Low)</option>
                        <option value="progress-desc">Progress (High → Low)</option>
                        <option value="date-asc">Finish Date (Earliest)</option>
                    </select>
                </div>
            </div>

            {/* Projects Grid (Dynamically populated by ProjectsManager) */}
            <section id="projects-list"></section>

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
