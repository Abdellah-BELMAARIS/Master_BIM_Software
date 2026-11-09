import * as React from "react";
import * as Router from "react-router-dom";
import * as THREE from "three";
import * as BUI from "@thatopen/ui";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../core/database";
import { IProject, Project } from "../classes/Project";
import { ProjectsManager } from "../classes/ProjectsManager";
import { ProjectInfoCard } from "./details/ProjectInfoCard";
import { ProjectTasksList } from "./details/ProjectTasksList";
import { ProjectNotFound } from "./details/ProjectNotFound";
import { ThreeViewer } from "./ThreeViewer";
import * as templates from "../ui-templates";
import {
    setupComponents,
    BimMeasurementSystem,
    loadIfcFromBuffer,
    resolveBimElementInfo,
    getProjectIfcFile,
    getCanonicalProjectInfo,
    BimElementInfo,
    DataEnhancer,
    SmartViews,
    unwrapIfcAttr,
} from "../bim-components";

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
        return {
            hasError: true,
            errorMessage: error?.message || "An unexpected error occurred in the 3D Viewer.",
        };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("ViewerErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        width: "100%",
                        color: "#ef4444",
                        padding: "2rem",
                        textAlign: "center",
                        background: "#0b0f19",
                    }}
                >
                    <span className="material-icons-round" style={{ fontSize: "42px", marginBottom: "8px" }}>
                        warning
                    </span>
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

export { resolveBimElementInfo } from "../bim-components/setup/src/load-project-model";

/**
 * Modular ProjectDetailsPage
 * Module 4 (Lessons 2.3 – 5.5): Full That Open Engine BIM Application
 * - BIM World (3D Perspective) + 2D Plan (Orthographic Projection synced to Fragments)
 * - 3D Parametric Studio view (for 3D digital twin projects)
 * - Lesson 3.5: Element Data & Properties Inspector
 * - Lesson 3.6–3.7: Models Manager & .frag Binary Export
 * - Lesson 3.8–3.13: Viewport Floating Toolbar (Colorize, Hide, Isolate, Show All, Ghost, Focus)
 * - Lesson 3.11–3.12: ItemsFinder Data & Relational Queries Drawer
 * - Section 4 (Lessons 4.1–4.5): DataEnhancer Sources & Cloud Firestore Element Notes
 * - Section 5 (Lessons 5.1–5.5): SmartViews Discipline Coordination & State Capture
 */
export function ProjectDetailsPage(props: ProjectDetailsPageProps) {
    const { projectsManager } = props;
    const routeParams = Router.useParams<{ id: string }>();
    const projectId = routeParams.id;

    const gridRef = React.useRef<templates.ViewerGrid | null>(null);

    let project = projectId ? projectsManager.getProject(projectId) : null;
    if (project && (project.ifcFileName || project.name.toLowerCase().includes("ifc"))) {
        if (project.modelCategory !== "ifc") {
            project.modelCategory = "ifc";
            try {
                const projectRef = doc(db, "projects", project.id);
                updateDoc(projectRef, { modelCategory: "ifc" }).catch(() => {});
            } catch {}
        }
    }

    const [isLoadingFromCloud, setIsLoadingFromCloud] = React.useState<boolean>(!project);
    const [viewerMode, setViewerMode] = React.useState<"bim-world" | "2d-plan" | "parametric">("bim-world");
    const worldRef = React.useRef<OBC.World | null>(null);
    const componentsRef = React.useRef<OBC.Components | null>(null);
    const [isAutoRotating, setIsAutoRotating] = React.useState<boolean>(false);
    const [isGridVisible, setIsGridVisible] = React.useState<boolean>(true);
    const [, setTick] = React.useState(0);
    const forceUpdate = () => setTick((t) => t + 1);

    const measurementSystemRef = React.useRef<BimMeasurementSystem | null>(null);
    const [isMeasuring, setIsMeasuring] = React.useState<boolean>(false);
    const [measurementsCount, setMeasurementsCount] = React.useState<number>(0);

    const [selectedElement, setSelectedElement] = React.useState<BimElementInfo | null>(null);
    const selectionBoxRef = React.useRef<THREE.BoxHelper | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [isParsingIfc, setIsParsingIfc] = React.useState<boolean>(false);
    const [customIfcName, setCustomIfcName] = React.useState<string | null>(null);

    type DockDrawerId = "models" | "query" | "properties" | "enhance" | "smart-views" | "gis";
    const [activeDrawer, setActiveDrawer] = React.useState<DockDrawerId | null>(null);
    const [isTopBarCollapsed, setIsTopBarCollapsed] = React.useState<boolean>(false);
    const [isFloatingToolbarCollapsed, setIsFloatingToolbarCollapsed] = React.useState<boolean>(false);
    const toggleDrawer = (drawer: DockDrawerId) => {
        setActiveDrawer((prev) => (prev === drawer ? null : drawer));
    };
    const [engineReadyTick, setEngineReadyTick] = React.useState<number>(0);

    const viewerWrapperRef = React.useRef<HTMLDivElement | null>(null);
    const modeBarRef = React.useRef<HTMLDivElement | null>(null);
    const modelsContainerRef = React.useRef<HTMLDivElement | null>(null);
    const propertiesContainerRef = React.useRef<HTMLDivElement | null>(null);
    const queryContainerRef = React.useRef<HTMLDivElement | null>(null);
    const dataEnhancerContainerRef = React.useRef<HTMLDivElement | null>(null);
    const smartViewsContainerRef = React.useRef<HTMLDivElement | null>(null);
    const gisContainerRef = React.useRef<HTMLDivElement | null>(null);

    // Measure .viewer-mode-switch-bar and floating <bim-toolbar> dynamically -> --mode-bar-bottom & --toolbar-bottom
    // Guarantees zero overlap between top bar, floating toolbar, dockable drawers, and banners at all breakpoints
    React.useEffect(() => {
        const wrapper = viewerWrapperRef.current;
        const bar = modeBarRef.current;
        if (!wrapper || !bar) return;

        let observedToolbar: Element | null = null;

        const syncLayoutOffsets = () => {
            const wrapperRect = wrapper.getBoundingClientRect();
            const barRect = bar.getBoundingClientRect();
            const modeBarBottom = isTopBarCollapsed ? 54 : Math.max(52, Math.round(barRect.bottom - wrapperRect.top));
            wrapper.style.setProperty("--mode-bar-bottom", `${modeBarBottom}px`);

            const toolbarEl = wrapper.querySelector("bim-toolbar");
            if (toolbarEl && toolbarEl !== observedToolbar) {
                observedToolbar = toolbarEl;
                ro.observe(toolbarEl);
            }
            const tr = toolbarEl?.getBoundingClientRect();
            const toolbarBottom =
                tr && tr.height > 10
                    ? Math.round(tr.bottom - wrapperRect.top)
                    : modeBarBottom + 92;
            wrapper.style.setProperty("--toolbar-bottom", `${toolbarBottom}px`);
        };

        const ro = new ResizeObserver(syncLayoutOffsets);
        ro.observe(bar);
        ro.observe(wrapper);

        const mo = new MutationObserver(() => syncLayoutOffsets());
        mo.observe(wrapper, { childList: true, subtree: true });

        syncLayoutOffsets();
        const rafId = requestAnimationFrame(syncLayoutOffsets);

        return () => {
            cancelAnimationFrame(rafId);
            ro.disconnect();
            mo.disconnect();
        };
    }, [project?.id, viewerMode, project?.modelCategory, engineReadyTick, isTopBarCollapsed, isFloatingToolbarCollapsed]);

    // Toggle visibility of the floating toolbar overlay (<bim-grid class="toc-viewport-floating-grid">)
    React.useEffect(() => {
        const wrapper = viewerWrapperRef.current;
        if (!wrapper) return;
        const floatingGrid = wrapper.querySelector(".toc-viewport-floating-grid") as HTMLElement | null;
        if (floatingGrid) {
            floatingGrid.style.display = isFloatingToolbarCollapsed ? "none" : "";
        }
    }, [isFloatingToolbarCollapsed, engineReadyTick]);
    React.useEffect(() => {
        const components = componentsRef.current;
        if (engineReadyTick === 0 || !components) return;

        if (queryContainerRef.current) {
            try {
                const [queriesSection] = BUI.Component.create<
                    BUI.PanelSection,
                    templates.QueriesSectionState
                >(templates.queriesTemplate, { components });
                queryContainerRef.current.replaceChildren(queriesSection);
            } catch (err) {
                console.warn("[QueryPanel] Error mounting query panel:", err);
            }
        }

        if (modelsContainerRef.current) {
            try {
                const [modelsPanel] = BUI.Component.create<
                    BUI.PanelSection,
                    templates.ModelsState
                >(templates.modelsTemplate, { components });
                modelsContainerRef.current.replaceChildren(modelsPanel);
            } catch (err) {
                console.warn("[ThatOpen] Error mounting models panel:", err);
            }
        }

        if (propertiesContainerRef.current) {
            try {
                const [propsPanel] = BUI.Component.create<
                    BUI.PanelSection,
                    templates.ItemsDataState
                >(templates.itemsDataTemplate, { components });
                propertiesContainerRef.current.replaceChildren(propsPanel);
            } catch (err) {
                console.warn("[ThatOpen] Error mounting properties panel:", err);
            }
        }

        if (dataEnhancerContainerRef.current) {
            try {
                const [enhancerSection] = BUI.Component.create<
                    BUI.PanelSection,
                    templates.DataSourcesState
                >(templates.dataSourcesTemplate, {
                    components,
                    projectId: project?.id,
                });
                dataEnhancerContainerRef.current.replaceChildren(enhancerSection);
            } catch (err) {
                console.warn("[DataEnhancer] Error mounting UI:", err);
            }
        }

        if (smartViewsContainerRef.current) {
            try {
                const [smartViewsSection] = BUI.Component.create<
                    BUI.PanelSection,
                    templates.SmartViewsSectionState
                >(templates.smartViewsSectionTemplate, { components });
                smartViewsContainerRef.current.replaceChildren(smartViewsSection);

                // Auto-hydrate saved coordination viewpoints from Cloud Firestore
                if (project?.id) {
                    const smartViews = components.get(SmartViews);
                    smartViews.loadFromFirestore(project.id).catch((err) => {
                        console.warn("[SmartViews] Error loading from Firestore:", err);
                    });
                    smartViews.onViewCreated.add(() => {
                        smartViews.saveToFirestore(project.id);
                    });
                    smartViews.onViewDeleted.add(() => {
                        smartViews.saveToFirestore(project.id);
                    });
                }
            } catch (err) {
                console.warn("[SmartViews] Error mounting UI:", err);
            }
        }

        if (gisContainerRef.current) {
            try {
                const [gisSection] = BUI.Component.create<
                    BUI.PanelSection,
                    templates.GISState
                >(templates.gisTemplate, { components });
                gisContainerRef.current.replaceChildren(gisSection);
            } catch (err) {
                console.warn("[GIS] Error mounting UI:", err);
            }
        }
    }, [engineReadyTick, project?.id]);

    // Helper: Compute combined bounding box of Fragments + Parametric scene meshes
    const computeSceneBounds = async (): Promise<THREE.Box3> => {
        const world = worldRef.current;
        const components = componentsRef.current;
        const bbox = new THREE.Box3();
        if (!world || !components) return bbox;

        try {
            const fragments = components.get(OBC.FragmentsManager);
            if (fragments.initialized && fragments.list.size > 0) {
                for (const [, model] of fragments.list) {
                    if (model?.box && !model.box.isEmpty()) {
                        bbox.union(model.box);
                    }
                }
                if (bbox.isEmpty()) {
                    const boxer = components.get(OBC.BoundingBoxer);
                    boxer.list.clear();
                    boxer.addFromModels();
                    const modelBox = boxer.get();
                    if (!modelBox.isEmpty()) bbox.union(modelBox);
                }
            }
        } catch {}

        if (world.scene?.three) {
            world.scene.three.traverse((child: any) => {
                if (
                    child.isMesh &&
                    child.visible &&
                    !child.name?.includes("grid") &&
                    !child.name?.includes("selection-box") &&
                    !(child as any).isGrid
                ) {
                    bbox.expandByObject(child);
                }
            });
        }
        return bbox;
    };

    const toggleMeasuring = () => {
        const next = !isMeasuring;
        setIsMeasuring(next);
        if (measurementSystemRef.current) {
            measurementSystemRef.current.setEnabled(next);
        }
        try {
            if (componentsRef.current) {
                const highlighter = componentsRef.current.get(OBCF.Highlighter);
                highlighter.enabled = !next;
            }
        } catch {}
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

    // Camera Presets + True Perspective <-> Orthographic 2D Plan projection synchronization
    const setCameraPreset = async (preset: "iso" | "plan" | "front") => {
        const world = worldRef.current;
        const components = componentsRef.current;
        const camera = world?.camera;
        const controls = (camera as any)?.controls;
        if (!world || !camera || !controls) return;

        const wasParametric = viewerMode === "parametric";
        const bbox = await computeSceneBounds();
        const modelCenter = new THREE.Vector3(0, 3, 0);
        let dist = 32;
        if (!bbox.isEmpty()) {
            bbox.getCenter(modelCenter);
            const size = new THREE.Vector3();
            bbox.getSize(size);
            dist = Math.max(size.length() * 0.65, Math.max(size.x, size.y, size.z) * 1.35, 16);
        }

        const fragments = components?.get(OBC.FragmentsManager);

        if (preset === "plan") {
            const switchingProj =
                camera instanceof OBC.OrthoPerspectiveCamera &&
                camera.projection.current !== "Orthographic";
            setViewerMode("2d-plan");
            if (switchingProj && camera instanceof OBC.OrthoPerspectiveCamera) {
                try {
                    await camera.projection.set("Orthographic");
                } catch {}
            }
            await controls.setLookAt(
                modelCenter.x,
                modelCenter.y + dist * 1.45,
                modelCenter.z + 0.01,
                modelCenter.x,
                modelCenter.y,
                modelCenter.z,
                false
            );
            if (camera instanceof OBC.SimpleCamera && !bbox.isEmpty()) {
                try {
                    if (fragments?.initialized && fragments.list.size > 0) {
                        await camera.fitToItems();
                    }
                } catch {}
            }
        } else {
            const switchingProj =
                camera instanceof OBC.OrthoPerspectiveCamera &&
                camera.projection.current !== "Perspective";
            if (viewerMode === "2d-plan" || viewerMode === "parametric") {
                setViewerMode("bim-world");
            }
            if (switchingProj && camera instanceof OBC.OrthoPerspectiveCamera) {
                try {
                    await camera.projection.set("Perspective");
                    await controls.zoomTo(1, false);
                } catch {}
            }
            const animateTransition = !switchingProj && !wasParametric;
            if (preset === "iso") {
                await controls.setLookAt(
                    modelCenter.x + dist * 0.78,
                    modelCenter.y + dist * 0.62,
                    modelCenter.z + dist * 0.78,
                    modelCenter.x,
                    modelCenter.y,
                    modelCenter.z,
                    animateTransition
                );
            } else {
                await controls.setLookAt(
                    modelCenter.x,
                    modelCenter.y + dist * 0.25,
                    modelCenter.z + dist * 1.25,
                    modelCenter.x,
                    modelCenter.y,
                    modelCenter.z,
                    animateTransition
                );
            }
        }

        const syncFragmentsToCamera = () => {
            try {
                if (world.isDisposing) return;
                if (wasParametric) {
                    if (world.renderer instanceof OBC.SimpleRenderer) {
                        world.renderer.resize();
                    }
                    if (camera instanceof OBC.OrthoPerspectiveCamera) {
                        camera.updateAspect();
                    }
                }
                const activeThreeCam = camera.three;
                if (
                    fragments?.initialized &&
                    (activeThreeCam instanceof THREE.PerspectiveCamera ||
                        activeThreeCam instanceof THREE.OrthographicCamera)
                ) {
                    for (const [, model] of fragments.list) {
                        model?.useCamera(activeThreeCam);
                    }
                    fragments.core.update(true);
                }
            } catch {}
        };

        syncFragmentsToCamera();
        requestAnimationFrame(syncFragmentsToCamera);
    };

    const handleZoom = (zoomIn: boolean) => {
        const controls = (worldRef.current?.camera as any)?.controls;
        if (!controls) return;
        controls.dolly(zoomIn ? 3 : -3, true);
    };

    const fitModelView = async () => {
        const world = worldRef.current;
        const components = componentsRef.current;
        const controls = (world?.camera as any)?.controls;
        if (!world || !controls) return;

        try {
            const fragments = components?.get(OBC.FragmentsManager);
            if (world.camera instanceof OBC.SimpleCamera && fragments?.initialized && fragments.list.size > 0) {
                await world.camera.fitToItems();
                return;
            }
        } catch {}

        const bbox = await computeSceneBounds();
        if (!bbox.isEmpty()) {
            await controls.fitToBox(bbox, true, {
                paddingLeft: 1.25,
                paddingRight: 1.25,
                paddingTop: 1.25,
                paddingBottom: 1.25,
            });
        } else {
            await controls.setLookAt(20, 14, 22, 0, 3, 0, true);
        }
    };

    const toggleAutoOrbit = () => {
        const controls = (worldRef.current?.camera as any)?.controls;
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
        let disposed = false;
        let componentsInstance: OBC.Components | null = null;
        let loadedModelInstance: any = null;
        let animId: number | null = null;
        let attachedCanvas: HTMLCanvasElement | null = null;
        let pointerMoveHandler: ((evt: MouseEvent) => void) | null = null;
        let pointerClickHandler: ((evt: MouseEvent) => void) | null = null;

        setSelectedElement(null);
        setActiveDrawer(null);
        setIsMeasuring(false);
        setMeasurementsCount(0);
        setCustomIfcName(null);

        const setupGrid = async () => {
            try {
                const { components, world, viewport, loadedModel } = await setupComponents(project ?? undefined);
                if (disposed) {
                    try { loadedModel?.dispose(); } catch {}
                    try { components.dispose(); } catch {}
                    return;
                }

                componentsInstance = components;
                componentsRef.current = components;
                worldRef.current = world;
                loadedModelInstance = loadedModel;
                setEngineReadyTick((n) => n + 1);

                const grid = gridRef.current;
                if (grid) {
                    grid.elements = {
                        viewport: {
                            template: templates.viewportTemplate,
                            initialState: { viewport },
                        },
                    };

                    grid.layouts = {
                        main: {
                            template: `
                                "viewport" 1fr
                                / 1fr
                            `,
                        },
                    };

                    grid.layout = "main";
                }

                // Wire Highlighter Selection Events -> Element Inspector Card with real IFC Metadata
                try {
                    const highlighter = components.get(OBCF.Highlighter);
                    const fragments = components.get(OBC.FragmentsManager);
                    const boxer = components.get(OBC.BoundingBoxer);

                    highlighter.events.select.onHighlight.add(async (modelIdMap) => {
                        if (disposed || !fragments.initialized || OBC.ModelIdMapUtils.isEmpty(modelIdMap)) return;
                        try {
                            const dataMap = await fragments.getData(modelIdMap, { attributesDefault: true });
                            if (disposed) return;
                            boxer.list.clear();
                            await boxer.addFromModelIdMap(modelIdMap);
                            const bbox = boxer.get();
                            const size = new THREE.Vector3();
                            const center = new THREE.Vector3();
                            if (!bbox.isEmpty()) {
                                bbox.getSize(size);
                                bbox.getCenter(center);
                            }

                            for (const [, items] of Object.entries(dataMap)) {
                                const first = items?.[0];
                                if (!first) continue;
                                const localId = unwrapIfcAttr((first as any)._localId) || "IFC";
                                const category = unwrapIfcAttr((first as any)._category) || "IfcProduct";
                                const elName =
                                    unwrapIfcAttr((first as any).Name) ||
                                    unwrapIfcAttr((first as any).ObjectType) ||
                                    `${category} #${localId}`;
                                const guid = unwrapIfcAttr((first as any)._guid);

                                setSelectedElement({
                                    elementId: guid ? `${localId} · ${guid.slice(0, 8)}` : String(localId),
                                    name: elName,
                                    type: `${category} · OpenBIM`,
                                    point: center,
                                    width: size.x,
                                    height: size.y,
                                    depth: size.z,
                                    triangleCount: Math.max(12, Math.round(size.length() * 24)),
                                });
                                break;
                            }
                        } catch (err) {
                            console.warn("[Inspector] Could not resolve fragment attributes:", err);
                        }
                    });

                    highlighter.events.select.onClear.add(() => {
                        if (!disposed) setSelectedElement(null);
                    });
                } catch {}

                // Initialize Advanced BIM Measurement System
                const measureSystem = new BimMeasurementSystem(components, world);
                measurementSystemRef.current = measureSystem;
                measureSystem.onMeasurementChange = (records) => {
                    setMeasurementsCount(records.length);
                };

                const canvas = world.renderer?.three.domElement || null;
                if (canvas) {
                    attachedCanvas = canvas;
                    const raycaster = new THREE.Raycaster();
                    const fragments = components.get(OBC.FragmentsManager);
                    let isPickingMeasureHover = false;

                    // Only raycast explicit parametric Three.js Meshes with valid non-interleaved float position attributes.
                    // Prevents THREE.Raycaster from indexing internal Fragments LOD/BVH placeholder geometries (BufferAttribute.getX crash).
                    const collectPickableMeshes = (): THREE.Mesh[] => {
                        const meshes: THREE.Mesh[] = [];
                        if (!world.scene?.three) return meshes;
                        world.scene.three.traverse((obj) => {
                            if (!(obj instanceof THREE.Mesh)) return;
                            if (!obj.visible) return;
                            if (
                                obj.name.includes("measurement") ||
                                obj.name.includes("selection-box") ||
                                obj.name.includes("grid") ||
                                (obj as any).isGrid
                            ) {
                                return;
                            }
                            const posAttr = obj.geometry?.attributes?.position;
                            if (
                                !posAttr ||
                                posAttr.count <= 0 ||
                                (posAttr as any).isInterleavedBufferAttribute
                            ) {
                                return;
                            }
                            meshes.push(obj);
                        });
                        return meshes;
                    };

                    const safePickThreeMeshes = (x: number, y: number): THREE.Intersection | null => {
                        const cam = (world as unknown as { _camera?: OBC.OrthoPerspectiveCamera })._camera;
                        if (disposed || world.isDisposing || !cam) return null;
                        const pickables = collectPickableMeshes();
                        if (pickables.length === 0) return null;
                        raycaster.setFromCamera(new THREE.Vector2(x, y), cam.three);
                        try {
                            const hits = raycaster.intersectObjects(pickables, false);
                            return hits[0] ?? null;
                        } catch {
                            return null;
                        }
                    };

                    pointerMoveHandler = (evt: MouseEvent) => {
                        if (disposed || world.isDisposing || !measureSystem.enabled) return;
                        const rect = canvas.getBoundingClientRect();
                        if (rect.width <= 0 || rect.height <= 0) return;
                        const x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
                        const y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;

                        const hasFragments = fragments.initialized && fragments.list.size > 0;
                        if (hasFragments) {
                            if (isPickingMeasureHover) return;
                            isPickingMeasureHover = true;
                            void (async () => {
                                try {
                                    if (disposed || world.isDisposing || !fragments.initialized) return;
                                    const worldRaycaster = components.get(OBC.Raycasters).get(world);
                                    const hit = await worldRaycaster.castRay({ items: [] });
                                    if (!disposed && measureSystem.enabled) {
                                        measureSystem.handlePointerMove(hit?.point ?? null);
                                    }
                                } catch {
                                } finally {
                                    isPickingMeasureHover = false;
                                }
                            })();
                            return;
                        }

                        const validHit = safePickThreeMeshes(x, y);
                        measureSystem.handlePointerMove(validHit ? validHit.point : null);
                    };

                    pointerClickHandler = (evt: MouseEvent) => {
                        if (disposed || world.isDisposing) return;
                        const rect = canvas.getBoundingClientRect();
                        if (rect.width <= 0 || rect.height <= 0) return;
                        const x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
                        const y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;

                        const hasFragments = fragments.initialized && fragments.list.size > 0;

                        if (measureSystem.enabled) {
                            if (hasFragments) {
                                void (async () => {
                                    try {
                                        if (disposed || world.isDisposing || !fragments.initialized) return;
                                        const worldRaycaster = components.get(OBC.Raycasters).get(world);
                                        const hit = await worldRaycaster.castRay({ items: [] });
                                        if (!disposed && measureSystem.enabled && hit?.point) {
                                            measureSystem.handleClick(hit.point);
                                        }
                                    } catch {}
                                })();
                            } else {
                                const validHit = safePickThreeMeshes(x, y);
                                if (validHit) {
                                    measureSystem.handleClick(validHit.point);
                                }
                            }
                            return;
                        }

                        // Let OBCF.Highlighter handle Fragment models via real IFC Express IDs;
                        // run semantic Three.js Mesh picking ONLY for 3D Parametric digital twin scenes.
                        if (hasFragments) {
                            return;
                        }

                        const validHit = safePickThreeMeshes(x, y);
                        if (validHit && validHit.object instanceof THREE.Mesh) {
                            const mesh = validHit.object;
                            (window as any).__selectedThreeMesh = mesh;
                            if (selectionBoxRef.current) {
                                world.scene.three.remove(selectionBoxRef.current);
                                selectionBoxRef.current.dispose();
                            }
                            const boxHelper = new THREE.BoxHelper(mesh, 0x38bdf8);
                            boxHelper.name = "selection-box-helper";
                            world.scene.three.add(boxHelper);
                            selectionBoxRef.current = boxHelper;
                            (window as any).__selectionBoxHelper = boxHelper;

                            const info = resolveBimElementInfo(mesh, validHit.point, project ?? undefined);
                            setSelectedElement(info);
                        } else if (!validHit) {
                            (window as any).__selectedThreeMesh = null;
                            if (selectionBoxRef.current) {
                                world.scene.three.remove(selectionBoxRef.current);
                                selectionBoxRef.current.dispose();
                                selectionBoxRef.current = null;
                            }
                            (window as any).__selectionBoxHelper = null;
                            setSelectedElement(null);
                        }
                    };

                    canvas.addEventListener("mousemove", pointerMoveHandler);
                    canvas.addEventListener("click", pointerClickHandler);
                }

                // Continuous Animation Loop for Camera Controls & Dynamic Twin Updates
                const startTime = performance.now();
                let lastTime = startTime;
                const loop = (time: number) => {
                    if (disposed || world.isDisposing) return;
                    const delta = Math.min((time - lastTime) / 1000, 0.1);
                    const elapsedSeconds = (time - startTime) / 1000;
                    lastTime = time;
                    if ((world?.camera as any)?.controls) {
                        (world.camera as any).controls.update(delta);
                    }
                    if (loadedModel?.update) {
                        loadedModel.update(elapsedSeconds);
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
            disposed = true;
            if (animId) cancelAnimationFrame(animId);
            if (attachedCanvas && pointerMoveHandler) {
                attachedCanvas.removeEventListener("mousemove", pointerMoveHandler);
            }
            if (attachedCanvas && pointerClickHandler) {
                attachedCanvas.removeEventListener("click", pointerClickHandler);
            }
            modelsContainerRef.current?.replaceChildren();
            propertiesContainerRef.current?.replaceChildren();
            queryContainerRef.current?.replaceChildren();
            dataEnhancerContainerRef.current?.replaceChildren();
            smartViewsContainerRef.current?.replaceChildren();
            gisContainerRef.current?.replaceChildren();

            if (selectionBoxRef.current && worldRef.current) {
                try {
                    worldRef.current.scene.three.remove(selectionBoxRef.current);
                    selectionBoxRef.current.dispose();
                } catch {}
                selectionBoxRef.current = null;
            }
            if (measurementSystemRef.current) {
                try { measurementSystemRef.current.dispose(); } catch {}
                measurementSystemRef.current = null;
            }
            if (loadedModelInstance) {
                try { loadedModelInstance.dispose(); } catch {}
            }
            if (componentsInstance) {
                try {
                    const hl = componentsInstance.get(OBCF.Highlighter);
                    hl.enabled = false;
                } catch {}
                try {
                    const rc = worldRef.current
                        ? componentsInstance.get(OBC.Raycasters).get(worldRef.current)
                        : null;
                    if (rc) rc.enabled = false;
                } catch {}
                try { componentsInstance.dispose(); } catch {}
            }
            worldRef.current = null;
            componentsRef.current = null;
        };
    }, [project?.id]);

    // Direct Firestore fallback on hard refresh of /project/:id
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

                    const projectName = data.name || "Untitled Project";
                    const modelCategory: "ifc" | "3d" = (data.ifcFileName || projectName.toLowerCase().includes("ifc") || data.modelCategory === "ifc") ? "ifc" : (data.modelCategory || "3d");

                    const projectData: IProject = {
                        name: projectName,
                        description: data.description || "",
                        status: data.status || "Active",
                        userRole: data.userRole || "Architect",
                        finishDate,
                        cost: Number(data.cost || 0),
                        progress: Number(data.progress || 0),
                        modelType: data.modelType || "tower",
                        modelCategory,
                        ifcFileName: data.ifcFileName,
                        ifcSchema: data.ifcSchema,
                        iconColor: data.iconColor,
                        todos: Array.isArray(data.todos) ? data.todos : [],
                        smartViews: Array.isArray(data.smartViews) ? data.smartViews : [],
                    };

                    try {
                        projectsManager.newProject(projectData, docSnap.id);
                    } catch {
                        const existing = projectsManager.getProject(docSnap.id);
                        if (existing) {
                            projectsManager.updateProject(existing.id, projectData);
                        }
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

    project = projectId ? projectsManager.getProject(projectId) : null;

    if (!projectId) {
        return (
            <ProjectNotFound
                title="Missing Project ID"
                message="A project ID parameter is required in the URL to view details. Example: /project/<uuid>"
            />
        );
    }

    if (!project && isLoadingFromCloud) {
        return (
            <div
                className="page"
                id="project-details"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}
            >
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

    const badgeText = customIfcName
        ? `Loaded: ${customIfcName}`
        : project.ifcSchema
        ? `${project.ifcSchema} · OpenBIM`
        : project.modelCategory === "3d"
        ? "3D Parametric Twin"
        : "IFC4 · OpenBIM";

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
                        <span>{badgeText}</span>
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

                <div className="details-viewer-wrapper" ref={viewerWrapperRef}>
                    {/* Top Viewport Mode Switcher & Course Tools Bar */}
                    <div
                        className="viewer-mode-switch-bar"
                        ref={modeBarRef}
                        style={{
                            display: isTopBarCollapsed ? "none" : "flex",
                            transition: "all 0.2s ease",
                        }}
                    >
                        <button
                            type="button"
                            className={`viewer-mode-tab ${viewerMode === "bim-world" ? "active" : ""}`}
                            onClick={() => setCameraPreset("iso")}
                            title="That Open Engine BIM World (3D Perspective View)"
                        >
                            <span className="material-icons-round">public</span>
                            <span>BIM World</span>
                        </button>

                        <button
                            type="button"
                            className={`viewer-mode-tab ${viewerMode === "2d-plan" ? "active" : ""}`}
                            onClick={() => setCameraPreset("plan")}
                            title="2D Top-Down Orthographic CAD Plan View"
                        >
                            <span className="material-icons-round">architecture</span>
                            <span>2D Plan</span>
                        </button>

                        {project.modelCategory === "3d" && !project.ifcFileName && !project.name.toLowerCase().includes("ifc") && (
                            <button
                                type="button"
                                className={`viewer-mode-tab ${viewerMode === "parametric" ? "active" : ""}`}
                                onClick={() => {
                                    setActiveDrawer(null);
                                    setViewerMode("parametric");
                                }}
                                title="High-Performance 3D CAD Studio (Three.js)"
                            >
                                <span className="material-icons-round">view_in_ar</span>
                                <span>3D Model</span>
                            </button>
                        )}

                        <button
                            type="button"
                            className={`viewer-mode-tab toc-course-pill ${activeDrawer === "models" ? "active" : ""}`}
                            onClick={() => toggleDrawer("models")}
                            title="Open Federated BIM Models & IFC Tree"
                        >
                            <span className="material-icons-round">folder_open</span>
                            <span>Models</span>
                        </button>

                        <button
                            type="button"
                            className={`viewer-mode-tab toc-course-pill ${activeDrawer === "query" ? "active" : ""}`}
                            onClick={() => toggleDrawer("query")}
                            title="Execute Spatial & Semantic IFC Queries"
                        >
                            <span className="material-icons-round">search</span>
                            <span>Query</span>
                        </button>

                        <button
                            type="button"
                            className={`viewer-mode-tab toc-course-pill ${activeDrawer === "properties" ? "active" : ""}`}
                            onClick={() => toggleDrawer("properties")}
                            title="Inspect IFC Schema Properties & Quantity Sets"
                        >
                            <span className="material-icons-round">table_chart</span>
                            <span>Properties</span>
                        </button>

                        <button
                            type="button"
                            className={`viewer-mode-tab toc-course-pill ${activeDrawer === "enhance" ? "active" : ""}`}
                            onClick={() => toggleDrawer("enhance")}
                            title="Connect External Engineering Specifications & Field QA"
                        >
                            <span className="material-icons-round">storage</span>
                            <span>Enhance</span>
                        </button>

                        <button
                            type="button"
                            className={`viewer-mode-tab toc-course-pill ${activeDrawer === "smart-views" ? "active" : ""}`}
                            onClick={() => toggleDrawer("smart-views")}
                            title="Multi-Disciplinary BIM Coordination Viewpoints"
                        >
                            <span className="material-icons-round">camera</span>
                            <span>Smart Views</span>
                        </button>

                        <button
                            type="button"
                            className={`viewer-mode-tab toc-course-pill ${activeDrawer === "gis" ? "active" : ""}`}
                            onClick={() => toggleDrawer("gis")}
                            title="Cesium GIS & Geospatial Environment"
                        >
                            <span className="material-icons-round">public</span>
                            <span>GIS</span>
                        </button>

                        <div style={{ width: "1px", height: "16px", background: "rgba(148, 163, 184, 0.25)", margin: "0 2px" }} />

                        {/* Top Bar Minimize Button */}
                        <button
                            type="button"
                            className="viewer-mode-tab"
                            onClick={() => setIsTopBarCollapsed(true)}
                            title="Collapse Navigation Bar"
                            style={{ padding: "5px 7px", color: "#94a3b8" }}
                        >
                            <span className="material-icons-round" style={{ fontSize: "16px" }}>expand_less</span>
                        </button>
                    </div>

                    {/* Floating Pill to Restore Navigation Bar when Collapsed */}
                    {isTopBarCollapsed && (
                        <button
                            type="button"
                            className="viewer-bar-restore-pill"
                            onClick={() => setIsTopBarCollapsed(false)}
                            title="Show BIM Navigation Bar"
                            style={{
                                position: "absolute",
                                top: "12px",
                                left: "14px",
                                zIndex: 31,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                background: "rgba(15, 23, 42, 0.92)",
                                backdropFilter: "blur(14px)",
                                border: "1px solid rgba(56, 189, 248, 0.4)",
                                borderRadius: "14px",
                                padding: "6px 12px",
                                color: "#38bdf8",
                                fontSize: "0.76rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                            }}
                        >
                            <span className="material-icons-round" style={{ fontSize: "16px" }}>menu</span>
                            <span>Show Nav</span>
                        </button>
                    )}

                    <ViewerErrorBoundary>
                        {/* That Open Engine Viewport Grid (BIM World & 2D Plan View) */}
                        <div
                            style={{
                                position: "relative",
                                width: "100%",
                                height: "100%",
                                display: viewerMode === "bim-world" || viewerMode === "2d-plan" ? "block" : "none",
                            }}
                        >
                            {/* Dockable Models Manager Drawer — Mounted Once */}
                            <div
                                className="toc-dock-panel toc-dock-left"
                                data-drawer="models"
                                style={{ display: activeDrawer === "models" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>folder_open</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>Federated Model Inventory & IFC Tree</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setActiveDrawer(null)}
                                        className="btn-close-dock"
                                        title="Close Models Inventory"
                                    >
                                        &times;
                                    </button>
                                </div>
                                <div ref={modelsContainerRef} className="toc-dock-body"></div>
                            </div>

                            {/* Dockable Query & ItemsFinder Drawer — Mounted Once */}
                            <div
                                className="toc-dock-panel toc-dock-right"
                                data-drawer="query"
                                style={{ display: activeDrawer === "query" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>search</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>IFC Spatial Query & Relational Engine</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setActiveDrawer(null)}
                                        className="btn-close-dock"
                                        title="Close Query Engine"
                                    >
                                        &times;
                                    </button>
                                </div>
                                <div ref={queryContainerRef} className="toc-dock-body"></div>
                            </div>

                            {/* Dockable Element Properties Drawer — Mounted Once */}
                            <div
                                className="toc-dock-panel toc-dock-right"
                                data-drawer="properties"
                                style={{ display: activeDrawer === "properties" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>table_chart</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>IFC Schema Property Set Inspector</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setActiveDrawer(null)}
                                        className="btn-close-dock"
                                        title="Close Property Inspector"
                                    >
                                        &times;
                                    </button>
                                </div>
                                <div ref={propertiesContainerRef} className="toc-dock-body"></div>
                            </div>

                            {/* Dockable Data Enhancer Drawer — Mounted Once */}
                            <div
                                className="toc-dock-panel toc-dock-right"
                                data-drawer="enhance"
                                style={{ display: activeDrawer === "enhance" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>storage</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>Engineering Specifications & QA Matrix</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setActiveDrawer(null)}
                                        className="btn-close-dock"
                                        title="Close Specifications Panel"
                                    >
                                        &times;
                                    </button>
                                </div>
                                <div ref={dataEnhancerContainerRef} className="toc-dock-body"></div>
                            </div>

                            {/* Dockable Smart Views Drawer — Mounted Once */}
                            <div
                                className="toc-dock-panel toc-dock-left"
                                data-drawer="smart-views"
                                style={{ display: activeDrawer === "smart-views" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>camera</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>BIM Coordination Viewpoints & Overrides</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setActiveDrawer(null)}
                                        className="btn-close-dock"
                                        title="Close Coordination Viewpoints"
                                    >
                                        &times;
                                    </button>
                                </div>
                                <div ref={smartViewsContainerRef} className="toc-dock-body"></div>
                            </div>

                            {/* Dockable GIS & Geospatial Drawer — Mounted Once */}
                            <div
                                className="toc-dock-panel toc-dock-left"
                                data-drawer="gis"
                                style={{ display: activeDrawer === "gis" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>public</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>Cesium GIS & Geospatial Environment</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setActiveDrawer(null)}
                                        className="btn-close-dock"
                                        title="Close GIS Panel"
                                    >
                                        &times;
                                    </button>
                                </div>
                                <div ref={gisContainerRef} className="toc-dock-body"></div>
                            </div>

                            <bim-grid
                                className="viewer-grid"
                                ref={gridRef}
                                style={{
                                    width: "100%",
                                    height: "100%",
                                    display: "block",
                                }}
                            ></bim-grid>

                            {/* 2D Plan CAD Sheet Banner (right-aligned below toolbar so it never overlaps) */}
                            {viewerMode === "2d-plan" && (
                                <div
                                    className="plan-mode-banner"
                                    style={{
                                        position: "absolute",
                                        top: "calc(var(--toolbar-bottom, 166px) + 8px)",
                                        right: "16px",
                                        zIndex: 18,
                                        background: "rgba(15, 23, 42, 0.94)",
                                        border: "1px solid rgba(56, 189, 248, 0.45)",
                                        borderRadius: "20px",
                                        padding: "5px 14px",
                                        color: "#38bdf8",
                                        fontSize: "0.80rem",
                                        fontWeight: 600,
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "7px",
                                        backdropFilter: "blur(12px)",
                                        boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
                                        pointerEvents: "none",
                                    }}
                                >
                                    <span className="material-icons-round" style={{ fontSize: "16px", color: "#38bdf8" }}>
                                        architecture
                                    </span>
                                    <span>2D Orthographic CAD Plan View</span>
                                </div>
                            )}

                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".ifc"
                                onChange={handleIfcFileSelected}
                                style={{ display: "none" }}
                            />

                            {isMeasuring && (
                                <div className="measurement-banner">
                                    <span className="material-icons-round">straighten</span>
                                    <span>Measurement Mode: Click Point A on any surface, then click Point B to calculate distance.</span>
                                </div>
                            )}

                            {selectedElement && !activeDrawer && (
                                <div className="element-inspector-card">
                                    <div className="inspector-header">
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
                                            <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px", flexShrink: 0 }}>
                                                layers
                                            </span>
                                            <h4
                                                style={{
                                                    margin: 0,
                                                    fontSize: "0.88rem",
                                                    color: "#f8fafc",
                                                    fontWeight: 700,
                                                    lineHeight: 1.35,
                                                    wordBreak: "break-word",
                                                }}
                                            >
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

                            {isParsingIfc && (
                                <div className="ifc-loading-overlay">
                                    <div className="ifc-loading-spinner"></div>
                                    <p>Parsing IFC model & generating That Open Fragments...</p>
                                </div>
                            )}

                            {/* Floating CAD Navigation HUD Toolbar */}
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
                                    title="Top Plan View (Orthographic 2D)"
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
                                <div style={{ width: "1px", height: "16px", background: "rgba(148, 163, 184, 0.3)", margin: "0 1px", flexShrink: 0 }} />
                                {/* Toggle Floating Toolbar Overlay */}
                                <button
                                    type="button"
                                    onClick={() => setIsFloatingToolbarCollapsed((prev) => !prev)}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "5px 9px",
                                        background: isFloatingToolbarCollapsed ? "rgba(245, 158, 11, 0.22)" : "rgba(30, 41, 59, 0.85)",
                                        border: isFloatingToolbarCollapsed ? "1px solid #f59e0b" : "1px solid rgba(148, 163, 184, 0.25)",
                                        borderRadius: "20px",
                                        color: isFloatingToolbarCollapsed ? "#fbbf24" : "#f8fafc",
                                        cursor: "pointer",
                                        fontSize: "0.76rem",
                                        fontWeight: 600,
                                        flexShrink: 0,
                                    }}
                                    title={isFloatingToolbarCollapsed ? "Show Quick-Action BIM Toolbar (Color, Visibility, Ghost, Focus)" : "Hide Quick-Action BIM Toolbar"}
                                >
                                    <span className="material-icons-round" style={{ fontSize: "15px" }}>
                                        {isFloatingToolbarCollapsed ? "visibility" : "visibility_off"}
                                    </span>
                                    <span className="hud-btn-label">{isFloatingToolbarCollapsed ? "Show Tools" : "Hide Tools"}</span>
                                </button>
                                {/* Fullscreen 100% Canvas Toggle Button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = !isTopBarCollapsed;
                                        setIsTopBarCollapsed(next);
                                        // When entering 100% fullscreen canvas, also hide floating toolbar for complete full bleed
                                        if (next) {
                                            setIsFloatingToolbarCollapsed(true);
                                        } else {
                                            setIsFloatingToolbarCollapsed(false);
                                        }
                                    }}
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        padding: "5px 9px",
                                        background: isTopBarCollapsed ? "rgba(56, 189, 248, 0.25)" : "rgba(30, 41, 59, 0.85)",
                                        border: isTopBarCollapsed ? "1px solid #38bdf8" : "1px solid rgba(148, 163, 184, 0.25)",
                                        borderRadius: "20px",
                                        color: isTopBarCollapsed ? "#38bdf8" : "#f8fafc",
                                        cursor: "pointer",
                                        fontSize: "0.76rem",
                                        fontWeight: 600,
                                        flexShrink: 0,
                                    }}
                                    title={isTopBarCollapsed ? "Show Navigation & Tools Bars" : "Hide Both Bars (100% Unobstructed Fullscreen Canvas)"}
                                >
                                    <span className="material-icons-round" style={{ fontSize: "15px" }}>
                                        {isTopBarCollapsed ? "close_fullscreen" : "fullscreen"}
                                    </span>
                                    <span className="hud-btn-label">{isTopBarCollapsed ? "Dock Bars" : "Fullscreen"}</span>
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
