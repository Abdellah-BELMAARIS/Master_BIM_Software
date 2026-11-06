import * as React from "react";
import { addDoc } from "firebase/firestore";
import { getCollection, updateDocument } from "../core/database";
import { IProject, Project, ProjectStatus, UserRole } from "../classes/Project";
import { ProjectsManager } from "../classes/ProjectsManager";

export interface ProjectFormProps {
    project?: Project | null;
    projectsManager: ProjectsManager;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (savedProject: Project) => void;
}

const projectsCollection = getCollection<IProject>("projects");

/**
 * Module 3 Challenge: Reusable Project Form Component
 * Strictly adheres to the Single Responsibility Principle (SRP).
 * Handles both project creation and updating locally and in Cloud Firestore.
 */
export function ProjectForm(props: ProjectFormProps) {
    const { project, projectsManager, isOpen, onClose, onSuccess } = props;
    const isEditing = Boolean(project);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);

        const name = ((formData.get("name") as string) || "").trim();
        const description = ((formData.get("description") as string) || "").trim();
        const userRole = (formData.get("userRole") as UserRole) || "Architect";
        const status = (formData.get("status") as ProjectStatus) || "Active";

        const rawDate = formData.get("finishDate") as string;
        const parsedDate = rawDate ? new Date(rawDate) : new Date();
        const finishDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

        const rawCost = Number(formData.get("cost") ?? 100000);
        const cost = isNaN(rawCost) || rawCost < 0 ? 0 : rawCost;

        const rawProgress = Number(formData.get("progress") ?? 25);
        const clampedProgress = Math.min(100, Math.max(0, isNaN(rawProgress) ? 25 : rawProgress)) / 100;

        const modelType = (formData.get("modelType") as "cube" | "gear") || "cube";

        const projectPayload: IProject = {
            name,
            description,
            userRole,
            status,
            finishDate,
            cost,
            progress: clampedProgress,
            modelType,
            iconColor: project ? project.iconColor : undefined,
            todos: project ? project.todos : [],
        };

        try {
            if (isEditing && project) {
                // Update in Cloud Firestore
                await updateDocument<IProject>("projects", project.id, projectPayload);
                // Update in local memory / ProjectsManager
                projectsManager.updateProject(project.id, projectPayload);
                if (onSuccess) onSuccess(project);
            } else {
                // Create in Cloud Firestore
                const docRef = await addDoc(projectsCollection, projectPayload);
                // Create in local memory / ProjectsManager
                const created = projectsManager.newProject(projectPayload, docRef.id);
                if (onSuccess) onSuccess(created);
            }
            onClose();
        } catch (err: any) {
            console.error("Failed to save project:", err);
            alert(`Error saving project: ${err instanceof Error ? err.message : String(err)}`);
        }
    };

    const initialDate = project?.finishDate
        ? new Date(project.finishDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

    const initialProgress = project?.progress !== undefined
        ? Math.round(project.progress * 100)
        : 25;

    return (
        <dialog open id="project-form-modal" className="project-form-dialog">
            <form
                onSubmit={handleSubmit}
                id="reusable-project-form"
                onInvalid={(e) => {
                    const target = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
                    if (target && "validity" in target) {
                        if (target.validity.valueMissing) {
                            target.setCustomValidity("Please fill out this field.");
                        } else if (target.validity.tooShort) {
                            target.setCustomValidity("Project name must be at least 5 characters.");
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
                <h2>{isEditing ? "Edit BIM Project" : "New BIM Project"}</h2>
                <div className="input-list">
                    <div className="form-field">
                        <label>
                            <span className="material-icons-round">corporate_fare</span> Project Name
                        </label>
                        <input
                            name="name"
                            type="text"
                            placeholder="e.g. Riverfront Promenade"
                            defaultValue={project?.name || ""}
                            required
                            minLength={5}
                        />
                        <p className="input-tip">TIP: Give it a short name (min. 5 chars).</p>
                    </div>

                    <div className="form-field">
                        <label>
                            <span className="material-icons-round">subject</span> Description
                        </label>
                        <textarea
                            name="description"
                            placeholder="Enter architectural & structural scope description..."
                            defaultValue={project?.description || ""}
                            rows={3}
                        />
                    </div>

                    <div className="form-row-2col">
                        <div className="form-field">
                            <label>
                                <span className="material-icons-round">badge</span> Role
                            </label>
                            <select name="userRole" defaultValue={project?.userRole || "Architect"}>
                                <option value="Architect">Architect</option>
                                <option value="Engineer">Engineer</option>
                                <option value="Developer">Developer</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label>
                                <span className="material-icons-round">timelapse</span> Status
                            </label>
                            <select name="status" defaultValue={project?.status || "Active"}>
                                <option value="Pending">Pending</option>
                                <option value="Active">Active</option>
                                <option value="Finished">Finished</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row-2col">
                        <div className="form-field">
                            <label>
                                <span className="material-icons-round">payments</span> Estimated Cost ($)
                            </label>
                            <input
                                name="cost"
                                type="number"
                                defaultValue={project?.cost !== undefined ? project.cost : 100000}
                                min={0}
                                step={1000}
                            />
                        </div>

                        <div className="form-field">
                            <label>
                                <span className="material-icons-round">trending_up</span> Progress (%)
                            </label>
                            <input
                                name="progress"
                                type="number"
                                defaultValue={initialProgress}
                                min={0}
                                max={100}
                            />
                        </div>
                    </div>

                    <div className="form-row-2col">
                        <div className="form-field">
                            <label>
                                <span className="material-icons-round">calendar_today</span> Target Finish Date
                            </label>
                            <input
                                name="finishDate"
                                type="date"
                                lang="en-US"
                                defaultValue={initialDate}
                            />
                        </div>

                        <div className="form-field">
                            <label>
                                <span className="material-icons-round">view_in_ar</span> 3D BIM Model
                            </label>
                            <select name="modelType" defaultValue={project?.modelType || "cube"}>
                                <option value="cube">Architectural Slab (Cube)</option>
                                <option value="gear">Mechanical Core (Gear)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" onClick={onClose} className="btn-cancel">
                        Cancel
                    </button>
                    <button type="submit" className="btn-accept">
                        {isEditing ? "Save Changes" : "Create Project"}
                    </button>
                </div>
            </form>
        </dialog>
    );
}

