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
import { EmbeddingsStudio } from "./EmbeddingsStudio";
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
    GISLayers,
    SheetsSync,
    McpAgent,
    BimProSuite,
    FragmentsEditStudio,
    Modeler,
} from "../bim-components";
import { NavigationCube } from "./NavigationCube";

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
    if (project && project.modelCategory !== "empty" && (project.ifcFileName || project.name.toLowerCase().includes("ifc"))) {
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
    const [measureMode, setMeasureMode] = React.useState<"length" | "area">("length");
    const [measurementsCount, setMeasurementsCount] = React.useState<number>(0);
    const [isSectioningActive, setIsSectioningActive] = React.useState<boolean>(false);
    const [sectionPlanesCount, setSectionPlanesCount] = React.useState<number>(0);

    const [selectedElement, setSelectedElement] = React.useState<BimElementInfo | null>(null);
    const selectionBoxRef = React.useRef<THREE.BoxHelper | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const [isParsingIfc, setIsParsingIfc] = React.useState<boolean>(false);
    const [customIfcName, setCustomIfcName] = React.useState<string | null>(null);
    const [isLeftPaneCollapsed, setIsLeftPaneCollapsed] = React.useState<boolean>(false);
    const [isDraggingFile, setIsDraggingFile] = React.useState<boolean>(false);
    const [isPromptDismissed, setIsPromptDismissed] = React.useState<boolean>(false);

    const hasActiveModel = Boolean(
        (project?.ifcFileName && project.ifcFileName.trim().length > 0) ||
        customIfcName ||
        (project?.modelCategory === "3d" && project?.modelType !== "empty")
    );
    const isEmptyProject = Boolean(project && !hasActiveModel && project.modelCategory === "empty");

    type DockDrawerId =
        | "models"
        | "query"
        | "properties"
        | "enhance"
        | "smart-views"
        | "floor-plans"
        | "gis"
        | "sheets"
        | "mcp"
        | "pro-studio"
        | "fragments-edit"
        | "modeler"
        | "embeddings";
    const [activeDrawer, setActiveDrawer] = React.useState<DockDrawerId | null>(null);
    const [isDrawerExpanded, setIsDrawerExpanded] = React.useState<boolean>(false);
    const [isTopBarCollapsed, setIsTopBarCollapsed] = React.useState<boolean>(false);
    const [isFloatingToolbarCollapsed, setIsFloatingToolbarCollapsed] = React.useState<boolean>(false);
    const [openHeaderMenu, setOpenHeaderMenu] = React.useState<"views" | "inspect" | "workflows" | "studio" | null>(null);
    const [activeBottomSubbar, setActiveBottomSubbar] = React.useState<"camera" | "measure" | "section" | null>(null);
    const [cameraProjection, setCameraProjection] = React.useState<"Perspective" | "Orthographic">("Perspective");
    const [navControlMode, setNavControlMode] = React.useState<"Orbit" | "FirstPerson">("Orbit");
    const pressedKeysRef = React.useRef<Set<string>>(new Set());

    React.useEffect(() => {
        const isTypingTarget = (e: Event): boolean => {
            const path = typeof e.composedPath === "function" ? e.composedPath() : [e.target];
            return path.some((el: any) => {
                if (!el || !el.tagName) return false;
                const tag = String(el.tagName).toUpperCase();
                return (
                    tag === "INPUT" ||
                    tag === "TEXTAREA" ||
                    tag === "SELECT" ||
                    tag === "BIM-TEXT-INPUT" ||
                    tag === "BIM-NUMBER-INPUT" ||
                    Boolean(el.isContentEditable)
                );
            });
        };

        const handleOutsidePointerDown = (e: PointerEvent) => {
            if (!openHeaderMenu) return;
            const target = e.target as HTMLElement | null;
            if (!target?.closest(".viewer-menu-wrap")) {
                setOpenHeaderMenu(null);
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setOpenHeaderMenu(null);
                setActiveBottomSubbar(null);
                try {
                    componentsRef.current?.get(OBC.Hider).set(true);
                } catch {}
                return;
            }
            if (isTypingTarget(e) || e.ctrlKey || e.metaKey || e.altKey) return;

            const code = e.code;
            if (code === "KeyO" && !e.repeat) {
                e.preventDefault();
                const cam = worldRef.current?.camera;
                if (cam instanceof OBC.OrthoPerspectiveCamera) {
                    const nextProj = cam.projection.current === "Perspective" ? "Orthographic" : "Perspective";
                    cam.projection.set(nextProj).then(() => setCameraProjection(nextProj)).catch(() => {});
                }
                return;
            }
            if (code === "KeyF" && !e.repeat) {
                e.preventDefault();
                setIsLeftPaneCollapsed((prev) => !prev);
                return;
            }
            if ((code === "KeyH" || code === "Home") && !e.repeat) {
                e.preventDefault();
                const controls = (worldRef.current?.camera as any)?.controls;
                if (controls) {
                    controls.setLookAt(28, 22, 28, 0, 2, 0, true);
                }
                return;
            }
            if (
                code === "KeyW" ||
                code === "KeyA" ||
                code === "KeyS" ||
                code === "KeyD" ||
                code === "ArrowUp" ||
                code === "ArrowDown" ||
                code === "ArrowLeft" ||
                code === "ArrowRight" ||
                code === "Space" ||
                code === "ShiftLeft" ||
                code === "ShiftRight" ||
                code === "KeyQ" ||
                code === "KeyE" ||
                code === "KeyC"
            ) {
                if (code === "Space" || code.startsWith("Arrow")) e.preventDefault();
                pressedKeysRef.current.add(code);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            pressedKeysRef.current.delete(e.code);
        };
        const handleWindowBlur = () => {
            pressedKeysRef.current.clear();
        };

        window.addEventListener("pointerdown", handleOutsidePointerDown);
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);
        window.addEventListener("blur", handleWindowBlur);
        return () => {
            window.removeEventListener("pointerdown", handleOutsidePointerDown);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
            window.removeEventListener("blur", handleWindowBlur);
        };
    }, [openHeaderMenu, activeBottomSubbar]);

    const [engineReadyTick, setEngineReadyTick] = React.useState<number>(0);

    React.useEffect(() => {
        const components = componentsRef.current;
        if (!components) return;
        try {
            const mcp = components.get(McpAgent);
            mcp.isGisAllowed = isEmptyProject;
        } catch {}
        if (!isEmptyProject) {
            try {
                const gisLayers = components.get(GISLayers);
                if (gisLayers) {
                    gisLayers.layer3d.enabled = false;
                }
            } catch {}
            setActiveDrawer((prev) => (prev === "gis" ? null : prev));
        }
    }, [isEmptyProject, engineReadyTick]);
    const renderDockHeaderActions = (closeTitle: string) => (
        <div className="toc-dock-header-actions">
            <button
                type="button"
                onClick={() => setIsDrawerExpanded((prev) => !prev)}
                className={`btn-expand-dock ${isDrawerExpanded ? "active" : ""}`}
                title={isDrawerExpanded ? "Restore Standard Panel Width" : "Expand Advanced Feature Full Width"}
            >
                <span className="material-icons-round" style={{ fontSize: "14px" }}>
                    {isDrawerExpanded ? "close_fullscreen" : "open_in_full"}
                </span>
                <span>{isDrawerExpanded ? "Compact" : "Wide"}</span>
            </button>
            <button
                type="button"
                onClick={() => setActiveDrawer(null)}
                className="btn-close-dock"
                title={closeTitle}
            >
                &times;
            </button>
        </div>
    );

    const toggleDrawer = (drawer: DockDrawerId) => {
        if (drawer === "gis" && !isEmptyProject) return;
        setOpenHeaderMenu(null);
        setActiveDrawer((prev) => {
            const next = prev === drawer ? null : drawer;
            if (next === "gis") {
                requestAnimationFrame(() => {
                    const gisLayers = componentsRef.current?.get(GISLayers);
                    if (gisLayers?.layer2d?.viewer && !gisLayers.layer2d.viewer.isDestroyed()) {
                        gisLayers.layer2d.viewer.resize();
                    }
                });
            }
            return next;
        });
    };

    const viewerWrapperRef = React.useRef<HTMLDivElement | null>(null);
    const modeBarRef = React.useRef<HTMLDivElement | null>(null);
    const modelsContainerRef = React.useRef<HTMLDivElement | null>(null);
    const propertiesContainerRef = React.useRef<HTMLDivElement | null>(null);
    const queryContainerRef = React.useRef<HTMLDivElement | null>(null);
    const dataEnhancerContainerRef = React.useRef<HTMLDivElement | null>(null);
    const smartViewsContainerRef = React.useRef<HTMLDivElement | null>(null);
    const floorPlansContainerRef = React.useRef<HTMLDivElement | null>(null);
    const gisContainerRef = React.useRef<HTMLDivElement | null>(null);
    const sheetsContainerRef = React.useRef<HTMLDivElement | null>(null);
    const mcpContainerRef = React.useRef<HTMLDivElement | null>(null);
    const proStudioContainerRef = React.useRef<HTMLDivElement | null>(null);
    const fragmentsEditContainerRef = React.useRef<HTMLDivElement | null>(null);
    const modelerContainerRef = React.useRef<HTMLDivElement | null>(null);

    const [isFullscreenActive, setIsFullscreenActive] = React.useState<boolean>(false);

    const toggleFullViewMode = React.useCallback(async (forceEnable?: boolean) => {
        const nextFull = forceEnable !== undefined ? forceEnable : !isLeftPaneCollapsed;
        setIsLeftPaneCollapsed(nextFull);
        if (nextFull) {
            setActiveDrawer(null);
            setOpenHeaderMenu(null);
        }

        const wrapper = viewerWrapperRef.current;
        try {
            if (nextFull) {
                if (wrapper && !document.fullscreenElement && typeof wrapper.requestFullscreen === "function") {
                    await wrapper.requestFullscreen().catch(() => {});
                }
                document.body.classList.add("sidebar-collapsed");
            } else {
                if (document.fullscreenElement && typeof document.exitFullscreen === "function") {
                    await document.exitFullscreen().catch(() => {});
                }
                document.body.classList.remove("sidebar-collapsed");
            }
        } catch {}

        requestAnimationFrame(() => {
            window.dispatchEvent(new Event("resize"));
        });
    }, [isLeftPaneCollapsed]);

    React.useEffect(() => {
        const onFullscreenChange = () => {
            const active = Boolean(document.fullscreenElement);
            setIsFullscreenActive(active);
            if (!active) {
                document.body.classList.remove("sidebar-collapsed");
                window.dispatchEvent(new Event("resize"));
            }
        };
        const onOpenFragmentsEdit = () => {
            setActiveDrawer("fragments-edit");
            const comp = componentsRef.current;
            if (comp) {
                try {
                    comp.get(FragmentsEditStudio).scanModel().catch(() => {});
                } catch {}
            }
        };
        const onOpenModeler = () => {
            setActiveDrawer("modeler");
            const comp = componentsRef.current;
            if (comp) {
                try {
                    comp.get(Modeler).refreshContext();
                } catch {}
            }
        };
        const onActivateFullView = () => {
            void toggleFullViewMode(true);
        };
        document.addEventListener("fullscreenchange", onFullscreenChange);
        window.addEventListener("toc-open-fragments-edit", onOpenFragmentsEdit);
        window.addEventListener("toc-open-modeler", onOpenModeler);
        window.addEventListener("toc-activate-full-view", onActivateFullView);
        return () => {
            document.removeEventListener("fullscreenchange", onFullscreenChange);
            window.removeEventListener("toc-open-fragments-edit", onOpenFragmentsEdit);
            window.removeEventListener("toc-open-modeler", onOpenModeler);
            window.removeEventListener("toc-activate-full-view", onActivateFullView);
        };
    }, [toggleFullViewMode]);

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
            const toolbarVisible = Boolean(hasActiveModel && !isFloatingToolbarCollapsed && tr && tr.height > 10);
            const toolbarBottom = toolbarVisible
                ? Math.round(tr!.bottom - wrapperRect.top)
                : modeBarBottom;
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
    }, [project?.id, viewerMode, project?.modelCategory, engineReadyTick, isTopBarCollapsed, isFloatingToolbarCollapsed, hasActiveModel]);

    // Toggle visibility of the floating toolbar overlay (<bim-grid class="toc-viewport-floating-grid">)
    React.useEffect(() => {
        const wrapper = viewerWrapperRef.current;
        if (!wrapper) return;
        const floatingGrid = wrapper.querySelector(".toc-viewport-floating-grid") as HTMLElement | null;
        if (floatingGrid) {
            floatingGrid.style.display = (!hasActiveModel || isFloatingToolbarCollapsed) ? "none" : "";
        }
    }, [isFloatingToolbarCollapsed, engineReadyTick, hasActiveModel]);

    // Dynamically resize That Open Engine viewport & camera aspect when Full View is toggled
    React.useEffect(() => {
        const timer = setTimeout(() => {
            const world = worldRef.current;
            if (world) {
                try {
                    if (world.renderer instanceof OBC.SimpleRenderer) {
                        world.renderer.resize();
                    }
                    if (world.camera instanceof OBC.OrthoPerspectiveCamera) {
                        world.camera.updateAspect();
                    }
                } catch {}
            }
            window.dispatchEvent(new Event("resize"));
        }, 180);
        return () => clearTimeout(timer);
    }, [isLeftPaneCollapsed]);
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
                    const projectId = project.id;
                    const smartViews = components.get(SmartViews);
                    smartViews.loadFromFirestore(projectId).catch((err) => {
                        console.warn("[SmartViews] Error loading from Firestore:", err);
                    });
                    smartViews.onViewCreated.add(() => {
                        smartViews.saveToFirestore(projectId);
                    });
                    smartViews.onViewDeleted.add(() => {
                        smartViews.saveToFirestore(projectId);
                    });
                }
            } catch (err) {
                console.warn("[SmartViews] Error mounting UI:", err);
            }
        }

        if (floorPlansContainerRef.current) {
            try {
                const [plansSection] = BUI.Component.create<
                    BUI.PanelSection,
                    templates.FloorPlansSectionState
                >(templates.floorPlansTemplate, { components });
                floorPlansContainerRef.current.replaceChildren(plansSection);
            } catch (err) {
                console.warn("[FloorPlans] Error mounting UI:", err);
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

        if (sheetsContainerRef.current) {
            try {
                const [sheetsSection, updateSheets] = BUI.Component.create<
                    BUI.PanelSection,
                    templates.SheetsSectionState
                >(templates.sheetsTemplate, { components });
                sheetsContainerRef.current.replaceChildren(sheetsSection);
                const sheetsSync = components.get(SheetsSync);
                sheetsSync.onRowsExtracted.add(() => updateSheets());
                sheetsSync.onSyncCompleted.add(() => updateSheets());
            } catch (err) {
                console.warn("[Sheets] Error mounting UI:", err);
            }
        }

        if (mcpContainerRef.current) {
            try {
                const [mcpSection, updateMcp] = BUI.Component.create<
                    BUI.PanelSection,
                    templates.McpAgentSectionState
                >(templates.mcpAgentTemplate, { components });
                mcpContainerRef.current.replaceChildren(mcpSection);
                const mcp = components.get(McpAgent);
                mcp.onLogAdded.add(() => updateMcp());
                mcp.onChatUpdated.add(() => updateMcp());
                mcp.onModelLoaded.add((fileName) => {
                    setCustomIfcName(fileName);
                    setIsPromptDismissed(true);
                });
                mcp.onBridgeStatusChanged.add(() => updateMcp());
            } catch (err) {
                console.warn("[MCP] Error mounting UI:", err);
            }
        }

        if (proStudioContainerRef.current) {
            try {
                const [proSection, updatePro] = BUI.Component.create<
                    BUI.PanelSection,
                    templates.ProStudioSectionState
                >(templates.proStudioTemplate, { components });
                proStudioContainerRef.current.replaceChildren(proSection);
                const pro = components.get(BimProSuite);
                pro.onStateChanged.add(() => updatePro());
                pro.onClashLogRequested.add(async (clashes) => {
                    if (!project) return;
                    const createdTodos = clashes.slice(0, 15).map((c, idx) => ({
                        id: Date.now() + idx,
                        text: `[Clash ${c.id}] ${c.aName} × ${c.bName} (${c.overlapVolumeM3} m³)`,
                        date: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
                        status: "pending" as const,
                        priority: c.severity,
                        completed: false,
                    }));
                    project.todos = [...createdTodos, ...(project.todos || [])];
                    forceUpdate();
                    try {
                        await updateDoc(doc(db, "projects", project.id), {
                            todos: project.todos,
                        });
                    } catch {}
                    pro.statusMessage = `Logged ${createdTodos.length} clash(es) into Project Tasks.`;
                    updatePro();
                });
            } catch (err) {
                console.warn("[ProStudio] Error mounting UI:", err);
            }
        }

        if (fragmentsEditContainerRef.current) {
            try {
                const [editSection, updateEditSection] = BUI.Component.create<
                    BUI.PanelSection,
                    templates.FragmentsEditSectionState
                >(templates.fragmentsEditTemplate, { components });
                fragmentsEditContainerRef.current.replaceChildren(editSection);
                const editStudio = components.get(FragmentsEditStudio);
                editStudio.onStateChanged.add(() => updateEditSection());
                if (components.get(OBC.FragmentsManager).list.size > 0) {
                    editStudio.scanModel().catch(() => {});
                }
            } catch (err) {
                console.warn("[FragmentsEditStudio] Error mounting UI:", err);
            }
        }

        if (modelerContainerRef.current) {
            try {
                const [modelerSection, updateModelerSection] = BUI.Component.create<
                    BUI.PanelSection,
                    templates.ModelerSectionState
                >(templates.modelerTemplate, { components });
                modelerContainerRef.current.replaceChildren(modelerSection);
                const modeler = components.get(Modeler);
                modeler.onStateChanged.add(() => updateModelerSection());
                modeler.onFragmentModelBaked.add((fragModel) => {
                    setIsPromptDismissed(true);
                    setCustomIfcName((prev) => prev || fragModel.modelId);
                    try {
                        components.get(FragmentsEditStudio).scanModel().catch(() => {});
                    } catch {}
                    modeler.refreshContext();
                });
            } catch (err) {
                console.warn("[Modeler] Error mounting UI:", err);
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

    const toggleCameraProjection = async () => {
        const cam = worldRef.current?.camera;
        if (!cam || !(cam instanceof OBC.OrthoPerspectiveCamera)) return;
        const next = cameraProjection === "Perspective" ? "Orthographic" : "Perspective";
        try {
            await cam.projection.set(next);
            setCameraProjection(next);
        } catch {}
    };

    const toggleNavControlMode = () => {
        const cam = worldRef.current?.camera;
        if (!cam || !(cam instanceof OBC.OrthoPerspectiveCamera)) return;
        const next = navControlMode === "Orbit" ? "FirstPerson" : "Orbit";
        try {
            cam.set(next);
            setNavControlMode(next);
        } catch {}
    };

    const handleTakeScreenshot = () => {
        const world = worldRef.current;
        if (!world?.renderer || !world.scene || !world.camera) return;
        try {
            const renderer = world.renderer.three as THREE.WebGLRenderer;
            renderer.render(world.scene.three, world.camera.three);
            const url = renderer.domElement.toDataURL("image/png");
            const a = document.createElement("a");
            a.href = url;
            a.download = `${(project?.name || "bim-view").replace(/[^a-z0-9-_]/gi, "_")}-${Date.now()}.png`;
            a.click();
        } catch (err) {
            console.warn("[Screenshot] Failed capturing viewport:", err);
        }
    };

    const toggleSectioning = () => {
        const components = componentsRef.current;
        const world = worldRef.current;
        if (!components || !world) return;
        try {
            const clipper = components.get(OBC.Clipper);
            const next = !isSectioningActive;
            clipper.enabled = next;
            clipper.visible = next;
            setIsSectioningActive(next);
            setSectionPlanesCount(clipper.list.size);
        } catch (err) {
            console.warn("[Clipper] Error toggling section tool:", err);
        }
    };

    const createSectionCut = async (axis: "x" | "y" | "z") => {
        const components = componentsRef.current;
        const world = worldRef.current;
        if (!components || !world) return;
        try {
            const clipper = components.get(OBC.Clipper);
            clipper.enabled = true;
            clipper.visible = true;

            const bbox = await computeSceneBounds();
            const center = new THREE.Vector3();
            if (!bbox.isEmpty()) {
                bbox.getCenter(center);
            }

            let normal = new THREE.Vector3(0, -1, 0); // Floor/Roof cut
            if (axis === "x") normal = new THREE.Vector3(-1, 0, 0); // Side cut
            if (axis === "z") normal = new THREE.Vector3(0, 0, -1); // Front cut

            clipper.createFromNormalAndCoplanarPoint(world, normal, center);
            setSectionPlanesCount(clipper.list.size);
            setIsSectioningActive(true);
        } catch (err) {
            console.warn("[Clipper] Error creating section plane:", err);
        }
    };

    const clearSectionCuts = () => {
        const components = componentsRef.current;
        if (!components) return;
        try {
            const clipper = components.get(OBC.Clipper);
            clipper.deleteAll();
            setSectionPlanesCount(0);
        } catch (err) {
            console.warn("[Clipper] Error clearing section planes:", err);
        }
    };

    const handleOpenIfcFile = () => {
        fileInputRef.current?.click();
    };

    const handleProcessUploadedFile = async (file: File) => {
        if (!file || !componentsRef.current || !worldRef.current) return;
        setIsParsingIfc(true);
        try {
            const buffer = await file.arrayBuffer();
            await loadIfcFromBuffer(componentsRef.current, worldRef.current, buffer, file.name);
            setCustomIfcName(file.name);
            setIsPromptDismissed(true);
            try {
                await componentsRef.current.get(FragmentsEditStudio).scanModel();
                componentsRef.current.get(Modeler).refreshContext();
            } catch {}
            setTimeout(() => { void fitModelView(); }, 120);

            // Persist uploaded model name to Firestore so it remains loaded on refresh
            if (project?.id) {
                try {
                    const projectRef = doc(db, "projects", project.id);
                    await updateDoc(projectRef, {
                        ifcFileName: file.name,
                        modelCategory: "ifc",
                        ifcSchema: file.name.toLowerCase().includes("2x3") ? "IFC2X3" : "IFC4",
                    });
                    project.ifcFileName = file.name;
                    project.modelCategory = "ifc";
                    project.ifcSchema = file.name.toLowerCase().includes("2x3") ? "IFC2X3" : "IFC4";
                    forceUpdate();
                } catch (dbErr) {
                    console.warn("[ProjectDetailsPage] Firestore update failed:", dbErr);
                }
            }
        } catch (err: any) {
            alert(`Error parsing model file "${file.name}": ${err?.message || err}`);
        } finally {
            setIsParsingIfc(false);
        }
    };

    const handleIfcFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) await handleProcessUploadedFile(file);
        if (e.target) e.target.value = "";
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
        const isGisLayerActive = Boolean(components?.get(GISLayers)?.layer3d.enabled);

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
            if (bbox.isEmpty() && isGisLayerActive) {
                await controls.setLookAt(0, 650, 0.01, 0, 0, 0, true);
            } else {
                await controls.setLookAt(
                    modelCenter.x,
                    modelCenter.y + dist * 1.45,
                    modelCenter.z + 0.01,
                    modelCenter.x,
                    modelCenter.y,
                    modelCenter.z,
                    false
                );
            }
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
                if (bbox.isEmpty() && isGisLayerActive) {
                    await controls.setLookAt(280, 260, 320, 0, 10, 0, true);
                } else {
                    await controls.setLookAt(
                        modelCenter.x + dist * 0.78,
                        modelCenter.y + dist * 0.62,
                        modelCenter.z + dist * 0.78,
                        modelCenter.x,
                        modelCenter.y,
                        modelCenter.z,
                        animateTransition
                    );
                }
            } else {
                if (bbox.isEmpty() && isGisLayerActive) {
                    await controls.setLookAt(0, 120, 480, 0, 20, 0, true);
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

        const isGisLayerActive = Boolean(components?.get(GISLayers)?.layer3d.enabled);
        const bbox = await computeSceneBounds();
        if (!bbox.isEmpty()) {
            await controls.fitToBox(bbox, true, {
                paddingLeft: 1.25,
                paddingRight: 1.25,
                paddingTop: 1.25,
                paddingBottom: 1.25,
            });
        } else if (isGisLayerActive) {
            await controls.setLookAt(280, 260, 320, 0, 10, 0, true);
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
        let pointerDblClickHandler: ((evt: MouseEvent) => void) | null = null;

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

                    pointerDblClickHandler = async () => {
                        const highlighter = components.get(OBCF.Highlighter);
                        const hider = components.get(OBC.Hider);
                        const selection = highlighter.selection.select;
                        const hasSelection = Boolean(selection && !OBC.ModelIdMapUtils.isEmpty(selection));
                        const selectedMesh = (window as any).__selectedThreeMesh as THREE.Mesh | null;
                        const fragments = components.get(OBC.FragmentsManager);

                        if (world.camera instanceof OBC.SimpleCamera && fragments.initialized && fragments.list.size > 0 && hasSelection) {
                            try {
                                await hider.isolate(selection);
                                await world.camera.fitToItems(selection);
                                return;
                            } catch (err) {
                                console.warn("[DblClick Isolate & Fit] error:", err);
                            }
                        }

                        if (selectedMesh) {
                            const controls = (world.camera as any)?.controls;
                            if (controls) {
                                try {
                                    const bbox = new THREE.Box3().setFromObject(selectedMesh);
                                    if (!bbox.isEmpty()) {
                                        await controls.fitToBox(bbox, true, {
                                            paddingLeft: 1.3,
                                            paddingRight: 1.3,
                                            paddingTop: 1.3,
                                            paddingBottom: 1.3,
                                        });
                                        return;
                                    }
                                } catch (err) {
                                    console.warn("[DblClick Focus] Error fitting to mesh:", err);
                                }
                            }
                        }

                        // Fallback: restore all hidden elements and fit whole model
                        try {
                            await hider.set(true);
                        } catch {}
                        fitModelView();
                    };

                    canvas.addEventListener("dblclick", pointerDblClickHandler);
                }

                // Continuous Animation Loop for Camera Controls, WASD Walk & Dynamic Twin Updates
                const startTime = performance.now();
                let lastTime = startTime;
                const walkPos = new THREE.Vector3();
                const walkTarget = new THREE.Vector3();
                const walkFwd = new THREE.Vector3();
                const walkRight = new THREE.Vector3();
                const walkDelta = new THREE.Vector3();
                const worldUp = new THREE.Vector3(0, 1, 0);

                const loop = (time: number) => {
                    if (disposed || world.isDisposing) return;
                    const delta = Math.min((time - lastTime) / 1000, 0.1);
                    const elapsedSeconds = (time - startTime) / 1000;
                    lastTime = time;

                    const controls = (world?.camera as any)?.controls;
                    if (controls) {
                        const keys = pressedKeysRef.current;
                        if (keys.size > 0 && typeof controls.getPosition === "function" && typeof controls.getTarget === "function") {
                            const sprint = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 2.6 : 1.0;
                            const moveStep = 14 * sprint * delta;
                            controls.getPosition(walkPos);
                            controls.getTarget(walkTarget);

                            walkFwd.subVectors(walkTarget, walkPos);
                            walkFwd.y = 0;
                            if (walkFwd.lengthSq() < 1e-6) walkFwd.set(0, 0, -1);
                            walkFwd.normalize();

                            walkRight.crossVectors(walkFwd, worldUp).normalize();
                            walkDelta.set(0, 0, 0);

                            if (keys.has("KeyW") || keys.has("ArrowUp")) walkDelta.addScaledVector(walkFwd, moveStep);
                            if (keys.has("KeyS") || keys.has("ArrowDown")) walkDelta.addScaledVector(walkFwd, -moveStep);
                            if (keys.has("KeyD") || keys.has("ArrowRight")) walkDelta.addScaledVector(walkRight, moveStep);
                            if (keys.has("KeyA") || keys.has("ArrowLeft")) walkDelta.addScaledVector(walkRight, -moveStep);
                            if (keys.has("Space") || keys.has("KeyE")) walkDelta.y += moveStep;
                            if (keys.has("KeyC") || keys.has("KeyQ")) walkDelta.y -= moveStep;

                            if (walkDelta.lengthSq() > 0) {
                                walkPos.add(walkDelta);
                                walkTarget.add(walkDelta);
                                controls.setLookAt(
                                    walkPos.x, walkPos.y, walkPos.z,
                                    walkTarget.x, walkTarget.y, walkTarget.z,
                                    false
                                );
                            }
                        }
                        controls.update(delta);
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
            if (attachedCanvas && pointerDblClickHandler) {
                attachedCanvas.removeEventListener("dblclick", pointerDblClickHandler);
            }
            modelsContainerRef.current?.replaceChildren();
            propertiesContainerRef.current?.replaceChildren();
            queryContainerRef.current?.replaceChildren();
            dataEnhancerContainerRef.current?.replaceChildren();
            smartViewsContainerRef.current?.replaceChildren();
            floorPlansContainerRef.current?.replaceChildren();
            gisContainerRef.current?.replaceChildren();
            sheetsContainerRef.current?.replaceChildren();
            mcpContainerRef.current?.replaceChildren();
            proStudioContainerRef.current?.replaceChildren();
            fragmentsEditContainerRef.current?.replaceChildren();
            modelerContainerRef.current?.replaceChildren();

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
                    const modelCategory: "ifc" | "3d" | "empty" =
                        data.modelCategory === "empty" && !data.ifcFileName
                            ? "empty"
                            : data.ifcFileName || projectName.toLowerCase().includes("ifc") || data.modelCategory === "ifc"
                            ? "ifc"
                            : "3d";

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
        : project.modelCategory === "empty" && !hasActiveModel
        ? "Empty BIM Workspace"
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
                <div className="details-header-right" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <button
                        type="button"
                        onClick={() => setIsLeftPaneCollapsed((prev) => !prev)}
                        className="btn-toggle-viewer-size"
                        title={isLeftPaneCollapsed ? "Restore Standard View (Show Project Details & Tasks)" : "Maximize 3D BIM Viewer (Full Screen Width)"}
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            background: isLeftPaneCollapsed ? "rgba(56, 189, 248, 0.2)" : "rgba(32, 33, 38, 0.75)",
                            border: isLeftPaneCollapsed ? "1px solid #38bdf8" : "1px solid rgba(148, 163, 184, 0.3)",
                            borderRadius: "8px",
                            padding: "6px 14px",
                            color: isLeftPaneCollapsed ? "#38bdf8" : "#f8fafc",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                        }}
                    >
                        <span className="material-icons-round" style={{ fontSize: "16px" }}>
                            {isLeftPaneCollapsed ? "fullscreen_exit" : "fullscreen"}
                        </span>
                        <span>{isLeftPaneCollapsed ? "Restore View" : "Full View"}</span>
                    </button>
                    <span className="bim-coord-badge">
                        <span className="material-icons-round">view_in_ar</span>
                        <span>{badgeText}</span>
                    </span>
                </div>
            </header>

            <div className={`main-page-content ${isLeftPaneCollapsed ? "full-viewer-mode" : ""}`}>
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

                <div
                    className={`details-viewer-wrapper ${!hasActiveModel ? "is-empty-workspace" : ""}`}
                    ref={viewerWrapperRef}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingFile(true);
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingFile(false);
                    }}
                    onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDraggingFile(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) await handleProcessUploadedFile(file);
                    }}
                >
                    {/* Autodesk-Inspired Organized Slim Top Header Strip */}
                    {!isTopBarCollapsed && (
                        <div className="viewer-top-header" ref={modeBarRef}>
                            {/* LEFT GROUP: Model Browser, Views, Properties, Upload */}
                            <div className="viewer-top-group">
                                {isLeftPaneCollapsed && (
                                    <button
                                        type="button"
                                        className="viewer-header-btn accent"
                                        onClick={() => setIsLeftPaneCollapsed(false)}
                                        title="Restore Project Details & Tasks Sidebar"
                                    >
                                        <span className="material-icons-round">dock</span>
                                        <span>Sidebar</span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className={`viewer-header-btn ${activeDrawer === "models" ? "active" : ""}`}
                                    onClick={() => toggleDrawer("models")}
                                    title="Model Browser & Federated IFC Tree"
                                >
                                    <span className="material-icons-round">account_tree</span>
                                    <span>Models</span>
                                </button>

                                {/* Views Dropdown Menu */}
                                <div className="viewer-menu-wrap">
                                    <button
                                        type="button"
                                        className={`viewer-header-btn ${
                                            openHeaderMenu === "views" ||
                                            activeDrawer === "smart-views" ||
                                            activeDrawer === "floor-plans" ||
                                            viewerMode !== "bim-world"
                                                ? "active"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setOpenHeaderMenu((prev) => (prev === "views" ? null : "views"))
                                        }
                                        title="Camera Modes, Storey Floor Plans & Coordination Viewpoints"
                                    >
                                        <span className="material-icons-round">layers</span>
                                        <span>Views</span>
                                        <span className="material-icons-round" style={{ fontSize: "14px", opacity: 0.7 }}>
                                            expand_more
                                        </span>
                                    </button>

                                    {openHeaderMenu === "views" && (
                                        <div className="viewer-menu-popover">
                                            <button
                                                type="button"
                                                className={`viewer-menu-item ${viewerMode === "bim-world" && !activeDrawer ? "active" : ""}`}
                                                onClick={() => {
                                                    setOpenHeaderMenu(null);
                                                    setCameraPreset("iso");
                                                }}
                                            >
                                                <span className="viewer-menu-item-left">
                                                    <span className="material-icons-round">view_in_ar</span>
                                                    <span>3D BIM World</span>
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`viewer-menu-item ${viewerMode === "2d-plan" ? "active" : ""}`}
                                                onClick={() => {
                                                    setOpenHeaderMenu(null);
                                                    setCameraPreset("plan");
                                                }}
                                            >
                                                <span className="viewer-menu-item-left">
                                                    <span className="material-icons-round">architecture</span>
                                                    <span>2D Ortho Plan</span>
                                                </span>
                                            </button>
                                            {project.modelCategory === "3d" && !project.ifcFileName && !project.name.toLowerCase().includes("ifc") && (
                                                <button
                                                    type="button"
                                                    className={`viewer-menu-item ${viewerMode === "parametric" ? "active" : ""}`}
                                                    onClick={() => {
                                                        setOpenHeaderMenu(null);
                                                        setActiveDrawer(null);
                                                        setViewerMode("parametric");
                                                    }}
                                                >
                                                    <span className="viewer-menu-item-left">
                                                        <span className="material-icons-round">3d_rotation</span>
                                                        <span>3D Twin Studio</span>
                                                    </span>
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className={`viewer-menu-item ${activeDrawer === "floor-plans" ? "active" : ""}`}
                                                onClick={() => toggleDrawer("floor-plans")}
                                            >
                                                <span className="viewer-menu-item-left">
                                                    <span className="material-icons-round">grid_view</span>
                                                    <span>Storey Floor Plans</span>
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`viewer-menu-item ${activeDrawer === "smart-views" ? "active" : ""}`}
                                                onClick={() => toggleDrawer("smart-views")}
                                            >
                                                <span className="viewer-menu-item-left">
                                                    <span className="material-icons-round">photo_camera</span>
                                                    <span>Smart Viewpoints</span>
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Properties & Data Dropdown Menu */}
                                <div className="viewer-menu-wrap">
                                    <button
                                        type="button"
                                        className={`viewer-header-btn ${
                                            openHeaderMenu === "inspect" ||
                                            activeDrawer === "properties" ||
                                            activeDrawer === "query" ||
                                            activeDrawer === "enhance"
                                                ? "active"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setOpenHeaderMenu((prev) => (prev === "inspect" ? null : "inspect"))
                                        }
                                        title="IFC Properties, Queries & External Data Enhancer"
                                    >
                                        <span className="material-icons-round">list_alt</span>
                                        <span>Properties</span>
                                        <span className="material-icons-round" style={{ fontSize: "14px", opacity: 0.7 }}>
                                            expand_more
                                        </span>
                                    </button>

                                    {openHeaderMenu === "inspect" && (
                                        <div className="viewer-menu-popover">
                                            <button
                                                type="button"
                                                className={`viewer-menu-item ${activeDrawer === "properties" ? "active" : ""}`}
                                                onClick={() => toggleDrawer("properties")}
                                            >
                                                <span className="viewer-menu-item-left">
                                                    <span className="material-icons-round">table_chart</span>
                                                    <span>IFC Property Sets</span>
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`viewer-menu-item ${activeDrawer === "query" ? "active" : ""}`}
                                                onClick={() => toggleDrawer("query")}
                                            >
                                                <span className="viewer-menu-item-left">
                                                    <span className="material-icons-round">search</span>
                                                    <span>BIM Semantic Query</span>
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`viewer-menu-item ${activeDrawer === "enhance" ? "active" : ""}`}
                                                onClick={() => toggleDrawer("enhance")}
                                            >
                                                <span className="viewer-menu-item-left">
                                                    <span className="material-icons-round">storage</span>
                                                    <span>Data Enhancer</span>
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="viewer-top-divider" />

                                <button
                                    type="button"
                                    className="viewer-header-btn"
                                    onClick={handleOpenIfcFile}
                                    title="Open / Load Local IFC or Frag File"
                                    style={{ color: "#34d399" }}
                                >
                                    <span className="material-icons-round">upload_file</span>
                                    <span>Load IFC</span>
                                </button>
                            </div>

                            {/* RIGHT GROUP: Organized Single-Row Pro Workflows, BIM Studio & Utilities */}
                            <div className="viewer-top-group">
                                {/* Workflows Dropdown (Cloud Sync, AI MCP, Pro QA/4D, GIS) */}
                                <div className="viewer-menu-wrap">
                                    <button
                                        type="button"
                                        className={`viewer-header-btn ${
                                            openHeaderMenu === "workflows" ||
                                            activeDrawer === "sheets" ||
                                            activeDrawer === "mcp" ||
                                            activeDrawer === "pro-studio" ||
                                            activeDrawer === "gis"
                                                ? "active"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setOpenHeaderMenu((prev) => (prev === "workflows" ? null : "workflows"))
                                        }
                                        title="Connected Cloud Workflows: Sheets Sync, AI MCP, Pro QA/4D & GIS"
                                    >
                                        <span className="material-icons-round">hub</span>
                                        <span>Workflows</span>
                                        <span className="material-icons-round" style={{ fontSize: "14px", opacity: 0.7 }}>
                                            expand_more
                                        </span>
                                    </button>

                                    {openHeaderMenu === "workflows" && (
                                        <div className="viewer-menu-popover viewer-menu-popover-right">
                                            <button
                                                type="button"
                                                className={`viewer-menu-item ${activeDrawer === "sheets" ? "active" : ""}`}
                                                onClick={() => toggleDrawer("sheets")}
                                            >
                                                <span className="viewer-menu-item-left">
                                                    <span className="material-icons-round">table_view</span>
                                                    <span>Google Sheets Takeoff</span>
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`viewer-menu-item ${activeDrawer === "mcp" ? "active" : ""}`}
                                                onClick={() => toggleDrawer("mcp")}
                                            >
                                                <span className="viewer-menu-item-left">
                                                    <span className="material-icons-round">smart_toy</span>
                                                    <span>AI MCP Copilot</span>
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`viewer-menu-item ${activeDrawer === "pro-studio" ? "active" : ""}`}
                                                onClick={() => toggleDrawer("pro-studio")}
                                            >
                                                <span className="viewer-menu-item-left">
                                                    <span className="material-icons-round">auto_fix_high</span>
                                                    <span>Pro Studio (QA · 4D)</span>
                                                </span>
                                            </button>
                                            {isEmptyProject && (
                                                <button
                                                    type="button"
                                                    className={`viewer-menu-item ${activeDrawer === "gis" ? "active" : ""}`}
                                                    onClick={() => toggleDrawer("gis")}
                                                >
                                                    <span className="viewer-menu-item-left">
                                                        <span className="material-icons-round">public</span>
                                                        <span>3D GIS & Site Tiles</span>
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* BIM Authoring Studio Dropdown (Module 6: Edit Studio + Parametric Modeler) */}
                                <div className="viewer-menu-wrap">
                                    <button
                                        type="button"
                                        className={`viewer-header-btn ${
                                            openHeaderMenu === "studio" ||
                                            activeDrawer === "fragments-edit" ||
                                            activeDrawer === "modeler"
                                                ? "active"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setOpenHeaderMenu((prev) => (prev === "studio" ? null : "studio"))
                                        }
                                        title="Fragments Editing & Parametric BIM Modeler"
                                    >
                                        <span className="material-icons-round">architecture</span>
                                        <span>BIM Studio</span>
                                        <span className="material-icons-round" style={{ fontSize: "14px", opacity: 0.7 }}>
                                            expand_more
                                        </span>
                                    </button>

                                    {openHeaderMenu === "studio" && (
                                        <div className="viewer-menu-popover viewer-menu-popover-right">
                                            <button
                                                type="button"
                                                className={`viewer-menu-item ${activeDrawer === "fragments-edit" ? "active" : ""}`}
                                                onClick={() => {
                                                    const opening = activeDrawer !== "fragments-edit";
                                                    toggleDrawer("fragments-edit");
                                                    if (opening && componentsRef.current) {
                                                        try {
                                                            componentsRef.current.get(FragmentsEditStudio).scanModel().catch(() => {});
                                                        } catch {}
                                                    }
                                                }}
                                            >
                                                <span className="viewer-menu-item-left">
                                                    <span className="material-icons-round">edit_square</span>
                                                    <span>Fragments Edit Studio</span>
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`viewer-menu-item ${activeDrawer === "modeler" ? "active" : ""}`}
                                                onClick={() => {
                                                    const opening = activeDrawer !== "modeler";
                                                    toggleDrawer("modeler");
                                                    if (opening && componentsRef.current) {
                                                        try {
                                                            componentsRef.current.get(Modeler).refreshContext();
                                                        } catch {}
                                                    }
                                                }}
                                            >
                                                <span className="viewer-menu-item-left">
                                                    <span className="material-icons-round">precision_manufacturing</span>
                                                    <span>Parametric Modeler</span>
                                                </span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`viewer-menu-item ${activeDrawer === "embeddings" ? "active" : ""}`}
                                                onClick={() => toggleDrawer("embeddings")}
                                            >
                                                <span className="viewer-menu-item-left">
                                                    <span className="material-icons-round">psychology</span>
                                                    <span>AI Semantic Search</span>
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="viewer-top-divider" />

                                <button
                                    type="button"
                                    className="viewer-header-btn"
                                    onClick={handleTakeScreenshot}
                                    title="Download Viewport PNG Screenshot"
                                    style={{ padding: "5px 7px" }}
                                >
                                    <span className="material-icons-round">photo_camera</span>
                                </button>

                                <button
                                    type="button"
                                    className="viewer-header-btn"
                                    onClick={() => setIsTopBarCollapsed(true)}
                                    title="Hide Header Bar (Full Canvas Focus)"
                                    style={{ padding: "5px 6px", color: "#94a3b8" }}
                                >
                                    <span className="material-icons-round">expand_less</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Floating Pill to Restore Header Bar when Collapsed */}
                    {isTopBarCollapsed && (
                        <div
                            style={{
                                position: "absolute",
                                top: "12px",
                                left: "14px",
                                zIndex: 31,
                                display: "inline-flex",
                                gap: "6px",
                            }}
                        >
                            <button
                                type="button"
                                className="viewer-bar-restore-pill"
                                onClick={() => setIsTopBarCollapsed(false)}
                                title="Show Viewer Header Bar"
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    background: "rgba(15, 16, 19, 0.92)",
                                    backdropFilter: "blur(14px)",
                                    border: "1px solid rgba(255, 255, 255, 0.12)",
                                    borderRadius: "12px",
                                    padding: "6px 12px",
                                    color: "#38bdf8",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                                }}
                            >
                                <span className="material-icons-round" style={{ fontSize: "16px" }}>menu</span>
                                <span>Toolbar</span>
                            </button>
                            {isLeftPaneCollapsed && (
                                <button
                                    type="button"
                                    onClick={() => setIsLeftPaneCollapsed(false)}
                                    title="Restore Project Details Sidebar"
                                    style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        background: "rgba(15, 16, 19, 0.92)",
                                        backdropFilter: "blur(14px)",
                                        border: "1px solid rgba(255, 255, 255, 0.12)",
                                        borderRadius: "12px",
                                        padding: "6px 12px",
                                        color: "#38bdf8",
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                        boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                                    }}
                                >
                                    <span className="material-icons-round" style={{ fontSize: "16px" }}>dock</span>
                                    <span>Sidebar</span>
                                </button>
                            )}
                        </div>
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
                                className={`toc-dock-panel toc-dock-left ${isDrawerExpanded ? "is-expanded" : ""}`}
                                data-drawer="models"
                                style={{ display: activeDrawer === "models" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>folder_open</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>Federated Model Inventory & IFC Tree</span>
                                    </div>
                                    {renderDockHeaderActions("Close Models Inventory")}
                                </div>
                                <div ref={modelsContainerRef} className="toc-dock-body"></div>
                            </div>

                            {/* Dockable Query & ItemsFinder Drawer — Mounted Once */}
                            <div
                                className={`toc-dock-panel toc-dock-right ${isDrawerExpanded ? "is-expanded" : ""}`}
                                data-drawer="query"
                                style={{ display: activeDrawer === "query" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>search</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>IFC Spatial Query & Relational Engine</span>
                                    </div>
                                    {renderDockHeaderActions("Close Query Engine")}
                                </div>
                                <div ref={queryContainerRef} className="toc-dock-body"></div>
                            </div>

                            {/* Dockable Element Properties Drawer — Mounted Once */}
                            <div
                                className={`toc-dock-panel toc-dock-right ${isDrawerExpanded ? "is-expanded" : ""}`}
                                data-drawer="properties"
                                style={{ display: activeDrawer === "properties" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>table_chart</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>IFC Schema Property Set Inspector</span>
                                    </div>
                                    {renderDockHeaderActions("Close Property Inspector")}
                                </div>
                                <div ref={propertiesContainerRef} className="toc-dock-body"></div>
                            </div>

                            {/* Dockable Data Enhancer Drawer — Mounted Once */}
                            <div
                                className={`toc-dock-panel toc-dock-right ${isDrawerExpanded ? "is-expanded" : ""}`}
                                data-drawer="enhance"
                                style={{ display: activeDrawer === "enhance" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>storage</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>Engineering Specifications & QA Matrix</span>
                                    </div>
                                    {renderDockHeaderActions("Close Specifications Panel")}
                                </div>
                                <div ref={dataEnhancerContainerRef} className="toc-dock-body"></div>
                            </div>

                            {/* Dockable Smart Views Drawer — Mounted Once */}
                            <div
                                className={`toc-dock-panel toc-dock-left ${isDrawerExpanded ? "is-expanded" : ""}`}
                                data-drawer="smart-views"
                                style={{ display: activeDrawer === "smart-views" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>camera</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>BIM Coordination Viewpoints & Overrides</span>
                                    </div>
                                    {renderDockHeaderActions("Close Coordination Viewpoints")}
                                </div>
                                <div ref={smartViewsContainerRef} className="toc-dock-body"></div>
                            </div>

                            {/* Dockable Floor Plans & Elevations Drawer — OBC.Views */}
                            <div
                                className={`toc-dock-panel toc-dock-right ${isDrawerExpanded ? "is-expanded" : ""}`}
                                data-drawer="floor-plans"
                                style={{ display: activeDrawer === "floor-plans" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>layers</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>2D Storey Floor Plans &amp; Elevations</span>
                                    </div>
                                    {renderDockHeaderActions("Close Storey Plans Panel")}
                                </div>
                                <div ref={floorPlansContainerRef} className="toc-dock-body"></div>
                            </div>

                            {/* Dockable GIS & Geospatial Drawer — Mounted Once */}
                            <div
                                className={`toc-dock-panel toc-dock-right ${isDrawerExpanded ? "is-expanded" : ""}`}
                                data-drawer="gis"
                                style={{ display: activeDrawer === "gis" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>public</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>Cesium GIS & Geospatial Environment</span>
                                    </div>
                                    {renderDockHeaderActions("Close GIS Panel")}
                                </div>
                                <div ref={gisContainerRef} className="toc-dock-body"></div>
                            </div>

                            {/* Dockable Google Sheets Sync Drawer — Module 5 Sec 3 */}
                            <div
                                className={`toc-dock-panel toc-dock-right ${isDrawerExpanded ? "is-expanded" : ""}`}
                                data-drawer="sheets"
                                style={{ display: activeDrawer === "sheets" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#34d399", fontSize: "18px" }}>table_view</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>Google Sheets BIM Takeoff Sync</span>
                                    </div>
                                    {renderDockHeaderActions("Close Sheets Panel")}
                                </div>
                                <div ref={sheetsContainerRef} className="toc-dock-body"></div>
                            </div>

                            {/* Dockable MCP-LLM AI Copilot Drawer — Module 5 Sec 4 */}
                            <div
                                className={`toc-dock-panel toc-dock-right ${isDrawerExpanded ? "is-expanded" : ""}`}
                                data-drawer="mcp"
                                style={{ display: activeDrawer === "mcp" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#c084fc", fontSize: "18px" }}>smart_toy</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>MCP–LLM BIM Assistant</span>
                                    </div>
                                    {renderDockHeaderActions("Close AI MCP Panel")}
                                </div>
                                <div ref={mcpContainerRef} className="toc-dock-body"></div>
                            </div>

                            {/* Dockable BIM Pro Studio Drawer (Clash QA, 4D Phasing, Property Edit & .FRAG Export) */}
                            <div
                                className={`toc-dock-panel toc-dock-right ${isDrawerExpanded ? "is-expanded" : ""}`}
                                data-drawer="pro-studio"
                                style={{ display: activeDrawer === "pro-studio" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#d8b4fe", fontSize: "18px" }}>auto_fix_high</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f8fafc" }}>BIM Pro Studio (Clash QA · 4D · Export)</span>
                                    </div>
                                    {renderDockHeaderActions("Close Pro Studio")}
                                </div>
                                <div ref={proStudioContainerRef} className="toc-dock-body"></div>
                            </div>

                            {/* Dockable Pro Fragments Edit Studio Drawer */}
                            <div
                                className={`toc-dock-panel toc-dock-right ${isDrawerExpanded ? "is-expanded" : ""}`}
                                data-drawer="fragments-edit"
                                style={{ display: activeDrawer === "fragments-edit" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#e4e4e7", fontSize: "18px" }}>edit_square</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f4f4f5" }}>Fragments Edit Studio</span>
                                    </div>
                                    {renderDockHeaderActions("Close Edit Studio")}
                                </div>
                                <div ref={fragmentsEditContainerRef} className="toc-dock-body"></div>
                            </div>

                            {/* Dockable Parametric Modeler Drawer */}
                            <div
                                className={`toc-dock-panel toc-dock-right ${isDrawerExpanded ? "is-expanded" : ""}`}
                                data-drawer="modeler"
                                style={{ display: activeDrawer === "modeler" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#38bdf8", fontSize: "18px" }}>precision_manufacturing</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f4f4f5" }}>Parametric Modeler</span>
                                    </div>
                                    {renderDockHeaderActions("Close Parametric Modeler")}
                                </div>
                                <div ref={modelerContainerRef} className="toc-dock-body"></div>
                            </div>

                            {/* Dockable AI Semantic Embeddings Drawer */}
                            <div
                                className={`toc-dock-panel toc-dock-right ${isDrawerExpanded ? "is-expanded" : ""}`}
                                data-drawer="embeddings"
                                style={{ display: activeDrawer === "embeddings" ? "flex" : "none" }}
                            >
                                <div className="toc-dock-header">
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <span className="material-icons-round" style={{ color: "#a78bfa", fontSize: "18px" }}>psychology</span>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#f4f4f5" }}>AI Semantic Search</span>
                                    </div>
                                    {renderDockHeaderActions("Close AI Semantic Search")}
                                </div>
                                <div className="toc-dock-body">
                                    <EmbeddingsStudio getComponents={() => componentsRef.current} />
                                </div>
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

                            {/* World-Class 3D ViewCube & Architectural Compass Navigator */}
                            <NavigationCube
                                world={worldRef.current}
                                isDrawerOpen={
                                    activeDrawer === "properties" ||
                                    activeDrawer === "enhance" ||
                                    activeDrawer === "floor-plans" ||
                                    activeDrawer === "gis" ||
                                    activeDrawer === "sheets" ||
                                    activeDrawer === "mcp" ||
                                    activeDrawer === "pro-studio" ||
                                    activeDrawer === "fragments-edit" ||
                                    activeDrawer === "modeler"
                                }
                                onFocusExtents={fitModelView}
                            />

                            {/* 2D Plan CAD Sheet Banner (right-aligned below ViewCube or top bar) */}
                            {viewerMode === "2d-plan" && (
                                <div
                                    className="plan-mode-banner"
                                    style={{
                                        position: "absolute",
                                        top: "calc(var(--toolbar-bottom, 54px) + 10px)",
                                        left: "16px",
                                        zIndex: 18,
                                        background: "rgba(18, 19, 23, 0.94)",
                                        border: "1px solid rgba(255, 255, 255, 0.16)",
                                        borderRadius: "20px",
                                        padding: "5px 14px",
                                        color: "#e4e4e7",
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

                            {/* Full Drag & Drop Active Overlay */}
                            {isDraggingFile && (
                                <div className="toc-drag-active-backdrop">
                                    <span className="material-icons-round" style={{ fontSize: "56px", color: "#38bdf8" }}>
                                        cloud_upload
                                    </span>
                                    <h3 style={{ margin: 0, color: "#f8fafc", fontSize: "1.4rem", fontWeight: 700 }}>
                                        Drop IFC Model to Open
                                    </h3>
                                    <p style={{ margin: 0, color: "#bae6fd", fontSize: "0.92rem" }}>
                                        Release file to parse geometry and stream into That Open Engine
                                    </p>
                                </div>
                            )}

                            <input
                                type="file"
                                ref={fileInputRef}
                                accept=".ifc,.obj,.gltf,.glb,.frag"
                                onChange={handleIfcFileSelected}
                                style={{ display: "none" }}
                            />

                            {/* Empty Project Studio Prompt */}
                            {!hasActiveModel && !customIfcName && !isParsingIfc && !isPromptDismissed && activeDrawer !== "gis" && (
                                <div
                                    className="toc-empty-project-overlay"
                                    style={{
                                        position: "absolute",
                                        top: "50%",
                                        left: "50%",
                                        transform: "translate(-50%, -50%)",
                                        zIndex: 15,
                                        display: "flex",
                                        flexDirection: "column",
                                        alignItems: "center",
                                        textAlign: "center",
                                        gap: "14px",
                                        background: "rgba(19, 20, 24, 0.92)",
                                        border: isDraggingFile ? "2px solid #38bdf8" : "1.5px dashed rgba(56, 189, 248, 0.45)",
                                        backdropFilter: "blur(20px)",
                                        borderRadius: "20px",
                                        padding: "2.4rem 2.8rem",
                                        maxWidth: "480px",
                                        width: "90%",
                                        boxShadow: "0 18px 50px rgba(0, 0, 0, 0.72)",
                                        transition: "all 0.25s ease",
                                    }}
                                >
                                    {/* Close Button to Dismiss Card & View 3D Scene */}
                                    <button
                                        type="button"
                                        onClick={() => setIsPromptDismissed(true)}
                                        style={{
                                            position: "absolute",
                                            top: "14px",
                                            right: "14px",
                                            background: "rgba(32, 33, 38, 0.7)",
                                            border: "1px solid rgba(148, 163, 184, 0.3)",
                                            borderRadius: "50%",
                                            width: "30px",
                                            height: "30px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#94a3b8",
                                            cursor: "pointer",
                                            fontSize: "20px",
                                            lineHeight: 1,
                                            transition: "all 0.15s ease",
                                        }}
                                        title="Close overlay to view 3D workspace"
                                    >
                                        &times;
                                    </button>

                                    <div
                                        style={{
                                            width: "68px",
                                            height: "68px",
                                            borderRadius: "50%",
                                            background: "rgba(56, 189, 248, 0.12)",
                                            border: "1.5px solid rgba(56, 189, 248, 0.4)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            boxShadow: "0 8px 20px rgba(0, 0, 0, 0.45)",
                                        }}
                                    >
                                        <span
                                            className="material-icons-round"
                                            style={{ fontSize: "36px", color: "#38bdf8" }}
                                        >
                                            cloud_upload
                                        </span>
                                    </div>

                                    <div>
                                        <div style={{
                                            display: "inline-block",
                                            padding: "3px 12px",
                                            borderRadius: "14px",
                                            background: "linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(37, 99, 235, 0.2))",
                                            border: "1px solid rgba(255, 255, 255, 0.12)",
                                            color: "#38bdf8",
                                            fontSize: "0.72rem",
                                            fontWeight: 800,
                                            letterSpacing: "0.06em",
                                            marginBottom: "8px",
                                        }}>
                                            {isEmptyProject
                                                ? "EMPTY & CESIUM GIS GEOSPATIAL STUDIO"
                                                : project?.modelCategory === "ifc"
                                                ? "OPENBIM IFC WORKSPACE"
                                                : "3D BIM WORKSPACE"}
                                        </div>
                                        <h3 style={{ margin: 0, fontSize: "1.32rem", fontWeight: 800, color: "#f8fafc" }}>
                                            {isEmptyProject
                                                ? "Empty GIS / BIM Workspace"
                                                : project?.modelCategory === "ifc"
                                                ? "Empty IFC Project"
                                                : "Empty 3D BIM Project"}
                                        </h3>
                                    </div>

                                    <p style={{ margin: 0, fontSize: "0.86rem", color: "#94a3b8", lineHeight: 1.6 }}>
                                        {isDraggingFile
                                            ? "Drop your BIM model now to parse and view in That Open Engine!"
                                            : isEmptyProject
                                            ? "This empty studio supports Google Photorealistic 3D Cesium Tiles & 2D GIS Radar, or drag & drop an IFC model later."
                                            : project?.modelCategory === "ifc"
                                            ? "Ready for OpenBIM. Drag & drop or upload an .ifc / .frag model from disk to open it in That Open Engine."
                                            : "Ready for 3D BIM. Drag & drop or upload a .glb, .gltf, or .obj 3D model from disk to inspect it in That Open Engine."}
                                    </p>

                                    {/* Quick Geospatial City Portals (Empty / GIS Studio only) */}
                                    {isEmptyProject && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", margin: "4px 0" }}>
                                            <span style={{ fontSize: "0.70rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                                Quick Geospatial Portals
                                            </span>
                                            <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsPromptDismissed(true);
                                                    const gisLayers = componentsRef.current?.get(GISLayers);
                                                    if (gisLayers) {
                                                        gisLayers.layer3d.enabled = true;
                                                        gisLayers.setLocation(51.5007, -0.1246, 0);
                                                        gisLayers.layer3d.focusTerrain("iso");
                                                    }
                                                    toggleDrawer("gis");
                                                }}
                                                style={{
                                                    padding: "5px 11px",
                                                    borderRadius: "8px",
                                                    background: "rgba(32, 33, 38, 0.7)",
                                                    border: "1px solid rgba(255, 255, 255, 0.12)",
                                                    color: "#f8fafc",
                                                    fontSize: "0.76rem",
                                                    fontWeight: 600,
                                                    cursor: "pointer",
                                                }}
                                            >
                                                🇬🇧 London Westminster
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsPromptDismissed(true);
                                                    const gisLayers = componentsRef.current?.get(GISLayers);
                                                    if (gisLayers) {
                                                        gisLayers.layer3d.enabled = true;
                                                        gisLayers.setLocation(40.7128, -74.006, 30);
                                                        gisLayers.layer3d.focusTerrain("iso");
                                                    }
                                                    toggleDrawer("gis");
                                                }}
                                                style={{
                                                    padding: "5px 11px",
                                                    borderRadius: "8px",
                                                    background: "rgba(32, 33, 38, 0.7)",
                                                    border: "1px solid rgba(255, 255, 255, 0.12)",
                                                    color: "#f8fafc",
                                                    fontSize: "0.76rem",
                                                    fontWeight: 600,
                                                    cursor: "pointer",
                                                }}
                                            >
                                                🗽 New York
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsPromptDismissed(true);
                                                    const gisLayers = componentsRef.current?.get(GISLayers);
                                                    if (gisLayers) {
                                                        gisLayers.layer3d.enabled = true;
                                                        gisLayers.setLocation(48.8584, 2.2945, 45);
                                                        gisLayers.layer3d.focusTerrain("iso");
                                                    }
                                                    toggleDrawer("gis");
                                                }}
                                                style={{
                                                    padding: "5px 11px",
                                                    borderRadius: "8px",
                                                    background: "rgba(32, 33, 38, 0.7)",
                                                    border: "1px solid rgba(255, 255, 255, 0.12)",
                                                    color: "#f8fafc",
                                                    fontSize: "0.76rem",
                                                    fontWeight: 600,
                                                    cursor: "pointer",
                                                }}
                                            >
                                                🗼 Paris
                                            </button>
                                        </div>
                                        </div>
                                    )}

                                    <div style={{ display: "flex", gap: "10px", marginTop: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                background: "linear-gradient(135deg, #0284c7, #0ea5e9)",
                                                border: "none",
                                                borderRadius: "12px",
                                                padding: "11px 22px",
                                                color: "#ffffff",
                                                fontSize: "0.88rem",
                                                fontWeight: 700,
                                                cursor: "pointer",
                                                boxShadow: "0 6px 20px rgba(14, 165, 233, 0.45)",
                                                transition: "all 0.15s ease",
                                            }}
                                        >
                                            <span className="material-icons-round" style={{ fontSize: "20px" }}>file_upload</span>
                                            <span>Upload IFC Model</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsPromptDismissed(true);
                                                const gisLayers = componentsRef.current?.get(GISLayers);
                                                if (gisLayers) {
                                                    gisLayers.layer3d.enabled = true;
                                                }
                                                toggleDrawer("gis");
                                            }}
                                            style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "7px",
                                                background: "rgba(32, 33, 38, 0.8)",
                                                border: "1px solid rgba(255, 255, 255, 0.12)",
                                                borderRadius: "12px",
                                                padding: "11px 18px",
                                                color: "#38bdf8",
                                                fontSize: "0.88rem",
                                                fontWeight: 600,
                                                cursor: "pointer",
                                                transition: "all 0.15s ease",
                                            }}
                                        >
                                            <span className="material-icons-round" style={{ fontSize: "19px" }}>public</span>
                                            <span>Launch Cesium GIS</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Restore Upload Studio Prompt Pill when Dismissed */}
                            {isPromptDismissed && !hasActiveModel && activeDrawer !== "gis" && (
                                <button
                                    type="button"
                                    onClick={() => setIsPromptDismissed(false)}
                                    style={{
                                        position: "absolute",
                                        top: "calc(var(--toolbar-bottom, 54px) + 10px)",
                                        left: "16px",
                                        zIndex: 18,
                                        background: "rgba(19, 20, 24, 0.90)",
                                        border: "1px solid rgba(255, 255, 255, 0.12)",
                                        borderRadius: "20px",
                                        padding: "6px 14px",
                                        color: "#38bdf8",
                                        fontSize: "0.78rem",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                                        backdropFilter: "blur(12px)",
                                    }}
                                    title="Open Upload Model Studio Card"
                                >
                                    <span className="material-icons-round" style={{ fontSize: "16px" }}>cloud_upload</span>
                                    <span>Upload Model Studio</span>
                                </button>
                            )}

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

                            {/* Autodesk-Inspired Centered Contextual Tool Sub-Bar */}
                            {activeBottomSubbar === "camera" && (
                                <div className="viewer-ctx-subbar">
                                    <button
                                        type="button"
                                        className={`viewer-ctx-btn ${cameraProjection === "Perspective" ? "active" : ""}`}
                                        onClick={() => cameraProjection !== "Perspective" && toggleCameraProjection()}
                                        title="3D Perspective Projection"
                                    >
                                        <span className="material-icons-round">view_in_ar</span>
                                        <span>3D Persp</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`viewer-ctx-btn ${cameraProjection === "Orthographic" ? "active" : ""}`}
                                        onClick={() => cameraProjection !== "Orthographic" && toggleCameraProjection()}
                                        title="2D Orthographic Projection"
                                    >
                                        <span className="material-icons-round">view_agenda</span>
                                        <span>2D Ortho</span>
                                    </button>
                                    <div style={{ width: "1px", height: "24px", background: "rgba(148,163,184,0.22)" }} />
                                    <button
                                        type="button"
                                        className={`viewer-ctx-btn ${viewerMode === "2d-plan" ? "active" : ""}`}
                                        onClick={() => setCameraPreset("plan")}
                                        title="Top-Down Plan View"
                                    >
                                        <span className="material-icons-round">layers</span>
                                        <span>Top Plan</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="viewer-ctx-btn"
                                        onClick={() => setCameraPreset("front")}
                                        title="Front Elevation View"
                                    >
                                        <span className="material-icons-round">crop_portrait</span>
                                        <span>Front</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="viewer-ctx-btn"
                                        onClick={() => handleZoom(true)}
                                        title="Zoom In"
                                    >
                                        <span className="material-icons-round">zoom_in</span>
                                        <span>Zoom +</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="viewer-ctx-btn"
                                        onClick={() => handleZoom(false)}
                                        title="Zoom Out"
                                    >
                                        <span className="material-icons-round">zoom_out</span>
                                        <span>Zoom −</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`viewer-ctx-btn ${isAutoRotating ? "active" : ""}`}
                                        onClick={toggleAutoOrbit}
                                        title="Toggle Continuous Auto-Orbit Turntable"
                                    >
                                        <span className="material-icons-round">sync</span>
                                        <span>Turntable</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveBottomSubbar(null)}
                                        style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "16px", padding: "2px 6px" }}
                                        title="Close Camera Bar"
                                    >
                                        &times;
                                    </button>
                                </div>
                            )}

                            {activeBottomSubbar === "measure" && isMeasuring && (
                                <div className="viewer-ctx-subbar">
                                    <button
                                        type="button"
                                        className={`viewer-ctx-btn ${measureMode === "length" ? "active" : ""}`}
                                        onClick={() => {
                                            setMeasureMode("length");
                                            measurementSystemRef.current?.setMode("length");
                                        }}
                                        title="Point-to-Point Distance Measurement"
                                    >
                                        <span className="material-icons-round">straighten</span>
                                        <span>Length</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`viewer-ctx-btn ${measureMode === "area" ? "active" : ""}`}
                                        onClick={() => {
                                            setMeasureMode("area");
                                            measurementSystemRef.current?.setMode("area");
                                        }}
                                        title="3D Polygon Area Takeoff"
                                    >
                                        <span className="material-icons-round">square_foot</span>
                                        <span>Area m²</span>
                                    </button>
                                    {measureMode === "area" && (
                                        <button
                                            type="button"
                                            className="viewer-ctx-btn active"
                                            onClick={() => measurementSystemRef.current?.commitAreaPolygon()}
                                            title="Complete 3D Area Polygon"
                                        >
                                            <span className="material-icons-round">check_circle</span>
                                            <span>Finish</span>
                                        </button>
                                    )}
                                    {measurementsCount > 0 && (
                                        <button
                                            type="button"
                                            className="viewer-ctx-btn"
                                            onClick={clearMeasurements}
                                            style={{ color: "#f87171" }}
                                            title="Clear All Dimensions"
                                        >
                                            <span className="material-icons-round">delete_outline</span>
                                            <span>Clear ({measurementsCount})</span>
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            toggleMeasuring();
                                            setActiveBottomSubbar(null);
                                        }}
                                        style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "16px", padding: "2px 6px" }}
                                        title="Exit Measure Mode"
                                    >
                                        &times;
                                    </button>
                                </div>
                            )}

                            {activeBottomSubbar === "section" && isSectioningActive && (
                                <div className="viewer-ctx-subbar">
                                    <button
                                        type="button"
                                        className="viewer-ctx-btn"
                                        onClick={() => createSectionCut("x")}
                                        title="Create X-Axis Section Cut"
                                    >
                                        <span className="material-icons-round">border_vertical</span>
                                        <span>X Plane</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="viewer-ctx-btn"
                                        onClick={() => createSectionCut("y")}
                                        title="Create Y-Axis Section Cut"
                                    >
                                        <span className="material-icons-round">border_horizontal</span>
                                        <span>Y Plane</span>
                                    </button>
                                    <button
                                        type="button"
                                        className="viewer-ctx-btn"
                                        onClick={() => createSectionCut("z")}
                                        title="Create Z-Axis Plan Cut"
                                    >
                                        <span className="material-icons-round">layers</span>
                                        <span>Z Plane</span>
                                    </button>
                                    {sectionPlanesCount > 0 && (
                                        <button
                                            type="button"
                                            className="viewer-ctx-btn"
                                            onClick={clearSectionCuts}
                                            style={{ color: "#f87171" }}
                                            title="Clear All Active Section Planes"
                                        >
                                            <span className="material-icons-round">delete_outline</span>
                                            <span>Clear ({sectionPlanesCount})</span>
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            toggleSectioning();
                                            setActiveBottomSubbar(null);
                                        }}
                                        style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "16px", padding: "2px 6px" }}
                                        title="Exit Sectioning"
                                    >
                                        &times;
                                    </button>
                                </div>
                            )}

                            {/* Autodesk-Inspired Minimal Calm Bottom Dock */}
                            <div className="viewer-bottom-dock">
                                <button
                                    type="button"
                                    className="viewer-dock-item"
                                    onClick={() => setCameraPreset("iso")}
                                    title="Home 3D Isometric View"
                                >
                                    <span className="material-icons-round">home</span>
                                    <span className="viewer-dock-label">Home</span>
                                </button>

                                <button
                                    type="button"
                                    className="viewer-dock-item"
                                    onClick={fitModelView}
                                    title="Fit Whole Model to Screen"
                                >
                                    <span className="material-icons-round">center_focus_strong</span>
                                    <span className="viewer-dock-label">Fit</span>
                                </button>

                                <button
                                    type="button"
                                    className={`viewer-dock-item ${navControlMode === "FirstPerson" ? "active" : ""}`}
                                    onClick={toggleNavControlMode}
                                    title={`Navigation Mode: ${navControlMode} (Click to switch Orbit ↔ First-Person Walk)`}
                                >
                                    <span className="material-icons-round">
                                        {navControlMode === "FirstPerson" ? "directions_walk" : "360"}
                                    </span>
                                    <span className="viewer-dock-label">
                                        {navControlMode === "FirstPerson" ? "Walk" : "Orbit"}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    className={`viewer-dock-item ${activeBottomSubbar === "camera" ? "active" : ""}`}
                                    onClick={() =>
                                        setActiveBottomSubbar((prev) => (prev === "camera" ? null : "camera"))
                                    }
                                    title="Projection (3D/2D), Plan/Front, Zoom & Auto-Orbit"
                                >
                                    <span className="material-icons-round">videocam</span>
                                    <span className="viewer-dock-label">Camera</span>
                                </button>

                                <div className="viewer-dock-sep" />

                                {hasActiveModel && (
                                    <button
                                        type="button"
                                        className={`viewer-dock-item ${isMeasuring ? "active" : ""}`}
                                        onClick={() => {
                                            const next = !isMeasuring;
                                            toggleMeasuring();
                                            setActiveBottomSubbar(next ? "measure" : null);
                                        }}
                                        title="Measure Distance & Polygon Area"
                                    >
                                        <span className="material-icons-round">straighten</span>
                                        <span className="viewer-dock-label">
                                            Measure{measurementsCount > 0 ? ` (${measurementsCount})` : ""}
                                        </span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className={`viewer-dock-item ${isSectioningActive ? "active" : ""}`}
                                    onClick={() => {
                                        const next = !isSectioningActive;
                                        toggleSectioning();
                                        setActiveBottomSubbar(next ? "section" : null);
                                    }}
                                    title="Architectural Section Cuts (X / Y / Z)"
                                >
                                    <span className="material-icons-round">content_cut</span>
                                    <span className="viewer-dock-label">
                                        Section{sectionPlanesCount > 0 ? ` (${sectionPlanesCount})` : ""}
                                    </span>
                                </button>

                                {hasActiveModel && (
                                    <button
                                        type="button"
                                        className={`viewer-dock-item ${!isFloatingToolbarCollapsed ? "active" : ""}`}
                                        onClick={() => setIsFloatingToolbarCollapsed((prev) => !prev)}
                                        title="Toggle Appearance & Fragments Edit Toolbar"
                                    >
                                        <span className="material-icons-round">tune</span>
                                        <span className="viewer-dock-label">Appear</span>
                                    </button>
                                )}

                                <div className="viewer-dock-sep" />

                                <button
                                    type="button"
                                    className={`viewer-dock-item ${isGridVisible ? "active" : ""}`}
                                    onClick={toggleCadGrid}
                                    title="Toggle Infinite 3D CAD Reference Grid"
                                >
                                    <span className="material-icons-round">grid_on</span>
                                    <span className="viewer-dock-label">Grid</span>
                                </button>

                                <button
                                    type="button"
                                    className={`viewer-dock-item ${isLeftPaneCollapsed || isFullscreenActive ? "active" : ""}`}
                                    onClick={() => void toggleFullViewMode()}
                                    title={isLeftPaneCollapsed || isFullscreenActive ? "Exit Fullscreen View (Esc)" : "Activate Pro Fullscreen Canvas"}
                                >
                                    <span className="material-icons-round">
                                        {isLeftPaneCollapsed || isFullscreenActive ? "fullscreen_exit" : "fullscreen"}
                                    </span>
                                    <span className="viewer-dock-label">
                                        {isLeftPaneCollapsed || isFullscreenActive ? "Exit Full" : "Full View"}
                                    </span>
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
