import * as React from "react";
import * as Router from "react-router-dom";
import { deleteDocument } from "../../core/database";
import { Project } from "../../classes/Project";
import { ProjectsManager } from "../../classes/ProjectsManager";
import { ProjectForm } from "../ProjectForm";

export interface ProjectInfoCardProps {
    project: Project;
    projectsManager: ProjectsManager;
    onProjectUpdated: () => void;
}

/**
 * Lesson 3.10 & Challenge: Decomposed Project Information Card
 * Uses reusable <ProjectForm /> for editing (adhering to SRP).
 * Features cloud document deletion with programmatic navigate("/").
 */
export function ProjectInfoCard(props: ProjectInfoCardProps) {
    const { project, projectsManager, onProjectUpdated } = props;
    const navigate = Router.useNavigate();

    const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);

    const initials = project.name.trim().slice(0, 2) || "PR";
    const percentage = Math.round((project.progress || 0) * 100);
    const dateObj = new Date(project.finishDate);
    const finishDateStr = isNaN(dateObj.getTime())
        ? String(project.finishDate)
        : dateObj.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

    const onOpenEditModal = () => setIsEditModalOpen(true);
    const onCloseEditModal = () => setIsEditModalOpen(false);

    // Lesson 4.5: Delete document from Cloud Firestore and programmatically navigate back to "/"
    const onDeleteProject = async () => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${project.name}" from Cloud Firestore and local workspace?`
        );
        if (!confirmed) return;

        try {
            await deleteDocument("projects", project.id);
        } catch (err) {
            console.error("Error deleting document from Firestore:", err);
        }
        projectsManager.deleteProject(project.id);
        projectsManager.activeProject = projectsManager.list[0] ?? null;
        navigate("/");
    };

    return (
        <>
            <article className="project-card details-card">
                {/* Top Row: Avatar on Left, Edit & Delete Actions on Right */}
                <div className="details-card-top">
                    <div
                        className="card-avatar-circle"
                        id="details-avatar"
                        data-project-info="avatar"
                        style={{ backgroundColor: project.iconColor || "#2563eb" }}
                    >
                        {initials}
                    </div>
                    <div className="details-actions-group" style={{ display: "flex", gap: "0.55rem", alignItems: "center" }}>
                        <button
                            type="button"
                            className="btn-edit"
                            id="edit-project-btn"
                            title="Edit Project Details"
                            onClick={onOpenEditModal}
                        >
                            <span className="material-icons-round">edit</span>
                            <span>Edit</span>
                        </button>
                        <button
                            type="button"
                            className="btn-delete"
                            id="delete-project-btn"
                            title="Delete Project"
                            onClick={onDeleteProject}
                        >
                            <span className="material-icons-round">delete</span>
                        </button>
                    </div>
                </div>

                {/* Project Title & Scope Description */}
                <div className="details-title-group">
                    <h3 id="details-card-title" data-project-info="name">
                        {project.name}
                    </h3>
                    <p
                        className="card-description"
                        id="details-card-desc"
                        data-project-info="description"
                    >
                        {project.description || "14-storey structural steel frame BIM coordination model."}
                    </p>
                </div>

                {/* 2x2 Key-Value Properties Grid */}
                <div className="details-properties-row">
                    <div className="prop-col">
                        <span className="prop-label">Status</span>
                        <span className="prop-val" id="details-status" data-project-info="status">
                            {project.status}
                        </span>
                    </div>
                    <div className="prop-col">
                        <span className="prop-label">Cost</span>
                        <span className="prop-val" id="details-cost" data-project-info="cost">
                            $ {Number(project.cost || 0).toLocaleString("en-US")}
                        </span>
                    </div>
                    <div className="prop-col">
                        <span className="prop-label">Role</span>
                        <span className="prop-val" id="details-role" data-project-info="role">
                            {project.userRole}
                        </span>
                    </div>
                    <div className="prop-col">
                        <span className="prop-label">Finish Date</span>
                        <span className="prop-val" id="details-date" data-project-info="finishDate">
                            {finishDateStr}
                        </span>
                    </div>
                </div>

                {/* Dynamic Progress Bar */}
                <div className="progress-bar-container">
                    <div
                        className="progress-bar-fill"
                        id="details-progress-fill"
                        data-project-info="progress"
                        style={{ width: `${percentage}%` }}
                    >
                        {percentage}%
                    </div>
                </div>
            </article>

            {/* Reusable Project Form (SRP: Edit Mode) */}
            <ProjectForm
                project={project}
                projectsManager={projectsManager}
                isOpen={isEditModalOpen}
                onClose={onCloseEditModal}
                onSuccess={() => {
                    onProjectUpdated();
                    onCloseEditModal();
                }}
            />
        </>
    );
}
