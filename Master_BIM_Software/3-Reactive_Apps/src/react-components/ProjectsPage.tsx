import * as React from "react";
import * as Router from "react-router-dom";
import { getDocs } from "firebase/firestore";
import { getCollection, deleteDocument } from "../core/database";
import { IProject, Project, ProjectStatus, UserRole } from "../classes/Project";
import { ProjectsManager } from "../classes/ProjectsManager";
import { ProjectCard } from "./ProjectCard";
import { SearchBox } from "./SearchBox";
import { ProjectForm } from "./ProjectForm";

export interface ProjectsPageProps {
    projectsManager?: ProjectsManager;
}

// Lesson 4.4: Master collection reference declared outside component (Module Scope optimization)
const projectsCollection = getCollection<IProject>("projects");

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
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = React.useState<boolean>(false);

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

    // Lesson 4.3 & 4.4: Retrieving collection documents using master generic collection reference
    React.useEffect(() => {
        const getFirestoreProjects = async () => {
            try {
                const querySnapshot = await getDocs(projectsCollection);

                for (const doc of querySnapshot.docs) {
                    const data = doc.data() as any;
                    const rawDate = data.finishDate;
                    let finishDate: Date;
                    if (rawDate && typeof rawDate.toDate === "function") {
                        finishDate = rawDate.toDate();
                    } else if (rawDate) {
                        finishDate = new Date(rawDate);
                    } else {
                        finishDate = new Date();
                    }

                    const projectData: IProject = {
                        name: data.name || "Untitled Project",
                        description: data.description || "",
                        status: data.status || "Active",
                        userRole: data.userRole || "Architect",
                        finishDate,
                        cost: Number(data.cost || 0),
                        progress: Number(data.progress || 0),
                        modelType: data.modelType || "cube",
                        iconColor: data.iconColor,
                        todos: data.todos,
                    };

                    try {
                        projectsManager.newProject(projectData, doc.id);
                    } catch {
                        // Lesson 4.3 Assignment: If project already exists (e.g. on navigation re-mount), update it!
                        const existing =
                            projectsManager.getProject(doc.id) ||
                            projectsManager.getProjectByName(projectData.name);
                        if (existing) {
                            projectsManager.updateProject(existing.id, projectData);
                        }
                    }
                }

                setProjects([...projectsManager.list]);
            } catch (error) {
                console.error("Error fetching Firestore projects:", error);
            }
        };

        getFirestoreProjects();
    }, []);

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

    // Lesson 3.4 & Challenge: Callback to open the New Project modal (managed via state & ProjectForm)
    const onNewProjectClick = () => {
        setIsNewProjectModalOpen(true);
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

    // Lesson 3.11: Project search function passed as onChange prop to SearchBox
    const onSearchProjects = (value: string) => {
        setSearchQuery(value);
        const filtered = projectsManager.filterProjects(value);
        setProjects(filtered);
    };
    const projectSearch = onSearchProjects;



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

    const onDeleteProjectCard = async (proj: Project) => {
        const confirmed = window.confirm(`Are you sure you want to delete "${proj.name}" from Cloud Firestore and workspace?`);
        if (!confirmed) return;
        try {
            await deleteDocument("projects", proj.id);
        } catch (err) {
            console.error("Failed to delete project from Firestore:", err);
        }
        projectsManager.deleteProject(proj.id);
        setProjects([...projectsManager.list]);
    };

    // Lesson 3.5, 3.7, 3.8 & 3.9: Map projects state to <ProjectCard /> wrapped in dynamic <Router.Link to={`/project/${project.id}`}>
    const projectCards = visibleProjects.map((project) => (
        <Router.Link
            to={`/project/${project.id}`}
            key={project.id}
            onClick={() => {
                projectsManager.activeProject = project;
            }}
        >
            <ProjectCard project={project} onDelete={onDeleteProjectCard} />
        </Router.Link>
    ));



    return (
        <div className="page" id="projects-page">
            {/* Module 3 Challenge: Reusable ProjectForm Component (SRP) */}
            <ProjectForm
                isOpen={isNewProjectModalOpen}
                projectsManager={projectsManager}
                onClose={() => setIsNewProjectModalOpen(false)}
                onSuccess={() => setProjects([...projectsManager.list])}
            />

            {/* Top Action Header (Lesson 3.11: SearchBox placed between title and action buttons) */}
            <header id="main-header">
                <div className="header-title-box">
                    <span className="header-eyebrow">CDE WORKSPACE / MODELS</span>
                    <h2>BIM Projects</h2>
                </div>
                <SearchBox onChange={onSearchProjects} />
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

            {/* Status Filter & Sort Toolbar */}
            <div className="projects-toolbar">
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
                                        setProjects([...projectsManager.list]);
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
