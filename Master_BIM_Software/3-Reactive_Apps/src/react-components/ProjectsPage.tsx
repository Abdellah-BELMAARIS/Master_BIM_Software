import * as React from "react";
import * as Router from "react-router-dom";
import { getDocs, addDoc } from "firebase/firestore";
import { getCollection, deleteDocument, sanitizeForFirestore } from "../core/database";
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

    const navigate = Router.useNavigate();

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

                    // Cleanly upgrade placeholder "Default Project" if present in Firestore
                    let projectName = data.name || "Untitled Project";
                    let projectDesc = data.description || "";
                    let projectCost = Number(data.cost || 0);
                    let projectProgress = Number(data.progress || 0);
                    let projectModelType: ModelType = data.modelType || "cube";
                    let projectIcon = data.iconColor;

                    if (projectName.toLowerCase() === "default project" || projectName.toLowerCase() === "untitled project") {
                        projectName = "BIM Modular Innovation Pavilion";
                        projectDesc = "Modular architectural exhibition pavilion with exposed rebar grid, polished terrazzo floor, and cantilevered LED canopy.";
                        projectCost = 120000;
                        projectProgress = 0.80;
                        projectModelType = "cube";
                        projectIcon = "#2563eb";
                    }

                    const projectData: IProject = {
                        name: projectName,
                        description: projectDesc,
                        status: data.status || "Active",
                        userRole: data.userRole || "Architect",
                        finishDate,
                        cost: projectCost,
                        progress: projectProgress,
                        modelType: projectModelType,
                        iconColor: projectIcon,
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

                // Ensure the 3 signature 3D showcase projects exist so the app is always fully loaded and impressive
                const SHOWCASE_PROJECTS: IProject[] = [
                    {
                        name: "Azure Coast Eco-Villa",
                        description: "Ultra-luxury Mediterranean architectural villa featuring infinity pool, teakwood deck, and smart bioclimatic shading.",
                        status: "Active",
                        userRole: "Architect",
                        finishDate: new Date("2026-12-15"),
                        cost: 485000,
                        progress: 0.65,
                        modelType: "villa",
                        iconColor: "#38bdf8",
                        todos: [
                            { id: 1, text: "Hydraulic excavation for cantilevered infinity pool", completed: true },
                            { id: 2, text: "Structural glulam timber deck & panoramic curtain wall", completed: true },
                            { id: 3, text: "Interior living area furniture & recessed LED ambient setup", completed: false }
                        ]
                    },
                    {
                        name: "Urban Logistics EV Center",
                        description: "Autonomous commercial fleet hub with high-speed EV chargers, structural steel canopy, and showroom flooring.",
                        status: "Active",
                        userRole: "Engineer",
                        finishDate: new Date("2026-11-30"),
                        cost: 320000,
                        progress: 0.40,
                        modelType: "car",
                        iconColor: "#22c55e",
                        todos: [
                            { id: 1, text: "High-voltage grid connection & showroom epoxy floor", completed: true },
                            { id: 2, text: "Civil autonomous transport bay calibration", completed: false }
                        ]
                    },
                    {
                        name: "Mechanical HVAC Plant Core",
                        description: "High-performance central industrial chiller & titanium transmission gear assembly for district cooling.",
                        status: "Pending",
                        userRole: "BIM Specialist",
                        finishDate: new Date("2027-01-20"),
                        cost: 195000,
                        progress: 0.20,
                        modelType: "gear",
                        iconColor: "#f59e0b",
                        todos: [
                            { id: 1, text: "PBR metallic surface tolerance & vibration damping analysis", completed: true },
                            { id: 2, text: "Primary chilled water loop balancing & BMS integration", completed: false }
                        ]
                    },
                    {
                        name: "Apex Parametric Skyscraper",
                        description: "28-story corporate commercial high-rise with double-skin curtain wall glass, exterior diagrid steel, and rooftop helipad.",
                        status: "Active",
                        userRole: "Architect",
                        finishDate: new Date("2027-06-30"),
                        cost: 1450000,
                        progress: 0.55,
                        modelType: "tower",
                        iconColor: "#7c3aed",
                        todos: [
                            { id: 1, text: "Perimeter diagrid steel exoskeleton erection (floors 1-18)", completed: true },
                            { id: 2, text: "Sky Garden cantilever terrace & biophilic lounge fit-out", completed: true },
                            { id: 3, text: "Rooftop helipad landing ring & aviation beacon strobe setup", completed: false }
                        ]
                    },
                    {
                        name: "Nordic Span Cable-Stayed Bridge",
                        description: "Monumental dual-pylon cable-stayed suspension bridge over deep fjord with 32 tension stay cables and roadway LED luminaires.",
                        status: "Active",
                        userRole: "Engineer",
                        finishDate: new Date("2027-09-15"),
                        cost: 2850000,
                        progress: 0.35,
                        modelType: "bridge",
                        iconColor: "#0f766e",
                        todos: [
                            { id: 1, text: "Submerged marine caisson pier foundations & cofferdam dewatering", completed: true },
                            { id: 2, text: "A-frame slip-form concrete pylon tower climbing formwork", completed: true },
                            { id: 3, text: "Aerodynamic box girder deck lifting & stay cable tension balancing", completed: false }
                        ]
                    },
                    {
                        name: "BIM Modular Innovation Pavilion",
                        description: "Modular architectural exhibition pavilion with exposed rebar grid, polished terrazzo floor, and cantilevered LED canopy.",
                        status: "Active",
                        userRole: "Architect",
                        finishDate: new Date("2026-11-20"),
                        cost: 120000,
                        progress: 0.80,
                        modelType: "cube",
                        iconColor: "#2563eb",
                        todos: [
                            { id: 1, text: "Reinforced concrete footing & rebar cage placement", completed: true },
                            { id: 2, text: "Structural steel column bolting & torque inspection", completed: true },
                            { id: 3, text: "Recessed linear LED lighting & curtain wall glazing", completed: false }
                        ]
                    }
                ];

                for (const showcase of SHOWCASE_PROJECTS) {
                    const exists = projectsManager.list.some(
                        (p) => p.modelType === showcase.modelType || p.name.toLowerCase() === showcase.name.toLowerCase()
                    );
                    if (!exists) {
                        try {
                            const p = projectsManager.newProject(showcase);
                            addDoc(projectsCollection, sanitizeForFirestore(showcase))
                                .then((docRef) => { p.id = docRef.id; })
                                .catch(() => {});
                        } catch {
                            // ignore duplicate error
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
            style={{ display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit", height: "100%", width: "100%" }}
            onClick={() => {
                projectsManager.activeProject = project;
            }}
        >
            <ProjectCard
                project={project}
                onClick={() => {
                    projectsManager.activeProject = project;
                    navigate(`/project/${project.id}`);
                }}
                onDelete={onDeleteProjectCard}
            />
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
