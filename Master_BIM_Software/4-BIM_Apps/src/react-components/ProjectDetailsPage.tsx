import * as React from "react";
import * as Router from "react-router-dom";
import * as THREE from "three";
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../core/database";
import { IProject, Project } from "../classes/Project";
import { ProjectsManager } from "../classes/ProjectsManager";
import { ProjectInfoCard } from "./details/ProjectInfoCard";
import { ProjectTasksList } from "./details/ProjectTasksList";
import { ProjectNotFound } from "./details/ProjectNotFound";
import { ThreeViewer } from "./ThreeViewer";
import * as templates from "../ui-templates";
import { setupComponents, BimMeasurementSystem, loadIfcFromBuffer, resolveBimElementInfo, BimElementInfo, DataEnhancer, SmartViews } from "../bim-components";

export interface ProjectDetailsPageProps {
    projectsManager: ProjectsManager;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    errorMessage: string;
}

class ViewerErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, errorMessage: "" };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, errorMessage: error?.message || "An unexpected error occurred in the 3D Viewer." };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ViewerErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", width: "100%", color: "#ef4444", padding: "2rem", textAlign: "center", background: "#0b0f19" }}>
                    <span className="material-icons-round" style={{ fontSize: "42px", marginBottom: "8px" }}>warning</span>
                    <h3 style={{ margin: "0 0 8px 0", color: "#f8fafc" }}>3D BIM Engine Notice</h3>
                    <p style={{ color: "#94a3b8", fontSize: "0.88rem", maxWidth: "420px", marginBottom: "16px" }}>
                        {this.state.errorMessage}
                    </p>
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={() => this.setState({ hasError: false, errorMessage: "" })}
                    >
                        Reload 3D Engine
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// Re-export Universal Semantic BIM Element Metadata Resolver
export { resolveBimElementInfo } from "../bim-components/setup/src/load-project-model";

/**
 * Modular ProjectDetailsPage
 * Module 4 — Lesson 3.3: Working with BIM Worlds
 * Seamless integration of That Open Engine BIM World (<bim-grid> + <bim-viewport>)
 * with 3D Parametric Digital Twins and full project management.
 */
export function ProjectDetailsPage(props: ProjectDetailsPageProps) {
    const { projectsManager } = props;
    const routeParams = Router.useParams<{ id: string }>();
    const projectId = routeParams.id;

    // Lesson 2.4 & 3.3: Strongly typed ViewerGrid reference
    const gridRef = React.useRef<templates.ViewerGrid | null>(null);

    // 1. Check local ProjectsManager memory first
    let project = projectId ? projectsManager.getProject(projectId) : null;

    const [isLoadingFromCloud, setIsLoadingFromCloud] = React.useState<boolean>(!project);
    // Every project is a That Open Engine BIM World with its 3D model populated!
    // For IFC models: BIM World (3D) vs 2D Plan (Orthographic)
    // For 3D models: BIM World vs 3D Model (Studio)
    const [viewerMode, setViewerMode] = React.useState<"bim-world" | "2d-plan" | "parametric">("bim-world");
    const worldRef = React.useRef<any>(null);
    const componentsRef = React.useRef<any>(null);
    const [isAutoRotating, setIsAutoRotating] = React.useState<boolean>(false);
    const [isGridVisible, setIsGridVisible] = React.useState<boolean>(true);
    const [, setTick] = React.useState(0);
    const forceUpdate = () => setTick((t) => t + 1);

    // Advanced Option B State: Real-Time Measurements, Local IFC Loader & Element Inspector
    const measurementSystemRef = React.useRef<BimMeasurementSystem | null>(null);
    const [isMeasuring, setIsMeasuring] = React.useState<boolean>(false);
    const [measurementsCount, setMeasurementsCount] = React.useState<number>(0);

    const [selectedElement, setSelectedElement] = React.useState<BimElementInfo | null>(null);
    const selectionBoxRef = React.useRef<THREE.BoxHelper | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [isParsingIfc, setIsParsingIfc] = React.useState<boolean>(false);
    const [customIfcName, setCustomIfcName] = React.useState<string | null>(null);

    // That Open Company Course Tools Integration (Lessons 3.5, 3.6, 3.11, 3.12, 4.x, 5.x)
    const [showModelsPanel, setShowModelsPanel] = React.useState<boolean>(false);
    const [showPropertiesPanel, setShowPropertiesPanel] = React.useState<boolean>(false);
    const [showQueryPanel, setShowQueryPanel] = React.useState<boolean>(false);
    const [showDataEnhancer, setShowDataEnhancer] = React.useState<boolean>(false);
    const [showSmartViews, setShowSmartViews] = React.useState<boolean>(false);

    const modelsContainerRef = React.useRef<HTMLDivElement | null>(null);
    const propertiesContainerRef = React.useRef<HTMLDivElement | null>(null);
    const queryContainerRef = React.useRef<HTMLDivElement | null>(null);
    const dataEnhancerContainerRef = React.useRef<HTMLDivElement | null>(null);
    const smartViewsContainerRef = React.useRef<HTMLDivElement | null>(null);

    // Lessons 3.11 & 3.12: Mount Query & Find Items UI Panel
    React.useEffect(() => {
        if (showQueryPanel && queryContainerRef.current && componentsRef.current) {
            try {
                const queryPanel = BUI.Component.create<BUI.Panel, templates.QueryPanelState>(
                    templates.queryPanelTemplate,
                    { components: componentsRef.current }
                );
                queryContainerRef.current.replaceChildren(queryPanel as any);
            } catch (err) {
                console.warn("[QueryPanel] Error mounting query panel:", err);
            }
        }
    }, [showQueryPanel]);

    React.useEffect(() => {
        if (showModelsPanel && modelsContainerRef.current && componentsRef.current) {
            try {
                const [modelsPanel] = BUI.Component.create<BUI.PanelSection, templates.ModelsState>(
                    templates.modelsTemplate,
                    { components: componentsRef.current }
                );
                modelsContainerRef.current.replaceChildren(modelsPanel);
            } catch (err) {
                console.warn("[ThatOpen] Error mounting models panel:", err);
            }
        }
    }, [showModelsPanel]);

    React.useEffect(() => {
        if (showPropertiesPanel && propertiesContainerRef.current && componentsRef.current) {
            try {
                const [propsPanel] = BUI.Component.create<BUI.PanelSection, templates.ItemsDataState>(
                    templates.itemsDataTemplate,
                    { components: componentsRef.current }
                );
                propertiesContainerRef.current.replaceChildren(propsPanel);
            } catch (err) {
                console.warn("[ThatOpen] Error mounting properties panel:", err);
            }
        }
    }, [showPropertiesPanel]);

    // Section 4: Mount custom DataEnhancer Component UI (Lessons 4.1 – 4.5)
    React.useEffect(() => {
        if (showDataEnhancer && dataEnhancerContainerRef.current && componentsRef.current) {
            try {
                const dataEnhancer = componentsRef.current.get(DataEnhancer);
                const panel = dataEnhancer.createUI(project?.id);
                dataEnhancerContainerRef.current.replaceChildren(panel);
            } catch (err) {
                console.warn("[DataEnhancer] Error mounting UI:", err);
            }
        }
    }, [showDataEnhancer, project?.id]);

    // Section 5: Mount custom SmartViews Component UI (Lessons 5.1 – 5.5)
    React.useEffect(() => {
        if (showSmartViews && smartViewsContainerRef.current && componentsRef.current) {
            try {
                const smartViews = componentsRef.current.get(SmartViews);
                const panel = smartViews.createUI();
                smartViewsContainerRef.current.replaceChildren(panel);
            } catch (err) {
                console.warn("[SmartViews] Error mounting UI:", err);
            }
        }
    }, [showSmartViews]);

    // Measurement & Inspection Controls
    const toggleMeasuring = () => {
        const next = !isMeasuring;
        setIsMeasuring(next);
        if (measurementSystemRef.current) {
            measurementSystemRef.current.setEnabled(next);
        }
        if (next) {
            setSelectedElement(null);
            if (selectionBoxRef.current && worldRef.current) {
                worldRef.current.scene.three.remove(selectionBoxRef.current);
                selectionBoxRef.current.dispose();
                selectionBoxRef.current = null;
            }
        }
    };

    const clearMeasurements = () => {
        if (measurementSystemRef.current) {
            measurementSystemRef.current.clearAll();
            setMeasurementsCount(0);
        }
    };

    const handleOpenIfcFile = () => {
        fileInputRef.current?.click();
    };

    const handleIfcFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !componentsRef.current || !worldRef.current) return;
        setIsParsingIfc(true);
        try {
            const buffer = await file.arrayBuffer();
            await loadIfcFromBuffer(componentsRef.current, worldRef.current, buffer, file.name);
            setCustomIfcName(file.name);
        } catch (err: any) {
            alert(`Error parsing IFC file "${file.name}": ${err?.message || err}`);
        } finally {
            setIsParsingIfc(false);
            if (e.target) e.target.value = "";
        }
    };

    // That Open Engine CAD Navigation helpers
    const setCameraPreset = (preset: "iso" | "plan" | "front") => {
        const world = worldRef.current;
        const controls = world?.camera?.controls;
        if (!controls) return;

        // Calculate model bounding center dynamically
        const modelCenter = new THREE.Vector3(0, 3, 0);
        let dist = 32;
        if (world.scene.three) {
            const bbox = new THREE.Box3();
            world.scene.three.traverse((child: any) => {
                if (child.isMesh && !child.name.includes("grid") && !child.name.includes("selection-box")) {
                    bbox.expandByObject(child);
                }
            });
            if (!bbox.isEmpty()) {
                bbox.getCenter(modelCenter);
                const size = new THREE.Vector3();
                bbox.getSize(size);
                dist = Math.max(size.x, size.y, size.z) * 1.5;
            }
        }

        if (preset === "iso") {
            if (viewerMode === "2d-plan") {
                setViewerMode("bim-world");
            }
            controls.setLookAt(
                modelCenter.x + dist * 0.75,
                modelCenter.y + dist * 0.65,
                modelCenter.z + dist * 0.75,
                modelCenter.x,
                modelCenter.y,
                modelCenter.z,
                true
            );
        } else if (preset === "plan") {
            if (isIfcProject && viewerMode === "bim-world") {
                setViewerMode("2d-plan");
            }
            controls.setLookAt(
                modelCenter.x,
                modelCenter.y + dist * 1.5,
                modelCenter.z + 0.001,
                modelCenter.x,
                modelCenter.y,
                modelCenter.z,
                true
            );
        } else if (preset === "front") {
            if (viewerMode === "2d-plan") {
                setViewerMode("bim-world");
            }
            controls.setLookAt(
                modelCenter.x,
                modelCenter.y + dist * 0.25,
                modelCenter.z + dist * 1.25,
                modelCenter.x,
                modelCenter.y,
                modelCenter.z,
                true
            );
        }
    };

    const handleZoom = (zoomIn: boolean) => {
        const controls = worldRef.current?.camera?.controls;
        if (!controls) return;
        controls.dolly(zoomIn ? 3 : -3, true);
    };

    const fitModelView = () => {
        const world = worldRef.current;
        const controls = world?.camera?.controls;
        if (!controls || !world?.scene?.three) return;
        const bbox = new THREE.Box3();
        world.scene.three.traverse((child: any) => {
            if (child.isMesh && !child.name.includes("grid") && !child.name.includes("selection-box")) {
                bbox.expandByObject(child);
            }
        });
        if (!bbox.isEmpty()) {
            controls.fitToBox(bbox, true, { paddingLeft: 1.25, paddingRight: 1.25, paddingTop: 1.25, paddingBottom: 1.25 });
        } else {
            controls.setLookAt(20, 14, 22, 0, 3, 0, true);
        }
    };

    const toggleAutoOrbit = () => {
        const controls = worldRef.current?.camera?.controls;
        if (!controls) return;
        controls.autoRotate = !controls.autoRotate;
        controls.autoRotateSpeed = 2.0;
        setIsAutoRotating(Boolean(controls.autoRotate));
    };

    const toggleCadGrid = () => {
        const components = componentsRef.current;
        const world = worldRef.current;
        if (!components || !world) return;
        const newVis = !isGridVisible;
        try {
            const grids = components.get(OBC.Grids);
            const grid = grids.list.get(world.uuid);
            if (grid) {
                grid.visible = newVis;
            }
        } catch {}
        world.scene.three.traverse((child: any) => {
            if (child instanceof THREE.GridHelper || child.name?.includes("grid") || (child as any).isGrid) {
                child.visible = newVis;
            }
        });
        setIsGridVisible(newVis);
    };

    // Lesson 3.3: Working with BIM Worlds — asynchronous setupComponents with populated project model
    React.useEffect(() => {
        if (!project) return;
        let componentsInstance: any = null;
        let loadedModelInstance: any = null;
        let animId: number | null = null;

        const setupGrid = async () => {
            try {
                // Initialize That Open Engine components and BIM World with active project's 3D model!
                const { components, world, viewport, loadedModel } = await setupComponents(project);
                componentsInstance = components;
                componentsRef.current = components;
                worldRef.current = world;
                loadedModelInstance = loadedModel;

                const grid = gridRef.current;
                if (!grid) return;

                // Direct full-bleed 3D Viewport in That Open Engine BIM World (no blocking side panels)
                grid.elements = {
                    viewport: {
                        template: templates.viewportTemplate,
                        initialState: { viewport },
                    },
                };

                // Full-bleed 100% viewport layout
                grid.layouts = {
                    main: {
                        template: `
                            "viewport" 1fr
                            / 1fr
                        `,
                    },
                };

                // Set default active layout
                grid.layout = "main";

                // Initialize Advanced BIM Measurement System
                const measureSystem = new BimMeasurementSystem(components, world);
                measurementSystemRef.current = measureSystem;
                measureSystem.onMeasurementChange = (records) => {
                    setMeasurementsCount(records.length);
                };

                // Attach Precision Raycasting for Measurement & Element Inspector
                const canvas = world.renderer.three.domElement;
                const raycaster = new THREE.Raycaster();

                const onPointerMove = (evt: MouseEvent) => {
                    const rect = canvas.getBoundingClientRect();
                    const x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
                    const y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
                    raycaster.setFromCamera(new THREE.Vector2(x, y), world.camera.three);

                    const hits = raycaster.intersectObjects(world.scene.three.children, true);
                    const validHit = hits.find(
                        (h) => h.object.visible &&
                               !h.object.name.includes("measurement") &&
                               !h.object.name.includes("selection-box") &&
                               h.object.type === "Mesh"
                    );

                    if (measureSystem.enabled) {
                        measureSystem.handlePointerMove(validHit ? validHit.point : null);
                    }
                };

                const onPointerClick = (evt: MouseEvent) => {
                    const rect = canvas.getBoundingClientRect();
                    const x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
                    const y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
                    raycaster.setFromCamera(new THREE.Vector2(x, y), world.camera.three);

                    const hits = raycaster.intersectObjects(world.scene.three.children, true);
                    const validHit = hits.find(
                        (h) => h.object.visible &&
                               !h.object.name.includes("measurement") &&
                               !h.object.name.includes("selection-box") &&
                               h.object.type === "Mesh"
                    );

                    if (measureSystem.enabled) {
                        if (validHit) {
                            measureSystem.handleClick(validHit.point);
                        }
                    } else {
                        // Element Inspector Selection
                        if (validHit && validHit.object instanceof THREE.Mesh) {
                            const mesh = validHit.object;
                            const bbox = new THREE.Box3().setFromObject(mesh);
                            const size = new THREE.Vector3();
                            bbox.getSize(size);

                            if (selectionBoxRef.current) {
                                world.scene.three.remove(selectionBoxRef.current);
                                selectionBoxRef.current.dispose();
                            }
                            const boxHelper = new THREE.BoxHelper(mesh, 0x38bdf8);
                            boxHelper.name = "selection-box-helper";
                            world.scene.three.add(boxHelper);
                            selectionBoxRef.current = boxHelper;

                            const info = resolveBimElementInfo(mesh, validHit.point, project);
                            setSelectedElement(info);
                        }
                    }
                };

                canvas.addEventListener("mousemove", onPointerMove);
                canvas.addEventListener("click", onPointerClick);

                // Continuous Animation Loop for Camera Transitions, Auto-Orbit, and Dynamic Models
                let lastTime = performance.now();
                const loop = (time: number) => {
                    const delta = Math.min((time - lastTime) / 1000, 0.1);
                    lastTime = time;
                    if (world?.camera?.controls) {
                        world.camera.controls.update(delta);
                    }
                    if (loadedModel?.update) {
                        loadedModel.update(delta);
                    }
                    animId = requestAnimationFrame(loop);
                };
                animId = requestAnimationFrame(loop);
            } catch (err) {
                console.error("Failed to setup That Open Engine BIM World:", err);
            }
        };

        setupGrid();

        return () => {
            if (animId) cancelAnimationFrame(animId);
            if (selectionBoxRef.current && worldRef.current) {
                try {
                    worldRef.current.scene.three.remove(selectionBoxRef.current);
                    selectionBoxRef.current.dispose();
                } catch {}
            }
            if (measurementSystemRef.current) {
                try { measurementSystemRef.current.dispose(); } catch {}
            }
            if (loadedModelInstance) {
                try { loadedModelInstance.dispose(); } catch {}
            }
            if (componentsInstance) {
                try { componentsInstance.dispose(); } catch {}
            }
        };
    }, [project?.id]);

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

    const pNameLower = (project.name || "").toLowerCase();
    const pFileLower = (project.ifcFileName || "").toLowerCase();
    const isIfcProject = Boolean(
        project.modelCategory === "ifc" ||
        project.ifcFileName ||
        pNameLower.includes("ifc") ||
        pNameLower.includes("viaduct") ||
        pNameLower.includes("hns") ||
        pNameLower.includes("provi") ||
        pNameLower.includes("structural complex") ||
        pFileLower.endsWith(".ifc")
    );

    // Lesson 2.3 & 2.4: Render full project details view with ThreeViewer and embedded <bim-grid>
    return (
        <div className="page" id="project-details">
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
                        <h2 id="details-page-title" title={project.name}>{project.name}</h2>
                        <p id="details-page-desc" title={project.description}>{project.description}</p>
                    </div>
                </div>
                <div className="details-header-right">
                    <span className="bim-coord-badge">
                        <span className="material-icons-round">view_in_ar</span>
                        <span>{customIfcName ? `Loaded: ${customIfcName}` : (project.ifcSchema ? `${project.ifcSchema} OpenBIM` : "IFC4 · LOD 350")}</span>
                    </span>
                </div>
            </header>

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

                <div className="details-viewer-wrapper">
                    {/* Floating High-End CAD Viewport Mode Switcher & That Open Company Course Tools */}
                    <div className="viewer-mode-switch-bar">
                        <button
                            type="button"
                            className={`viewer-mode-tab ${viewerMode === "bim-world" ? "active" : ""}`}
                            onClick={() => {
                                setViewerMode("bim-world");
                                setCameraPreset("iso");
                            }}
                            title="That Open Engine BIM World (3D Perspective View)"
                        >
                            <span className="material-icons-round">public</span>
                            <span>BIM World</span>
                        </button>

                        <button
                            type="button"
                            className={`viewer-mode-tab ${viewerMode === "2d-plan" ? "active" : ""}`}
                            onClick={() => {
                                setViewerMode("2d-plan");
                                setCameraPreset("plan");
                            }}
                            title="2D Top-Down Orthographic CAD Plan View"
                        >
                            <span className="material-icons-round">architecture</span>
                            <span>2D Plan</span>
                        </button>

                        {project.modelCategory === "3d" && (
                            <button
                                type="button"
                                className={`viewer-mode-tab ${viewerMode === "parametric" ? "active" : ""}`}
                                onClick={() => setViewerMode("parametric")}
                                title="High-Performance 3D CAD Studio (Three.js)"
                            >
                                <span className="material-icons-round">view_in_ar</span>
                                <span>3D Model</span>
                            </button>
                        )}

                        <div style={{ width: "1px", height: "18px", background: "rgba(148, 163, 184, 0.3)", margin: "0 2px" }} />

                        {/* That Open Company Course Lesson 3.6 Tool: Models Manager Panel Toggle */}
                        <button
                            type="button"
                            className={`viewer-mode-tab toc-course-pill ${showModelsPanel ? "active" : ""}`}
                            onClick={() => setShowModelsPanel((prev) => !prev)}
                            title="Toggle That Open Company Models Manager (Lesson 3.6 & 3.7)"
                        >
                            <span className="material-icons-round">folder_open</span>
                            <span>Models</span>
                        </button>

                        {/* That Open Company Course Lessons 3.11 & 3.12: Query & Find Items Toggle */}
                        <button
                            type="button"
                            className={`viewer-mode-tab toc-course-pill ${showQueryPanel ? "active" : ""}`}
                            onClick={() => setShowQueryPanel((prev) => !prev)}
                            title="Toggle BIM Query & Element Finder (Lessons 3.11 & 3.12)"
                        >
                            <span className="material-icons-round">search</span>
                            <span>Query</span>
                        </button>

                        {/* That Open Company Course Lesson 3.5 Tool: BIM Properties Table Toggle */}
                        <button
                            type="button"
                            className={`viewer-mode-tab toc-course-pill ${showPropertiesPanel ? "active" : ""}`}
                            onClick={() => setShowPropertiesPanel((prev) => !prev)}
                            title="Toggle That Open Company BIM Properties Data Table (Lesson 3.5)"
                        >
                            <span className="material-icons-round">table_chart</span>
                            <span>Properties</span>
                        </button>

                        <div style={{ width: "1px", height: "18px", background: "rgba(148, 163, 184, 0.3)", margin: "0 2px" }} />

                        {/* Module 4 Section 4 Tool: Custom Data Enhancer Component Toggle (Lessons 4.1 – 4.5) */}
                        <button
                            type="button"
                            className={`viewer-mode-tab toc-course-pill ${showDataEnhancer ? "active" : ""}`}
                            onClick={() => setShowDataEnhancer((prev) => !prev)}
                            title="Toggle Custom Data Enhancer Component (Section 4 Lessons 4.1–4.5)"
                        >
                            <span className="material-icons-round">database</span>
                            <span>Enhance</span>
                        </button>

                        {/* Module 4 Section 5 Tool: Custom Smart Views Component Toggle (Lessons 5.1 – 5.5) */}
                        <button
                            type="button"
                            className={`viewer-mode-tab toc-course-pill ${showSmartViews ? "active" : ""}`}
                            onClick={() => setShowSmartViews((prev) => !prev)}
                            title="Toggle Custom Smart Views Viewpoint Manager (Section 5 Lessons 5.1–5.5)"
                        >
                            <span className="material-icons-round">camera</span>
                            <span>Smart Views</span>
                        </button>
                    </div>

                    <ViewerErrorBoundary>
                        {/* Lesson 3.3 & 3.7: That Open Engine Viewport Grid (BIM World & 2D Plan View) */}
                        <div style={{ position: "relative", width: "100%", height: "100%", display: (viewerMode === "bim-world" || viewerMode === "2d-plan") ? "block" : "none" }}>
                            {/* That Open Company Course Lesson 3.6 & 3.7: Dockable Models Manager Drawer */}
                            {showModelsPanel && (
                                <div className="toc-dock-panel toc-dock-left">
                                    <div className="toc-dock-header">
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>folder_open</span>
                                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>BIM Models Manager · Lesson 3.6</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowModelsPanel(false)}
                                            className="btn-close-dock"
                                            title="Close Models Panel"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                    <div ref={modelsContainerRef} className="toc-dock-body"></div>
                                </div>
                            )}

                            {/* That Open Company Course Lessons 3.11 & 3.12: Query & Find Items Drawer */}
                            {showQueryPanel && (
                                <div className="toc-dock-panel toc-dock-right" style={{ right: showPropertiesPanel ? "404px" : "16px" }}>
                                    <div className="toc-dock-header">
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>search</span>
                                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>Query & Filter · Lessons 3.11–3.12</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowQueryPanel(false)}
                                            className="btn-close-dock"
                                            title="Close Query Panel"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                    <div ref={queryContainerRef} className="toc-dock-body"></div>
                                </div>
                            )}

                            {/* That Open Company Course Lesson 3.5: Dockable Elements Data Properties Drawer */}
                            {showPropertiesPanel && (
                                <div className="toc-dock-panel toc-dock-right">
                                    <div className="toc-dock-header">
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>table_chart</span>
                                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>BIM Properties Data · Lesson 3.5</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowPropertiesPanel(false)}
                                            className="btn-close-dock"
                                            title="Close Properties Panel"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                    <div ref={propertiesContainerRef} className="toc-dock-body"></div>
                                </div>
                            )}

                            {/* Module 4 Section 4: Custom Data Enhancer Drawer (Lessons 4.1 – 4.5) */}
                            {showDataEnhancer && (
                                <div className="toc-dock-panel toc-dock-right" style={{ right: showPropertiesPanel ? "404px" : "16px" }}>
                                    <div className="toc-dock-header">
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>database</span>
                                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>Data Enhancer · Lessons 4.1–4.5</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowDataEnhancer(false)}
                                            className="btn-close-dock"
                                            title="Close Data Enhancer Panel"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                    <div ref={dataEnhancerContainerRef} className="toc-dock-body"></div>
                                </div>
                            )}

                            {/* Module 4 Section 5: Custom Smart Views Drawer (Lessons 5.1 – 5.5) */}
                            {showSmartViews && (
                                <div className="toc-dock-panel toc-dock-left" style={{ left: showModelsPanel ? "404px" : "16px" }}>
                                    <div className="toc-dock-header">
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                            <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>camera</span>
                                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>Smart Views · Lessons 5.1–5.5</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowSmartViews(false)}
                                            className="btn-close-dock"
                                            title="Close Smart Views Panel"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                    <div ref={smartViewsContainerRef} className="toc-dock-body"></div>
                                </div>
                            )}
                            <bim-grid
                                className="viewer-grid"
                                ref={gridRef}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    display: "block",
                                }}
                            ></bim-grid>

                            {/* 2D Plan CAD Sheet Banner */}
                            {viewerMode === "2d-plan" && (
                                <div className="plan-mode-banner" style={{
                                    position: "absolute",
                                    top: "60px",
                                    left: "16px",
                                    zIndex: 20,
                                    background: "rgba(15, 23, 42, 0.94)",
                                    border: "1px solid rgba(56, 189, 248, 0.45)",
                                    borderRadius: "20px",
                                    padding: "5px 14px",
                                    color: "#38bdf8",
                                    fontSize: "0.82rem",
                                    fontWeight: 600,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "7px",
                                    backdropFilter: "blur(12px)",
                                    boxShadow: "0 6px 20px rgba(0,0,0,0.45)"
                                }}>
                                    <span className="material-icons-round" style={{ fontSize: "17px", color: "#38bdf8" }}>architecture</span>
                                    <span>2D Engineering Plan View · Orthographic CAD Sheet</span>
                                </div>
                            )}

                            {/* Hidden file input for Local IFC File Picker */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".ifc"
                                onChange={handleIfcFileSelected}
                                style={{ display: "none" }}
                            />

                            {/* Active Measurement Mode Instructions Banner */}
                            {isMeasuring && (
                                <div className="measurement-banner">
                                    <span className="material-icons-round">straighten</span>
                                    <span>Measurement Mode: Click Point A on any surface, then click Point B to calculate distance.</span>
                                </div>
                            )}

                            {/* Floating BIM Element Inspector Card */}
                            {selectedElement && (
                                <div className="element-inspector-card">
                                    <div className="inspector-header">
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                                            <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px", flexShrink: 0 }}>layers</span>
                                            <h4 style={{ margin: 0, fontSize: "0.88rem", color: "#f8fafc", fontWeight: 700, lineHeight: 1.35, wordBreak: "break-word" }}>
                                                {selectedElement.name}
                                            </h4>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedElement(null);
                                                if (selectionBoxRef.current && worldRef.current) {
                                                    worldRef.current.scene.three.remove(selectionBoxRef.current);
                                                    selectionBoxRef.current.dispose();
                                                    selectionBoxRef.current = null;
                                                }
                                            }}
                                            className="btn-close-inspector"
                                            title="Close Inspector"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                    <div className="inspector-body">
                                        <div className="inspector-row">
                                            <span className="label">Element ID:</span>
                                            <span className="value" style={{ color: "#38bdf8", fontFamily: "monospace", fontWeight: 600 }}>
                                                #{selectedElement.elementId || "BIM-OBJ"}
                                            </span>
                                        </div>
                                        <div className="inspector-row">
                                            <span className="label">Component Type:</span>
                                            <span className="value">{selectedElement.type}</span>
                                        </div>
                                        <div className="inspector-row">
                                            <span className="label">World Pos (m):</span>
                                            <span className="value">
                                                {selectedElement.point.x.toFixed(1)}, {selectedElement.point.y.toFixed(1)}, {selectedElement.point.z.toFixed(1)}
                                            </span>
                                        </div>
                                        <div className="inspector-row">
                                            <span className="label">Bounds (W×H×D):</span>
                                            <span className="value">
                                                {selectedElement.width.toFixed(2)} × {selectedElement.height.toFixed(2)} × {selectedElement.depth.toFixed(2)} m
                                            </span>
                                        </div>
                                        <div className="inspector-row">
                                            <span className="label">Mesh Polygons:</span>
                                            <span className="value">{selectedElement.triangleCount.toLocaleString()} tris</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Web-IFC Parsing Animated Overlay */}
                            {isParsingIfc && (
                                <div className="ifc-loading-overlay">
                                    <div className="ifc-loading-spinner"></div>
                                    <p>Parsing IFC model & generating That Open Fragments...</p>
                                </div>
                            )}

                            {/* That Open Engine Floating CAD Navigation HUD Toolbar */}
                            <div
                                className="viewer-hud-overlay"
                                style={{
                                    position: "absolute",
                                    bottom: "16px",
                                    left: "50%",
                                    transform: "translateX(-50%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "flex-start",
                                    gap: "4px",
                                    padding: "5px 8px",
                                    background: "rgba(15, 23, 42, 0.94)",
                                    backdropFilter: "blur(14px)",
                                    border: "1px solid rgba(56, 189, 248, 0.35)",
                                    borderRadius: "30px",
                                    zIndex: 20,
                                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.65)",
                                    maxWidth: "calc(100% - 24px)",
                                    overflowX: "auto",
                                    scrollbarWidth: "none",
                                    boxSizing: "border-box",
                                    flexWrap: "nowrap",
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setCameraPreset("iso")}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "5px 9px",
                                        background: "rgba(30, 41, 59, 0.85)",
                                        border: "1px solid rgba(148, 163, 184, 0.25)",
                                        borderRadius: "20px",
                                        color: "#f8fafc",
                                        cursor: "pointer",
                                        fontSize: "0.76rem",
                                        fontWeight: 600,
                                        flexShrink: 0,
                                    }}
                                    title="Axonometric 3D Perspective View (ISO)"
                                >
                                    <span className="material-icons-round" style={{ fontSize: "15px", color: "#38bdf8" }}>view_in_ar</span>
                                    <span className="hud-btn-label">3D ISO</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCameraPreset("plan")}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "5px 9px",
                                        background: "rgba(30, 41, 59, 0.85)",
                                        border: "1px solid rgba(148, 163, 184, 0.25)",
                                        borderRadius: "20px",
                                        color: "#f8fafc",
                                        cursor: "pointer",
                                        fontSize: "0.76rem",
                                        fontWeight: 600,
                                        flexShrink: 0,
                                    }}
                                    title="Top Plan View (Orthographic 2D/3D)"
                                >
                                    <span className="material-icons-round" style={{ fontSize: "15px", color: "#38bdf8" }}>layers</span>
                                    <span className="hud-btn-label">Plan</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCameraPreset("front")}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "5px 9px",
                                        background: "rgba(30, 41, 59, 0.85)",
                                        border: "1px solid rgba(148, 163, 184, 0.25)",
                                        borderRadius: "20px",
                                        color: "#f8fafc",
                                        cursor: "pointer",
                                        fontSize: "0.76rem",
                                        fontWeight: 600,
                                        flexShrink: 0,
                                    }}
                                    title="Front Elevation View"
                                >
                                    <span className="material-icons-round" style={{ fontSize: "15px", color: "#38bdf8" }}>crop_portrait</span>
                                    <span className="hud-btn-label">Front</span>
                                </button>
                                <div style={{ width: "1px", height: "16px", background: "rgba(148, 163, 184, 0.3)", margin: "0 1px", flexShrink: 0 }} />
                                <button
                                    type="button"
                                    onClick={() => handleZoom(true)}
                                    style={{ padding: "5px 7px", background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer", display: "inline-flex", alignItems: "center", flexShrink: 0 }}
                                    title="Smooth Zoom In (Dolly +)"
                                >
                                    <span className="material-icons-round" style={{ fontSize: "17px" }}>add</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleZoom(false)}
                                    style={{ padding: "5px 7px", background: "transparent", border: "none", color: "#cbd5e1", cursor: "pointer", display: "inline-flex", alignItems: "center", flexShrink: 0 }}
                                    title="Smooth Zoom Out (Dolly -)"
                                >
                                    <span className="material-icons-round" style={{ fontSize: "17px" }}>remove</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={fitModelView}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "5px 9px",
                                        background: "rgba(30, 41, 59, 0.85)",
                                        border: "1px solid rgba(148, 163, 184, 0.25)",
                                        borderRadius: "20px",
                                        color: "#f8fafc",
                                        cursor: "pointer",
                                        fontSize: "0.76rem",
                                        fontWeight: 600,
                                        flexShrink: 0,
                                    }}
                                    title="Fit Model to Viewport (Center & Focus)"
                                >
                                    <span className="material-icons-round" style={{ fontSize: "15px", color: "#38bdf8" }}>center_focus_strong</span>
                                    <span className="hud-btn-label">Fit</span>
                                </button>
                                <div style={{ width: "1px", height: "16px", background: "rgba(148, 163, 184, 0.3)", margin: "0 1px", flexShrink: 0 }} />
                                <button
                                    type="button"
                                    onClick={toggleAutoOrbit}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "5px 9px",
                                        background: isAutoRotating ? "var(--primary-blue)" : "rgba(30, 41, 59, 0.85)",
                                        border: "1px solid rgba(148, 163, 184, 0.25)",
                                        borderRadius: "20px",
                                        color: "#f8fafc",
                                        cursor: "pointer",
                                        fontSize: "0.76rem",
                                        fontWeight: 600,
                                        flexShrink: 0,
                                    }}
                                    title="Toggle Auto-Orbit Turntable"
                                >
                                    <span className="material-icons-round" style={{ fontSize: "15px" }}>sync</span>
                                    <span className="hud-btn-label">Orbit</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={toggleCadGrid}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "5px 9px",
                                        background: isGridVisible ? "rgba(30, 41, 59, 0.85)" : "transparent",
                                        border: "1px solid rgba(148, 163, 184, 0.25)",
                                        borderRadius: "20px",
                                        color: isGridVisible ? "#38bdf8" : "#94a3b8",
                                        cursor: "pointer",
                                        fontSize: "0.76rem",
                                        fontWeight: 600,
                                        flexShrink: 0,
                                    }}
                                    title="Toggle That Open Engine Infinite CAD Grid"
                                >
                                    <span className="material-icons-round" style={{ fontSize: "15px" }}>grid_on</span>
                                    <span className="hud-btn-label">Grid</span>
                                </button>
                                <div style={{ width: "1px", height: "16px", background: "rgba(148, 163, 184, 0.3)", margin: "0 1px", flexShrink: 0 }} />
                                {/* Advanced Option B Tool 1: 3D Length Measurement Tool */}
                                <button
                                    type="button"
                                    onClick={toggleMeasuring}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "5px 9px",
                                        background: isMeasuring ? "#d97706" : "rgba(30, 41, 59, 0.85)",
                                        border: isMeasuring ? "1px solid #f59e0b" : "1px solid rgba(148, 163, 184, 0.25)",
                                        borderRadius: "20px",
                                        color: isMeasuring ? "#ffffff" : "#f8fafc",
                                        cursor: "pointer",
                                        fontSize: "0.76rem",
                                        fontWeight: 600,
                                        flexShrink: 0,
                                    }}
                                    title="Toggle Interactive 3D Measurement & Dimension Tool"
                                >
                                    <span className="material-icons-round" style={{ fontSize: "15px", color: isMeasuring ? "#ffffff" : "#f59e0b" }}>straighten</span>
                                    <span className="hud-btn-label">Measure{measurementsCount > 0 ? ` (${measurementsCount})` : ""}</span>
                                </button>
                                {measurementsCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={clearMeasurements}
                                        style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            padding: "5px 7px",
                                            background: "rgba(239, 68, 68, 0.15)",
                                            border: "1px solid rgba(239, 68, 68, 0.35)",
                                            borderRadius: "20px",
                                            color: "#ef4444",
                                            cursor: "pointer",
                                            fontSize: "0.76rem",
                                            flexShrink: 0,
                                        }}
                                        title="Clear All 3D Dimensions"
                                    >
                                        <span className="material-icons-round" style={{ fontSize: "15px" }}>clear</span>
                                    </button>
                                )}
                                {/* Advanced Option B Tool 2: Local IFC File Picker & Loader */}
                                <button
                                    type="button"
                                    onClick={handleOpenIfcFile}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "5px 9px",
                                        background: "rgba(16, 185, 129, 0.18)",
                                        border: "1px solid rgba(16, 185, 129, 0.45)",
                                        borderRadius: "20px",
                                        color: "#34d399",
                                        cursor: "pointer",
                                        fontSize: "0.76rem",
                                        fontWeight: 600,
                                        flexShrink: 0,
                                    }}
                                    title="Open and load an IFC model from your local computer"
                                >
                                    <span className="material-icons-round" style={{ fontSize: "15px" }}>file_upload</span>
                                    <span className="hud-btn-label">Load IFC</span>
                                </button>
                            </div>
                        </div>

                        {/* Parametric 3D Model View */}
                        <div style={{ width: "100%", height: "100%", display: viewerMode === "parametric" ? "block" : "none" }}>
                            {viewerMode === "parametric" && (
                                <ThreeViewer project={project} projectsManager={projectsManager} />
                            )}
                        </div>
                    </ViewerErrorBoundary>
                </div>
            </div>
        </div>
    );
}
