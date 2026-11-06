import * as React from "react";
import * as Router from "react-router-dom";
import { IProject, Project, ProjectStatus, UserRole } from "../../classes/Project";
import { ProjectsManager } from "../../classes/ProjectsManager";

export interface ProjectInfoCardProps {
    project: Project;
    projectsManager: ProjectsManager;
    onProjectUpdated: () => void;
}

// Lesson 3.10 Modularity Challenge: Decomposed Project Information Card with Edit & Delete actions
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

    const onEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const rawDate = formData.get("finishDate") as string;
        const parsedDate = rawDate ? new Date(rawDate) : new Date();
        const rawCost = Number(formData.get("cost") ?? 0);
        const rawProgress = Number(formData.get("progress") ?? 25);
        const clampedProgress = Math.min(100, Math.max(0, isNaN(rawProgress) ? 25 : rawProgress)) / 100;
        const selectedModelType = (formData.get("modelType") as "cube" | "gear") || "cube";

        const updatedData: IProject = {
            name: (formData.get("name") as string).trim(),
            description: (formData.get("description") as string).trim(),
            userRole: formData.get("userRole") as UserRole,
            status: formData.get("status") as ProjectStatus,
            finishDate: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
            cost: isNaN(rawCost) ? 0 : rawCost,
            progress: clampedProgress,
            modelType: selectedModelType,
        };

        try {
            projectsManager.updateProject(project.id, updatedData);
            onCloseEditModal();
            onProjectUpdated();
        } catch (err: any) {
            const errorMsgEl = document.getElementById("error-modal-message");
            const errorModal = document.getElementById("error-modal");
            if (errorModal && errorModal instanceof HTMLDialogElement && errorMsgEl) {
                errorMsgEl.textContent = err instanceof Error ? err.message : String(err);
                errorModal.showModal();
            } else {
                alert(err);
            }
        }
    };

    const onDeleteProject = () => {
        projectsManager.deleteProject(project.id);
        projectsManager.activeProject = projectsManager.list[0] ?? null;
        navigate("/");
    };

    return (
        <>
            <article className="project-card details-card">
                <div className="details-card-top">
                    <div
                        className="card-avatar-circle"
                        id="details-avatar"
                        data-project-info="avatar"
                        style={{ backgroundColor: project.iconColor }}
                    >
                        {initials}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <button
                            type="button"
                            className="btn-edit"
                            id="edit-project-btn"
                            onClick={onOpenEditModal}
                        >
                            <span className="material-icons-round" style={{ fontSize: "1rem" }}>
                                edit
                            </span>
                            <span>Edit</span>
                        </button>
                        <button
                            type="button"
                            className="btn-delete"
                            id="delete-project-btn"
                            title="Delete Project"
                            onClick={onDeleteProject}
                        >
                            <span className="material-icons-round" style={{ fontSize: "1.1rem" }}>
                                delete
                            </span>
                        </button>
                    </div>
                </div>

                <div className="details-title-group">
                    <h3 id="details-card-title" data-project-info="name">
                        {project.name}
                    </h3>
                    <p id="details-card-desc" data-project-info="description">
                        {project.description}
                    </p>
                </div>

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

                {/* Lesson 3.10: Dynamic Progress Bar Width via Template String */}
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

            {/* Edit Project Dialog */}
            {isEditModalOpen && (
                <dialog id="edit-project-details-modal" open>
                    <form onSubmit={onEditSubmit} id="new-project-form">
                        <h2>Edit Project</h2>
                        <div className="input-list">
                            <div className="form-field">
                                <label>
                                    <span className="material-icons-round">corporate_fare</span> Name
                                </label>
                                <input
                                    name="name"
                                    type="text"
                                    defaultValue={project.name}
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
                                    cols={30}
                                    rows={3}
                                    defaultValue={project.description}
                                />
                            </div>

                            <div className="form-row-2col">
                                <div className="form-field">
                                    <label>
                                        <span className="material-icons-round">person</span> Role
                                    </label>
                                    <select name="userRole" defaultValue={project.userRole}>
                                        <option value="Architect">Architect</option>
                                        <option value="Engineer">Engineer</option>
                                        <option value="Developer">Developer</option>
                                    </select>
                                </div>

                                <div className="form-field">
                                    <label>
                                        <span className="material-icons-round">help_outline</span> Status
                                    </label>
                                    <select name="status" defaultValue={project.status}>
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
                                        min={0}
                                        step={1000}
                                        defaultValue={project.cost}
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        <span className="material-icons-round">trending_up</span> Progress (%)
                                    </label>
                                    <input
                                        name="progress"
                                        type="number"
                                        min={0}
                                        max={100}
                                        defaultValue={percentage}
                                    />
                                </div>
                            </div>

                            <div className="form-row-2col">
                                <div className="form-field">
                                    <label>
                                        <span className="material-icons-round">calendar_today</span> Finish Date
                                    </label>
                                    <input
                                        name="finishDate"
                                        type="date"
                                        lang="en"
                                        defaultValue={
                                            !isNaN(dateObj.getTime())
                                                ? dateObj.toISOString().split("T")[0]
                                                : ""
                                        }
                                    />
                                </div>

                                <div className="form-field">
                                    <label>
                                        <span className="material-icons-round">view_in_ar</span> 3D Model Type
                                    </label>
                                    <select name="modelType" defaultValue={project.modelType || "cube"}>
                                        <option value="cube">Cube Massing Model</option>
                                        <option value="gear">Mechanical Gear HVAC</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                onClick={onCloseEditModal}
                                className="btn-cancel"
                            >
                                Cancel
                            </button>
                            <button type="submit" className="btn-accept">
                                Save Changes
                            </button>
                        </div>
                    </form>
                </dialog>
            )}
        </>
    );
}

