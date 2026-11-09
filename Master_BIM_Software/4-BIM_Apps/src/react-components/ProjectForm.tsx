import * as React from "react";
import { addDoc } from "firebase/firestore";
import { getCollection, updateDocument, sanitizeForFirestore } from "../core/database";
import { IProject, Project, ProjectStatus, UserRole, ModelType, PROJECT_ICON_COLORS } from "../classes/Project";
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
    const dialogRef = React.useRef<HTMLDialogElement | null>(null);
    const [formError, setFormError] = React.useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
    const [uploadedFileName, setUploadedFileName] = React.useState<string>(project?.ifcFileName || "");
    const [modelCategory, setModelCategory] = React.useState<"ifc" | "3d">(project?.modelCategory || (project?.ifcFileName ? "ifc" : "3d"));
    const [detectedSchema, setDetectedSchema] = React.useState<"IFC4" | "IFC2X3" | "IFC4.3" | undefined>(project?.ifcSchema);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        if (project) {
            setUploadedFileName(project.ifcFileName || "");
            setModelCategory(project.modelCategory || (project.ifcFileName ? "ifc" : "3d"));
            setDetectedSchema(project.ifcSchema);
        } else {
            setUploadedFile(null);
            setUploadedFileName("");
            setModelCategory("ifc");
            setDetectedSchema("IFC4");
        }
    }, [project, isOpen]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadedFile(file);
        setUploadedFileName(file.name);

        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
        if (ext === ".ifc") {
            setModelCategory("ifc");
            const schema = file.name.toLowerCase().includes("2x3") ? "IFC2X3" : "IFC4";
            setDetectedSchema(schema);
            file.arrayBuffer().then((buf) => {
                (window as any).__customIfcBuffers = (window as any).__customIfcBuffers || {};
                (window as any).__customIfcBuffers[file.name] = buf;
            });
        } else {
            setModelCategory("3d");
        }
    };

    const handleRemoveFile = () => {
        setUploadedFile(null);
        setUploadedFileName("");
        setModelCategory("3d");
        setDetectedSchema(undefined);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    React.useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (isOpen) {
            setFormError(null);
            if (!dialog.open) {
                dialog.showModal();
            }
        } else {
            if (dialog.open) {
                dialog.close();
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setFormError(null);
        const form = e.currentTarget;
        const formData = new FormData(form);

        const name = ((formData.get("name") as string) || "").trim();
        const description = ((formData.get("description") as string) || "").trim();
        const userRole = (formData.get("userRole") as UserRole) || "Architect";
        const status = (formData.get("status") as ProjectStatus) || "Active";

        // Explicit English Validation
        if (!name || name.length === 0) {
            setFormError("Project Name is required. Please enter a valid name.");
            const nameInput = form.querySelector("input[name='name']") as HTMLInputElement | null;
            nameInput?.focus();
            return;
        }

        if (name.length < 5) {
            setFormError("Project Name must be at least 5 characters long.");
            const nameInput = form.querySelector("input[name='name']") as HTMLInputElement | null;
            nameInput?.focus();
            return;
        }

        if (!description || description.length === 0) {
            setFormError("Project Description is required. Please specify the project scope.");
            const descInput = form.querySelector("textarea[name='description']") as HTMLTextAreaElement | null;
            descInput?.focus();
            return;
        }

        // Duplicate name validation
        const duplicate = projectsManager.list.find(
            (p) => (!isEditing || p.id !== project?.id) && p.name.toLowerCase() === name.toLowerCase()
        );
        if (duplicate) {
            setFormError(`A project with the name "${name}" already exists. Please choose a unique name.`);
            return;
        }

        const rawDate = formData.get("finishDate") as string;
        const parsedDate = rawDate ? new Date(rawDate) : new Date();
        const finishDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

        const rawCost = Number(formData.get("cost") ?? 100000);
        const cost = isNaN(rawCost) || rawCost < 0 ? 0 : rawCost;

        const rawProgress = Number(formData.get("progress") ?? 25);
        const clampedProgress = Math.min(100, Math.max(0, isNaN(rawProgress) ? 25 : rawProgress)) / 100;

        let finalModelCategory: "ifc" | "3d" = modelCategory;
        let ifcFileName: string | undefined = undefined;
        let ifcSchema: "IFC4" | "IFC2X3" | "IFC4.3" | undefined = undefined;
        let modelType: ModelType = "tower";

        if (uploadedFileName) {
            if (uploadedFileName.toLowerCase().endsWith(".ifc")) {
                finalModelCategory = "ifc";
                ifcFileName = uploadedFileName;
                ifcSchema = detectedSchema || (uploadedFileName.toLowerCase().includes("2x3") ? "IFC2X3" : "IFC4");
                const n = (name + " " + uploadedFileName).toLowerCase();
                if (n.includes("bridge") || n.includes("viaduct") || n.includes("span") || n.includes("pier") || n.includes("abutment") || n.includes("complex") || n.includes("nav-ipi") || n.includes("mbsd")) {
                    modelType = "bridge";
                } else if (n.includes("villa") || n.includes("house") || n.includes("residence")) {
                    modelType = "villa";
                } else if (n.includes("car") || n.includes("auto")) {
                    modelType = "car";
                } else if (n.includes("gear") || n.includes("plant") || n.includes("hvac")) {
                    modelType = "gear";
                } else {
                    modelType = "tower";
                }
            } else {
                finalModelCategory = "3d";
                const n = (name + " " + uploadedFileName).toLowerCase();
                if (n.includes("bridge") || n.includes("span")) modelType = "bridge";
                else if (n.includes("villa") || n.includes("residence")) modelType = "villa";
                else if (n.includes("car")) modelType = "car";
                else if (n.includes("gear")) modelType = "gear";
                else modelType = "tower";
            }
        } else if (project?.ifcFileName) {
            finalModelCategory = "ifc";
            ifcFileName = project.ifcFileName;
            ifcSchema = project.ifcSchema;
            modelType = project.modelType || "bridge";
        } else {
            finalModelCategory = "3d";
            modelType = project?.modelType || "tower";
        }

        const randomIndex = Math.floor(Math.random() * PROJECT_ICON_COLORS.length);
        const iconColor = (project?.iconColor && project.iconColor.trim())
            ? project.iconColor
            : PROJECT_ICON_COLORS[randomIndex];

        const projectPayload: IProject = {
            name,
            description,
            userRole,
            status,
            finishDate,
            cost,
            progress: clampedProgress,
            modelType,
            modelCategory,
            ifcFileName,
            ifcSchema,
            iconColor,
            todos: project?.todos ? project.todos : [],
        };

        const cleanPayload = sanitizeForFirestore(projectPayload);

        try {
            if (isEditing && project) {
                // Update in Cloud Firestore (with undefined values recursively stripped)
                await updateDocument<IProject>("projects", project.id, cleanPayload);
                // Update in local memory / ProjectsManager
                projectsManager.updateProject(project.id, cleanPayload);
                if (onSuccess) onSuccess(project);
            } else {
                // Create in Cloud Firestore (with undefined values recursively stripped)
                const docRef = await addDoc(projectsCollection, cleanPayload);
                // Create in local memory / ProjectsManager
                const created = projectsManager.newProject(cleanPayload, docRef.id);
                if (onSuccess) onSuccess(created);
            }

            if (dialogRef.current?.open) {
                dialogRef.current.close();
            }
            onClose();
        } catch (err: any) {
            console.error("Failed to save project:", err);
            const msg = err instanceof Error ? err.message : String(err);
            setFormError(`Error saving project: ${msg}`);
        }
    };

    const initialDate = project?.finishDate
        ? new Date(project.finishDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];

    const initialProgress = project?.progress !== undefined
        ? Math.round(project.progress * 100)
        : 25;

    return (
        <dialog
            ref={dialogRef}
            id="project-form-modal"
            className="project-form-dialog"
            onCancel={(e) => {
                e.preventDefault();
                onClose();
            }}
        >
            <form
                onSubmit={handleSubmit}
                id="new-project-form"
                noValidate
            >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                        <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700 }}>
                            {isEditing ? "Edit BIM Project" : "New BIM Project"}
                        </h2>
                        <span className="status-tag active" style={{ fontSize: "0.68rem", padding: "2px 8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            CDE Studio
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        title="Close Modal"
                        style={{
                            background: "transparent",
                            border: "none",
                            color: "#94a3b8",
                            cursor: "pointer",
                            padding: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "4px",
                        }}
                    >
                        <span className="material-icons-round" style={{ fontSize: "1.4rem" }}>close</span>
                    </button>
                </div>

                {/* Visible English Validation Error Banner */}
                {formError && (
                    <div
                        role="alert"
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            backgroundColor: "rgba(239, 68, 68, 0.15)",
                            border: "1px solid #ef4444",
                            color: "#fca5a5",
                            padding: "0.65rem 0.95rem",
                            borderRadius: "6px",
                            fontSize: "0.88rem",
                            fontWeight: 500,
                        }}
                    >
                        <span className="material-icons-round" style={{ color: "#ef4444", fontSize: "1.25rem", flexShrink: 0 }}>
                            error_outline
                        </span>
                        <span>{formError}</span>
                    </div>
                )}

                <div className="input-list">
                    <div className="form-field">
                        <label>
                            <span className="material-icons-round">corporate_fare</span> Project Name
                        </label>
                        <input
                            name="name"
                            type="text"
                            placeholder="e.g. Skyline Luxury Villa & Residence"
                            defaultValue={project?.name || ""}
                            style={{
                                borderColor: formError && formError.includes("Name") ? "#ef4444" : undefined,
                            }}
                        />
                        <p className="input-tip">TIP: Give it a clear name (min. 5 chars).</p>
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
                            style={{
                                borderColor: formError && formError.includes("Description") ? "#ef4444" : undefined,
                            }}
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

                    <div className="form-field full-width" style={{ marginTop: "0.25rem" }}>
                            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.45rem" }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                    <span className="material-icons-round" style={{ fontSize: "18px", color: "var(--primary-blue)" }}>view_in_ar</span>
                                    <span>3D Model or IFC OpenBIM File</span>
                                </span>
                                {uploadedFileName && (
                                    <span className="badge-model-type" style={{
                                        fontSize: "0.74rem",
                                        fontWeight: 600,
                                        padding: "2px 8px",
                                        borderRadius: "12px",
                                        background: modelCategory === "ifc" ? "rgba(16, 185, 129, 0.18)" : "rgba(56, 189, 248, 0.18)",
                                        color: modelCategory === "ifc" ? "#34d399" : "#38bdf8",
                                        border: modelCategory === "ifc" ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(56, 189, 248, 0.35)",
                                    }}>
                                        {modelCategory === "ifc" ? `IFC OpenBIM (${detectedSchema || "IFC4"})` : "3D Model"}
                                    </span>
                                )}
                            </label>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".ifc,.obj,.gltf,.glb"
                                style={{ display: "none" }}
                                onChange={handleFileSelect}
                            />

                            {uploadedFileName ? (
                                <div className="model-file-attached" style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    background: "rgba(15, 23, 42, 0.75)",
                                    border: "1px solid rgba(56, 189, 248, 0.4)",
                                    borderRadius: "6px",
                                    padding: "0.6rem 0.85rem",
                                    gap: "10px",
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                                        <span className="material-icons-round" style={{
                                            fontSize: "24px",
                                            color: modelCategory === "ifc" ? "#34d399" : "#38bdf8",
                                            flexShrink: 0,
                                        }}>
                                            {modelCategory === "ifc" ? "apartment" : "view_in_ar"}
                                        </span>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{
                                                color: "#f8fafc",
                                                fontWeight: 600,
                                                fontSize: "0.88rem",
                                                whiteSpace: "nowrap",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                            }}>
                                                {uploadedFileName}
                                            </div>
                                            <div style={{ color: "var(--text-secondary)", fontSize: "0.76rem" }}>
                                                {uploadedFile ? `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB · ` : ""}Ready for BIM World & 3D Viewer
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                background: "rgba(30, 41, 59, 0.8)",
                                                border: "1px solid var(--border-color)",
                                                color: "var(--text-secondary)",
                                                borderRadius: "4px",
                                                padding: "4px 8px",
                                                fontSize: "0.78rem",
                                                cursor: "pointer",
                                            }}
                                            title="Choose a different model"
                                        >
                                            Change
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleRemoveFile}
                                            style={{
                                                background: "rgba(239, 68, 68, 0.15)",
                                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                                color: "#ef4444",
                                                borderRadius: "4px",
                                                padding: "4px 6px",
                                                display: "inline-flex",
                                                alignItems: "center",
                                                cursor: "pointer",
                                            }}
                                            title="Remove uploaded model"
                                        >
                                            <span className="material-icons-round" style={{ fontSize: "16px" }}>close</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: "6px",
                                        width: "100%",
                                        padding: "1rem",
                                        background: "rgba(15, 23, 42, 0.6)",
                                        border: "1.5px dashed rgba(56, 189, 248, 0.45)",
                                        borderRadius: "8px",
                                        color: "#f8fafc",
                                        cursor: "pointer",
                                        transition: "all 0.2s ease",
                                    }}
                                    className="btn-upload-model-dropzone"
                                >
                                    <span className="material-icons-round" style={{ fontSize: "28px", color: "var(--primary-blue)" }}>
                                        cloud_upload
                                    </span>
                                    <span style={{ fontSize: "0.92rem", fontWeight: 600 }}>
                                        Upload 3D Model or IFC File
                                    </span>
                                    <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                                        Click to browse (.ifc, .obj, .gltf, .glb)
                                    </span>
                                </button>
                            )}
                        </div>
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        onClick={() => {
                            if (dialogRef.current?.open) {
                                dialogRef.current.close();
                            }
                            onClose();
                        }}
                        className="btn-cancel"
                    >
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
