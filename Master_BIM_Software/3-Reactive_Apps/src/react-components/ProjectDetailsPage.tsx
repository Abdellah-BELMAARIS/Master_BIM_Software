import * as React from "react";
import * as Router from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../core/database";
import { IProject, Project } from "../classes/Project";
import { ProjectsManager } from "../classes/ProjectsManager";
import { ProjectInfoCard } from "./details/ProjectInfoCard";
import { ProjectTasksList } from "./details/ProjectTasksList";
import { ProjectNotFound } from "./details/ProjectNotFound";
import { ThreeViewer } from "./ThreeViewer";

export interface ProjectDetailsPageProps {
    projectsManager: ProjectsManager;
}

/**
 * Modular ProjectDetailsPage
 * Features:
 * - Direct Firestore reload recovery (fixes the common blank page on refresh when navigating directly to /project/:id)
 * - Single Responsibility decomposed cards: ProjectInfoCard & ProjectTasksList
 * - Encapsulated ThreeViewer with WebGL lifecycle cleanup
 */
export function ProjectDetailsPage(props: ProjectDetailsPageProps) {
    const { projectsManager } = props;
    const routeParams = Router.useParams<{ id: string }>();
    const projectId = routeParams.id;

    const [isLoadingFromCloud, setIsLoadingFromCloud] = React.useState(false);
    const [, setTick] = React.useState(0);
    const forceUpdate = () => setTick((t) => t + 1);

    // 1. Check local ProjectsManager memory first
    let project = projectId ? projectsManager.getProject(projectId) : null;

    // 2. Direct Firestore fallback: If page is refreshed directly on /project/:id, fetch from Cloud Firestore
    React.useEffect(() => {
        if (!projectId || project) return;

        let isMounted = true;
        const fetchProjectFromCloud = async () => {
            setIsLoadingFromCloud(true);
            try {
                const docRef = doc(db, "projects", projectId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists() && isMounted) {
                    const data = docSnap.data() as any;
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
                        todos: data.todos || [],
                    };

                    try {
                        projectsManager.newProject(projectData, docSnap.id);
                    } catch {
                        // Project might already exist
                    }
                    forceUpdate();
                }
            } catch (err) {
                console.error("Failed to recover project from Cloud Firestore:", err);
            } finally {
                if (isMounted) {
                    setIsLoadingFromCloud(false);
                }
            }
        };

        fetchProjectFromCloud();

        return () => {
            isMounted = false;
        };
    }, [projectId, project, projectsManager]);

    // Re-query after potential state update
    project = projectId ? projectsManager.getProject(projectId) : null;

    // Guard 1: Missing ID in URL parameters
    if (!projectId) {
        return (
            <ProjectNotFound
                title="Missing Project ID"
                message="A project ID parameter is required in the URL to view details. Example: /project/<uuid>"
            />
        );
    }

    // Loading state while fetching from Cloud Firestore on hard refresh
    if (!project && isLoadingFromCloud) {
        return (
            <div className="page" id="project-details" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
                <div style={{ textAlign: "center", color: "var(--color-primary, #60a5fa)" }}>
                    <span className="material-icons-round" style={{ fontSize: "48px", animation: "spin 1s linear infinite" }}>
                        autorenew
                    </span>
                    <p style={{ marginTop: "12px", fontSize: "16px", color: "#94a3b8" }}>
                        Loading BIM Project from Cloud Firestore...
                    </p>
                </div>
            </div>
        );
    }

    // Guard 2: Project not found anywhere (local or cloud)
    if (!project) {
        return (
            <ProjectNotFound
                title="Project Not Found"
                message={`The project with ID "${projectId}" does not exist in your CDE workspace.`}
            />
        );
    }

    if (projectsManager.activeProject?.id !== project.id) {
        projectsManager.activeProject = project;
    }

    return (
        <div className="page" id="project-details">
            {/* Details Header */}
            <header id="details-header">
                <div className="details-header-left">
                    <Router.Link
                        to="/"
                        className="btn-back-projects"
                        id="back-to-projects-btn"
                        title="Back to Projects List"
                    >
                        <span className="material-icons-round">arrow_back</span>
                    </Router.Link>
                    <div className="header-title-box">
                        <span className="header-eyebrow">PROJECT CDE / 3D COORDINATION</span>
                        <h2 id="details-page-title">{project.name}</h2>
                        <p id="details-page-desc">{project.description}</p>
                    </div>
                </div>
                <div className="details-header-right">
                    <span className="bim-coord-badge">
                        <span className="material-icons-round">view_in_ar</span>
                        <span>IFC4 · LOD 350</span>
                    </span>
                </div>
            </header>

            {/* Details Content Grid: Left Column (Modular Cards/ToDos) + Right Column (3D Viewer) */}
            <div className="main-page-content">
                <div className="details-left-column">
                    <ProjectInfoCard
                        project={project}
                        projectsManager={projectsManager}
                        onProjectUpdated={forceUpdate}
                    />
                    <ProjectTasksList
                        project={project}
                        onTodosUpdated={forceUpdate}
                    />
                </div>

                {/* Right Column: Encapsulated Three.js Viewer (Lesson 3.12 & 3.13) */}
                <ThreeViewer project={project} projectsManager={projectsManager} />
            </div>
        </div>
    );
}
