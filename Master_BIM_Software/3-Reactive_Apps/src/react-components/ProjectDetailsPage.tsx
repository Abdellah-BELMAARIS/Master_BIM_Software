import * as React from "react";
import * as Router from "react-router-dom";
import { ProjectsManager } from "../classes/ProjectsManager";
import { ProjectInfoCard } from "./details/ProjectInfoCard";
import { TodoList } from "./details/TodoList";
import { ProjectNotFound } from "./details/ProjectNotFound";
import { ThreeViewer } from "./ThreeViewer";

export interface ProjectDetailsPageProps {
    projectsManager: ProjectsManager;
}

// Lesson 3.8, 3.9, 3.10, 3.12 & 3.13: Modular ProjectDetailsPage with <ThreeViewer /> & Unmount Disposal
export function ProjectDetailsPage(props: ProjectDetailsPageProps) {
    const { projectsManager } = props;
    const routeParams = Router.useParams<{ id: string }>();

    // Lesson 3.10 Conditional Rendering Guard 1: Missing ID in URL parameters
    if (!routeParams.id) {
        return (
            <ProjectNotFound
                title="Missing Project ID"
                message="A project ID parameter is required in the URL to view details. Example: /project/<uuid>"
            />
        );
    }

    // Lesson 3.10 Conditional Rendering Guard 2: Project not found for the given ID
    const project = projectsManager.getProject(routeParams.id);
    if (!project) {
        return (
            <ProjectNotFound
                title="Project Not Found"
                message={`The project with ID "${routeParams.id}" does not exist in your CDE workspace.`}
            />
        );
    }

    if (projectsManager.activeProject?.id !== project.id) {
        projectsManager.activeProject = project;
    }

    const [, setTick] = React.useState(0);
    const forceUpdate = () => setTick((t) => t + 1);

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
                    <TodoList project={project} onTodosUpdated={forceUpdate} />
                </div>

                {/* Right Column: Encapsulated Three.js Viewer (Lesson 3.12 & 3.13) */}
                <ThreeViewer project={project} projectsManager={projectsManager} />
            </div>
        </div>
    );
}
