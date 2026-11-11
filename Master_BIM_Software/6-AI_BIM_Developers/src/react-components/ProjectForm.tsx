import * as React from "react";
import { addDoc } from "firebase/firestore";
import { getCollection, updateDocument, sanitizeForFirestore } from "../core/database";
import { IProject, Project, ProjectStatus, UserRole, ModelType, PROJECT_ICON_COLORS } from "../classes/Project";
import { ProjectsManager } from "../classes/ProjectsManager";

export interface ProjectFormProps {
    project?: Project | null;
    projectsManager: ProjectsManager;
    isOpen: boolean;
    defaultCategory?: "ifc" | "3d" | "empty";
    onClose: () => void;
    onSuccess?: (savedProject: Project) => void;
}

const projectsCollection = getCollection<IProject>("projects");

const READY_IFC_MODELS: {
    fileName: string;
    label: string;
    schema: "IFC4" | "IFC2X3";
    twinType: ModelType;
}[] = [
    { fileName: "aurora_ten_villa_estate_ifc4.ifc", label: "Ready IFC4: 10-Villa Residential Estate", schema: "IFC4", twinType: "villa" },
    { fileName: "atlas_grand_professional_stadium_ifc4.ifc", label: "Ready IFC4: Atlas Grand Football Stadium", schema: "IFC4", twinType: "tower" },
    { fileName: "MBSD-TOC-P01-MOD-EST-001.ifc", label: "Ready IFC4: ProVI Civil Overpass & Viaduct", schema: "IFC4", twinType: "bridge" },
    { fileName: "HNS-CTL-N01-MOD-ARQ.ifc", label: "Ready IFC2X3: Metropolitan Civic Center (Arch)", schema: "IFC2X3", twinType: "villa" },
    { fileName: "HNS-CTL-ZZZ-MOD-EST.ifc", label: "Ready IFC2X3: Metropolitan Civic Center (Struct)", schema: "IFC2X3", twinType: "tower" },
    { fileName: "NAV-IPI-ET1_E01-ZZZ-M3D-EST.ifc", label: "Ready IFC4: High-Speed Rail Viaduct Span E01", schema: "IFC4", twinType: "bridge" },
    { fileName: "NAV-IPI-ET1_E02-ZZZ-M3D-EST.ifc", label: "Ready IFC4: High-Speed Rail Box Girder E02", schema: "IFC4", twinType: "bridge" },
    { fileName: "NAV-IPI-ET1_E03-ZZZ-M3D-EST.ifc", label: "Ready IFC4: High-Speed Rail Concrete Pier E03", schema: "IFC4", twinType: "bridge" },
    { fileName: "NAV-IPI-ET1_E07-ZZZ-M3D-EST.ifc", label: "Ready IFC4: High-Speed Rail Abutment E07", schema: "IFC4", twinType: "bridge" },
];

/**
 * Module 3 Challenge: Reusable Project Form Component
 * Strictly adheres to the Single Responsibility Principle (SRP).
 * Handles both project creation and updating locally and in Cloud Firestore.
 */
export function ProjectForm(props: ProjectFormProps) {
    const { project, projectsManager, isOpen, defaultCategory, onClose, onSuccess } = props;
    const isEditing = Boolean(project);
    const dialogRef = React.useRef<HTMLDialogElement | null>(null);
    const [formError, setFormError] = React.useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
    const [uploadedFileName, setUploadedFileName] = React.useState<string>(project?.ifcFileName || "");
    const [modelCategory, setModelCategory] = React.useState<"ifc" | "3d" | "empty">(
        project?.modelCategory || (project?.ifcFileName ? "ifc" : defaultCategory || "empty")
    );
    const [parametricModelType, setParametricModelType] = React.useState<ModelType>(
        project?.modelType || "empty"
    );
    const [readyIfcPreset, setReadyIfcPreset] = React.useState<string>(project?.ifcFileName || "");
    const [sourceMode, setSourceMode] = React.useState<"empty" | "preset" | "upload">("empty");
    const [detectedSchema, setDetectedSchema] = React.useState<"IFC4" | "IFC2X3" | "IFC4.3" | undefined>(project?.ifcSchema);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        if (project) {
            setUploadedFileName(project.ifcFileName || "");
            setReadyIfcPreset(project.ifcFileName || "");
            setModelCategory(project.modelCategory || (project.ifcFileName ? "ifc" : "empty"));
            setParametricModelType(project.modelType || "empty");
            setDetectedSchema(project.ifcSchema);
            if (project.ifcFileName) {
                setSourceMode(READY_IFC_MODELS.some((m) => m.fileName === project.ifcFileName) ? "preset" : "upload");
            } else if (project.modelCategory === "3d" && project.modelType && project.modelType !== "empty") {
                setSourceMode("preset");
            } else {
                setSourceMode("empty");
            }
        } else {
            setUploadedFile(null);
            setUploadedFileName("");
            setReadyIfcPreset("");
            setModelCategory(defaultCategory || "empty");
            setParametricModelType("empty");
            setSourceMode("empty");
            setDetectedSchema(undefined);
        }
    }, [project, isOpen, defaultCategory]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadedFile(file);
        setUploadedFileName(file.name);
        setSourceMode("upload");

        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
        if (ext === ".ifc" || ext === ".frag") {
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
        setDetectedSchema(undefined);
        setSourceMode("empty");
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

        let finalModelCategory: "ifc" | "3d" | "empty" = modelCategory;
        let ifcFileName: string | undefined = undefined;
        let ifcSchema: "IFC4" | "IFC2X3" | "IFC4.3" | undefined = undefined;
        let modelType: ModelType = "empty";

        if (uploadedFile && uploadedFileName && modelCategory !== "empty") {
            const win = window as any;
            win.__customIfcBuffers = win.__customIfcBuffers || {};
            if (!win.__customIfcBuffers[uploadedFileName]) {
                try {
                    win.__customIfcBuffers[uploadedFileName] = await uploadedFile.arrayBuffer();
                } catch {}
            }
        }

        if (modelCategory === "empty") {
            finalModelCategory = "empty";
            modelType = "empty";
        } else if (sourceMode === "upload" && uploadedFileName) {
            if (uploadedFileName.toLowerCase().endsWith(".ifc") || uploadedFileName.toLowerCase().endsWith(".frag")) {
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
        } else if (modelCategory === "ifc") {
            finalModelCategory = "ifc";
            const chosenPreset = sourceMode === "preset" ? READY_IFC_MODELS.find((m) => m.fileName === readyIfcPreset) : undefined;
            if (chosenPreset) {
                ifcFileName = chosenPreset.fileName;
                ifcSchema = chosenPreset.schema;
                modelType = chosenPreset.twinType;
            } else {
                ifcFileName = undefined;
                ifcSchema = undefined;
                modelType = "empty";
            }
        } else {
            finalModelCategory = "3d";
            modelType = sourceMode === "preset" && parametricModelType !== "empty" ? parametricModelType : "empty";
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
            modelCategory: finalModelCategory,
            ifcFileName,
            ifcSchema,
            iconColor,
            todos: project?.todos ? project.todos : [],
            smartViews: project?.smartViews ? project.smartViews : [],
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
                                <span className="material-icons-round" style={{ fontSize: "18px", color: "var(--primary-blue)" }}>category</span>
                                <span>Project Workspace Type &amp; Placement</span>
                            </span>
                            <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                                {modelCategory === "ifc"
                                    ? "Places in: IFC OpenBIM Models"
                                    : modelCategory === "3d"
                                    ? "Places in: 3D BIM Models"
                                    : "Empty Studio (GIS 2D/3D Enabled)"}
                            </span>
                        </label>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px", marginBottom: "0.75rem" }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setModelCategory("ifc");
                                    if (uploadedFileName && !uploadedFileName.toLowerCase().endsWith(".ifc") && !uploadedFileName.toLowerCase().endsWith(".frag")) {
                                        setUploadedFile(null);
                                        setUploadedFileName("");
                                    }
                                }}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "flex-start",
                                    gap: "3px",
                                    padding: "0.55rem 0.7rem",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    background: modelCategory === "ifc" ? "rgba(16, 185, 129, 0.16)" : "rgba(19, 20, 24, 0.65)",
                                    border: modelCategory === "ifc" ? "1.5px solid #10b981" : "1px solid rgba(148, 163, 184, 0.28)",
                                    color: modelCategory === "ifc" ? "#34d399" : "#cbd5e1",
                                }}
                            >
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.80rem", fontWeight: 700 }}>
                                    <span className="material-icons-round" style={{ fontSize: "16px" }}>description</span>
                                    IFC OpenBIM
                                </span>
                                <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>BIM Schema Models</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setModelCategory("3d");
                                    if (uploadedFileName && (uploadedFileName.toLowerCase().endsWith(".ifc") || uploadedFileName.toLowerCase().endsWith(".frag"))) {
                                        setUploadedFile(null);
                                        setUploadedFileName("");
                                    }
                                }}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "flex-start",
                                    gap: "3px",
                                    padding: "0.55rem 0.7rem",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    background: modelCategory === "3d" ? "rgba(56, 189, 248, 0.16)" : "rgba(19, 20, 24, 0.65)",
                                    border: modelCategory === "3d" ? "1.5px solid #38bdf8" : "1px solid rgba(148, 163, 184, 0.28)",
                                    color: modelCategory === "3d" ? "#38bdf8" : "#cbd5e1",
                                }}
                            >
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.80rem", fontWeight: 700 }}>
                                    <span className="material-icons-round" style={{ fontSize: "16px" }}>view_in_ar</span>
                                    3D BIM Model
                                </span>
                                <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>Parametric &amp; Mesh</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setModelCategory("empty");
                                    setSourceMode("empty");
                                    setUploadedFile(null);
                                    setUploadedFileName("");
                                }}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "flex-start",
                                    gap: "3px",
                                    padding: "0.55rem 0.7rem",
                                    borderRadius: "8px",
                                    cursor: "pointer",
                                    textAlign: "left",
                                    background: modelCategory === "empty" ? "rgba(129, 140, 248, 0.16)" : "rgba(19, 20, 24, 0.65)",
                                    border: modelCategory === "empty" ? "1.5px solid #818cf8" : "1px solid rgba(148, 163, 184, 0.28)",
                                    color: modelCategory === "empty" ? "#a5b4fc" : "#cbd5e1",
                                }}
                            >
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.80rem", fontWeight: 700 }}>
                                    <span className="material-icons-round" style={{ fontSize: "16px" }}>public</span>
                                    Empty / GIS
                                </span>
                                <span style={{ fontSize: "0.68rem", color: "#94a3b8" }}>GIS 2D/3D Ready</span>
                            </button>
                        </div>

                        {modelCategory !== "empty" && (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "6px", marginBottom: "0.65rem" }}>
                                <button
                                    type="button"
                                    onClick={() => setSourceMode("empty")}
                                    style={{
                                        padding: "6px 8px",
                                        borderRadius: "7px",
                                        fontSize: "0.74rem",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        background: sourceMode === "empty" ? "rgba(56, 189, 248, 0.18)" : "rgba(19, 20, 24, 0.6)",
                                        border: sourceMode === "empty" ? "1px solid #38bdf8" : "1px solid rgba(148, 163, 184, 0.22)",
                                        color: sourceMode === "empty" ? "#38bdf8" : "#94a3b8",
                                    }}
                                >
                                    Start Empty
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSourceMode("preset");
                                        if (modelCategory === "ifc" && !readyIfcPreset) {
                                            setReadyIfcPreset(READY_IFC_MODELS[0].fileName);
                                        } else if (modelCategory === "3d" && parametricModelType === "empty") {
                                            setParametricModelType("tower");
                                        }
                                    }}
                                    style={{
                                        padding: "6px 8px",
                                        borderRadius: "7px",
                                        fontSize: "0.74rem",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        background: sourceMode === "preset" ? "rgba(16, 185, 129, 0.18)" : "rgba(19, 20, 24, 0.6)",
                                        border: sourceMode === "preset" ? "1px solid #10b981" : "1px solid rgba(148, 163, 184, 0.22)",
                                        color: sourceMode === "preset" ? "#34d399" : "#94a3b8",
                                    }}
                                >
                                    {modelCategory === "ifc" ? "Ready IFC (9)" : "Ready 3D (6)"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSourceMode("upload")}
                                    style={{
                                        padding: "6px 8px",
                                        borderRadius: "7px",
                                        fontSize: "0.74rem",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        background: sourceMode === "upload" ? "rgba(168, 85, 247, 0.18)" : "rgba(19, 20, 24, 0.6)",
                                        border: sourceMode === "upload" ? "1px solid #a855f7" : "1px solid rgba(148, 163, 184, 0.22)",
                                        color: sourceMode === "upload" ? "#c084fc" : "#94a3b8",
                                    }}
                                >
                                    Upload File
                                </button>
                            </div>
                        )}

                        {modelCategory === "ifc" && sourceMode === "preset" && (
                            <div style={{ marginBottom: "0.25rem" }}>
                                <select
                                    value={readyIfcPreset}
                                    onChange={(e) => setReadyIfcPreset(e.target.value)}
                                    style={{ width: "100%" }}
                                >
                                    {READY_IFC_MODELS.map((m) => (
                                        <option key={m.fileName} value={m.fileName}>
                                            {m.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {modelCategory === "3d" && sourceMode === "preset" && (
                            <div style={{ marginBottom: "0.25rem" }}>
                                <select
                                    value={parametricModelType}
                                    onChange={(e) => setParametricModelType(e.target.value as ModelType)}
                                    style={{ width: "100%" }}
                                >
                                    <option value="tower">Commercial High-Rise Tower</option>
                                    <option value="villa">Luxury Eco-Villa</option>
                                    <option value="bridge">Cable-Stayed Highway Bridge</option>
                                    <option value="gear">Industrial MEP Energy Plant</option>
                                    <option value="car">Autonomous EV Fleet Hub</option>
                                    <option value="cube">Modular Architectural Pavilion</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {modelCategory === "empty" ? (
                        <div className="form-field full-width" style={{ marginTop: "0.15rem" }}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "0.85rem 1rem",
                                    borderRadius: "8px",
                                    background: "rgba(99, 102, 241, 0.12)",
                                    border: "1px solid rgba(129, 140, 248, 0.35)",
                                    color: "#e2e8f0",
                                }}
                            >
                                <span className="material-icons-round" style={{ fontSize: "24px", color: "#818cf8" }}>public</span>
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                                    <span style={{ fontSize: "0.83rem", fontWeight: 700, color: "#f8fafc" }}>
                                        Empty / GIS Geospatial Studio
                                    </span>
                                    <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                                        Opens cleanly with 2D Radar &amp; Cesium 3D Tiles enabled.
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : sourceMode === "empty" ? (
                        <div className="form-field full-width" style={{ marginTop: "0.15rem" }}>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "0.75rem 1rem",
                                    borderRadius: "8px",
                                    background: "rgba(32, 33, 38, 0.55)",
                                    border: "1px solid rgba(56, 189, 248, 0.28)",
                                    color: "#e2e8f0",
                                }}
                            >
                                <span className="material-icons-round" style={{ fontSize: "22px", color: "#38bdf8" }}>
                                    {modelCategory === "ifc" ? "description" : "view_in_ar"}
                                </span>
                                <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                                    {modelCategory === "ifc"
                                        ? "Starts empty under IFC OpenBIM Models — drag & drop an .ifc file inside the viewer anytime."
                                        : "Starts empty under 3D BIM Models — upload a .obj, .gltf, or .glb model inside the viewer anytime."}
                                </span>
                            </div>
                        </div>
                    ) : sourceMode === "upload" ? (
                        <div className="form-field full-width" style={{ marginTop: "0.15rem" }}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept={modelCategory === "ifc" ? ".ifc,.frag" : ".obj,.gltf,.glb"}
                                style={{ display: "none" }}
                                onChange={handleFileSelect}
                            />

                            {uploadedFileName ? (
                                <div className="model-file-attached" style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    background: "rgba(19, 20, 24, 0.75)",
                                    border: "1px solid rgba(255, 255, 255, 0.12)",
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
                                                background: "rgba(32, 33, 38, 0.8)",
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
                                        background: "rgba(19, 20, 24, 0.6)",
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
                                        {modelCategory === "ifc" ? "Upload IFC OpenBIM File (.ifc)" : "Upload 3D Model (.obj, .gltf, .glb)"}
                                    </span>
                                    <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                                        {modelCategory === "ifc" ? "Click to browse (.ifc, .frag)" : "Click to browse (.obj, .gltf, .glb)"}
                                    </span>
                                </button>
                            )}
                        </div>
                    ) : null}
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
