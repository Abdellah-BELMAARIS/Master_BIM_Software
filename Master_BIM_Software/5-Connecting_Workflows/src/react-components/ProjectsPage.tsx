import * as React from "react";
import * as Router from "react-router-dom";
import { getDocs, addDoc, deleteDoc, updateDoc, deleteField, doc as fsDoc } from "firebase/firestore";
import { getCollection, db, deleteDocument, sanitizeForFirestore } from "../core/database";
import { IProject, Project, ProjectStatus, UserRole, ModelType } from "../classes/Project";
import { ProjectsManager } from "../classes/ProjectsManager";
import { ProjectCard } from "./ProjectCard";
import { SearchBox } from "./SearchBox";
import { ProjectForm } from "./ProjectForm";
import { appIcons } from "../globals";
import { getCanonicalProjectInfo, getProjectIfcFile, prewarmIfcModels } from "../bim-components/setup/src/load-project-model";

export interface ProjectsPageProps {
    projectsManager?: ProjectsManager;
}

// Lesson 4.4: Master collection reference declared outside component (Module Scope optimization)
const projectsCollection = getCollection<IProject>("projects");

// Lesson 3.3, 3.4, 3.5 & 3.6: ProjectsPage Component with Events, Nested <ProjectCard />, React.useState & React.useEffect
export function ProjectsPage(props: ProjectsPageProps) {
    // Lesson 3.6: Store projectsManager in component state so the same instance persists across re-renders
    const [projectsManager] = React.useState<ProjectsManager>(
        () => props.projectsManager ?? new ProjectsManager()
    );

    const navigate = Router.useNavigate();
    const [searchParams, setSearchParams] = Router.useSearchParams();
    const urlCategory = searchParams.get("category");

    // Lesson 3.5: Introducing React State with TypeScript Generics (React.useState<Project[]>)
    const [projects, setProjects] = React.useState<Project[]>(projectsManager.list);
    const [searchQuery, setSearchQuery] = React.useState<string>("");
    const [statusFilter, setStatusFilter] = React.useState<string>("all");
    const [categoryFilter, setCategoryFilter] = React.useState<"all" | "ifc" | "3d">(
        urlCategory === "ifc" || urlCategory === "3d" ? urlCategory : "all"
    );
    const [sortBy, setSortBy] = React.useState<string>("name-asc");
    const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = React.useState<boolean>(false);

    // Background Hyper-Speed Cache Pre-Warmer for IFC Models
    React.useEffect(() => {
        prewarmIfcModels();
    }, []);

    // Sync URL query params with category filter
    React.useEffect(() => {
        const cat = searchParams.get("category");
        if (cat === "ifc" || cat === "3d") {
            setCategoryFilter(cat);
        } else {
            setCategoryFilter("all");
        }
    }, [searchParams]);

    const handleCategoryChange = (cat: "all" | "ifc" | "3d") => {
        setCategoryFilter(cat);
        if (cat === "all") {
            setSearchParams({});
        } else {
            setSearchParams({ category: cat });
        }
    };

    // Lesson 3.6: Wire ProjectsManager custom events (onProjectCreated & onProjectDeleted) to update React state
    projectsManager.onProjectCreated = () => {
        setProjects([...projectsManager.list]);
    };

    projectsManager.onProjectDeleted = () => {
        setProjects([...projectsManager.list]);
    };

    projectsManager.onProjectsChanged = (updatedList) => {
        setProjects([...updatedList]);
    };

    // Lesson 3.6: Observe projects state changes after mount & on every update via React.useEffect
    React.useEffect(() => {
        console.log("Updated projects state", projects);
    }, [projects]);

    // Lesson 4.3 & 4.4: Retrieving collection documents using master generic collection reference
    React.useEffect(() => {
        const getFirestoreProjects = async () => {
            try {
                const querySnapshot = await getDocs(projectsCollection);
                projectsManager.list = [];

                for (const doc of querySnapshot.docs) {
                    const data = doc.data() as any;
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
                    const projectDesc = data.description || "";
                    const projectCost = Number(data.cost || 0);
                    const projectProgress = Number(data.progress || 0);
                    const projectModelType: ModelType = data.modelType || "tower";
                    const projectIcon = data.iconColor;
                    const modelCategory: "ifc" | "3d" | "empty" =
                        data.modelCategory === "empty" && !data.ifcFileName
                            ? "empty"
                            : data.ifcFileName || projectName.toLowerCase().includes("ifc") || data.modelCategory === "ifc"
                            ? "ifc"
                            : "3d";

                    const projectData: IProject = {
                        name: projectName,
                        description: projectDesc,
                        status: data.status || "Active",
                        userRole: data.userRole || "Architect",
                        finishDate,
                        cost: projectCost,
                        progress: projectProgress,
                        modelType: projectModelType,
                        modelCategory,
                        ifcFileName: data.ifcFileName,
                        ifcSchema: data.ifcSchema,
                        iconColor: projectIcon,
                        todos: Array.isArray(data.todos) ? data.todos : [],
                        smartViews: Array.isArray(data.smartViews) ? data.smartViews : [],
                    };

                    try {
                        projectsManager.newProject(projectData, doc.id);
                    } catch {
                        const existing = projectsManager.getProject(doc.id);
                        if (existing) {
                            projectsManager.updateProject(existing.id, projectData);
                        }
                    }
                }

                // Ensure all signature showcase projects exist (OpenBIM IFC-enabled with 3D Twins)
                const SHOWCASE_PROJECTS: IProject[] = [
                    {
                        name: "Atlas Grand Football Stadium (IFC4)",
                        description: "65,000-seat professional association football stadium with 105m x 68m regulation grass pitch, 1,056 seating sectors, concourses, VIP lounge, and 48 perimeter steel columns.",
                        status: "Active",
                        userRole: "Engineer",
                        finishDate: new Date("2028-08-15"),
                        cost: 95000000,
                        progress: 0.60,
                        modelType: "tower",
                        modelCategory: "ifc",
                        ifcFileName: "atlas_grand_professional_stadium_ifc4.ifc",
                        ifcSchema: "IFC4",
                        iconColor: "#e11d48",
                        todos: [
                            { id: 1, text: "Verify 105m x 68m FIFA regulation pitch markings, goals, and player tunnel", completed: true },
                            { id: 2, text: "Structural engineering inspection of 48 perimeter steel columns & oculus canopy", completed: true },
                            { id: 3, text: "Floodlight tower lux level balancing & scoreboard electronics commissioning", completed: false }
                        ]
                    },
                    {
                        name: "Aurora 10-Villa Residential Estate (IFC4)",
                        description: "Master-planned 150m x 130m private estate featuring ten independent 2-storey architectural villas, private pools, solar panel arrays, and central boulevard.",
                        status: "Active",
                        userRole: "Architect",
                        finishDate: new Date("2027-06-30"),
                        cost: 3850000,
                        progress: 0.55,
                        modelType: "villa",
                        modelCategory: "ifc",
                        ifcFileName: "aurora_ten_villa_estate_ifc4.ifc",
                        ifcSchema: "IFC4",
                        iconColor: "#10b981",
                        todos: [
                            { id: 1, text: "Site boulevard, perimeter boundary walls & security gatehouse setup", completed: true },
                            { id: 2, text: "Verify 10 independent villa footprints & private pool hydraulic connections", completed: true },
                            { id: 3, text: "Inspect roof solar panel arrays and smart inverter infrastructure", completed: false }
                        ]
                    },
                    {
                        name: "Azure Coast Luxury Eco-Villa",
                        description: "Ultra-luxury Mediterranean architectural villa featuring infinity pool, teakwood deck, and smart bioclimatic shading.",
                        status: "Active",
                        userRole: "Architect",
                        finishDate: new Date("2026-12-15"),
                        cost: 485000,
                        progress: 0.65,
                        modelType: "villa",
                        modelCategory: "3d",
                        iconColor: "#38bdf8",
                        todos: [
                            { id: 1, text: "Hydraulic excavation for cantilevered infinity pool", completed: true },
                            { id: 2, text: "Structural glulam timber deck & panoramic curtain wall", completed: true },
                            { id: 3, text: "Interior living area furniture & recessed LED ambient setup", completed: false }
                        ]
                    },
                    {
                        name: "Urban Logistics Autonomous EV Fleet Hub",
                        description: "Autonomous commercial fleet hub with high-speed EV chargers, structural steel canopy, and showroom flooring.",
                        status: "Active",
                        userRole: "Engineer",
                        finishDate: new Date("2026-11-30"),
                        cost: 320000,
                        progress: 0.40,
                        modelType: "car",
                        modelCategory: "3d",
                        iconColor: "#22c55e",
                        todos: [
                            { id: 1, text: "High-voltage grid connection & showroom epoxy floor", completed: true },
                            { id: 2, text: "Civil autonomous transport bay calibration", completed: false }
                        ]
                    },
                    {
                        name: "Industrial District Energy HVAC Plant",
                        description: "High-performance central industrial chiller & titanium transmission gear assembly for district cooling.",
                        status: "Pending",
                        userRole: "BIM Specialist",
                        finishDate: new Date("2027-01-20"),
                        cost: 195000,
                        progress: 0.20,
                        modelType: "gear",
                        modelCategory: "3d",
                        iconColor: "#f59e0b",
                        todos: [
                            { id: 1, text: "PBR metallic surface tolerance & vibration damping analysis", completed: true },
                            { id: 2, text: "Primary chilled water loop balancing & BMS integration", completed: false }
                        ]
                    },
                    {
                        name: "Apex 28-Story Commercial Skyscraper",
                        description: "28-story corporate commercial high-rise with double-skin curtain wall glass, exterior diagrid steel, and rooftop helipad.",
                        status: "Active",
                        userRole: "Architect",
                        finishDate: new Date("2027-06-30"),
                        cost: 1450000,
                        progress: 0.55,
                        modelType: "tower",
                        modelCategory: "3d",
                        iconColor: "#7c3aed",
                        todos: [
                            { id: 1, text: "Perimeter diagrid steel exoskeleton erection (floors 1-18)", completed: true },
                            { id: 2, text: "Sky Garden cantilever terrace & biophilic lounge fit-out", completed: true },
                            { id: 3, text: "Rooftop helipad landing ring & aviation beacon strobe setup", completed: false }
                        ]
                    },
                    {
                        name: "Nordic Span Cable-Stayed Highway Bridge",
                        description: "Monumental dual-pylon cable-stayed suspension bridge over deep fjord with 32 tension stay cables and roadway LED luminaires.",
                        status: "Active",
                        userRole: "Engineer",
                        finishDate: new Date("2027-09-15"),
                        cost: 2850000,
                        progress: 0.35,
                        modelType: "bridge",
                        modelCategory: "3d",
                        iconColor: "#0f766e",
                        todos: [
                            { id: 1, text: "Submerged marine caisson pier foundations & cofferdam dewatering", completed: true },
                            { id: 2, text: "A-frame slip-form concrete pylon tower climbing formwork", completed: true },
                            { id: 3, text: "Aerodynamic box girder deck lifting & stay cable tension balancing", completed: false }
                        ]
                    },
                    {
                        name: "BIM Modular Architectural Exhibition Pavilion",
                        description: "Modular architectural exhibition pavilion with exposed rebar grid, polished terrazzo floor, and cantilevered LED canopy.",
                        status: "Active",
                        userRole: "Architect",
                        finishDate: new Date("2026-11-20"),
                        cost: 120000,
                        progress: 0.80,
                        modelType: "cube",
                        modelCategory: "3d",
                        iconColor: "#2563eb",
                        todos: [
                            { id: 1, text: "Reinforced concrete footing & rebar cage placement", completed: true },
                            { id: 2, text: "Structural steel column bolting & torque inspection", completed: true },
                            { id: 3, text: "Recessed linear LED lighting & curtain wall glazing", completed: false }
                        ]
                    },
                    // The 7 Official That Open Company Course IFC Models
                    {
                        name: "ProVI Infrastructure Civil Overpass & Highway Viaduct (IFC4)",
                        description: "Official That Open Company civil infrastructure overpass & roadway corridor in IFC4 schema, featuring road alignments, bridge abutments, and earthworks.",
                        status: "Active",
                        userRole: "Engineer",
                        finishDate: new Date("2027-04-15"),
                        cost: 850000,
                        progress: 0.70,
                        modelType: "bridge",
                        modelCategory: "ifc",
                        ifcFileName: "MBSD-TOC-P01-MOD-EST-001.ifc",
                        ifcSchema: "IFC4",
                        iconColor: "#059669",
                        todos: [
                            { id: 1, text: "Verify IFC4 STEP schema compliance & Express ID integrity", completed: true },
                            { id: 2, text: "Extract structural column property sets (IfcPropertySet)", completed: true },
                            { id: 3, text: "BIM spatial containment hierarchy (IfcRelContainedInSpatialStructure)", completed: false }
                        ]
                    },
                    {
                        name: "Metropolitan Civic Center - Architectural Model (IFC2X3)",
                        description: "Comprehensive architectural BIM model authored in Autodesk Revit 2024, exported in IFC2X3 Coordination View V2.0 with curtain walls and spatial rooms.",
                        status: "Active",
                        userRole: "Architect",
                        finishDate: new Date("2027-08-30"),
                        cost: 1250000,
                        progress: 0.45,
                        modelType: "tower",
                        modelCategory: "ifc",
                        ifcFileName: "HNS-CTL-N01-MOD-ARQ.ifc",
                        ifcSchema: "IFC2X3",
                        iconColor: "#0284c7",
                        todos: [
                            { id: 1, text: "Revit 2024 IFC2X3 coordination view export validation", completed: true },
                            { id: 2, text: "Curtain wall panel & spatial room boundary classification", completed: false }
                        ]
                    },
                    {
                        name: "Metropolitan Civic Center - Structural Superstructure (IFC2X3)",
                        description: "Full structural framing model with steel trusses, shear walls, and rebar schedules exported in IFC2X3 Coordination View V2.0.",
                        status: "Pending",
                        userRole: "Engineer",
                        finishDate: new Date("2027-11-20"),
                        cost: 2100000,
                        progress: 0.30,
                        modelType: "tower",
                        modelCategory: "ifc",
                        ifcFileName: "HNS-CTL-ZZZ-MOD-EST.ifc",
                        ifcSchema: "IFC2X3",
                        iconColor: "#7c3aed",
                        todos: [
                            { id: 1, text: "Steel truss connection detailing & clash tolerance check", completed: true },
                            { id: 2, text: "Rebar schedule export to IFC Quantity Takeoff (QTO)", completed: false }
                        ]
                    },
                    {
                        name: "High-Speed Rail Viaduct - Superstructure Span E01 (IFC4)",
                        description: "Civil infrastructure and alignment sample model in IFC4, featuring road corridors, bridge abutments, and earthworks terrain.",
                        status: "Active",
                        userRole: "Engineer",
                        finishDate: new Date("2028-02-15"),
                        cost: 3400000,
                        progress: 0.50,
                        modelType: "bridge",
                        modelCategory: "ifc",
                        ifcFileName: "NAV-IPI-ET1_E01-ZZZ-M3D-EST.ifc",
                        ifcSchema: "IFC4",
                        iconColor: "#d97706",
                        todos: [
                            { id: 1, text: "Civil alignment & bridge abutment spatial referencing", completed: true },
                            { id: 2, text: "Earthworks terrain cut/fill balance calculation in IFC", completed: false }
                        ]
                    },
                    {
                        name: "High-Speed Rail Viaduct - Box Girder Span E02 (IFC4)",
                        description: "Civil viaduct superstructure segment E02 in IFC4 schema with pre-stressed box girders and expansion joints.",
                        status: "Active",
                        userRole: "Engineer",
                        finishDate: new Date("2028-05-30"),
                        cost: 2800000,
                        progress: 0.35,
                        modelType: "bridge",
                        modelCategory: "ifc",
                        ifcFileName: "NAV-IPI-ET1_E02-ZZZ-M3D-EST.ifc",
                        ifcSchema: "IFC4",
                        iconColor: "#0284c7",
                        todos: [
                            { id: 1, text: "Box girder longitudinal prestressing tendon layout", completed: true },
                            { id: 2, text: "Seismic expansion joint clearance inspection", completed: false }
                        ]
                    },
                    {
                        name: "High-Speed Rail Viaduct - Concrete Pier & Foundation E03 (IFC4)",
                        description: "Reinforced concrete viaduct substructure pier E03 with pile caps, bored piles, and elastomeric bearing pads.",
                        status: "Pending",
                        userRole: "Engineer",
                        finishDate: new Date("2028-08-15"),
                        cost: 1950000,
                        progress: 0.20,
                        modelType: "bridge",
                        modelCategory: "ifc",
                        ifcFileName: "NAV-IPI-ET1_E03-ZZZ-M3D-EST.ifc",
                        ifcSchema: "IFC4",
                        iconColor: "#059669",
                        todos: [
                            { id: 1, text: "Deep foundation bored pile depth & rock socketing", completed: true },
                            { id: 2, text: "Elastomeric bearing seat elevation verification", completed: false }
                        ]
                    },
                    {
                        name: "High-Speed Rail Viaduct - Retaining Abutment E07 (IFC4)",
                        description: "Terminal approach abutment and retaining wall system in IFC4 with backfill drainage and transition approach slab.",
                        status: "Active",
                        userRole: "Engineer",
                        finishDate: new Date("2028-11-01"),
                        cost: 1450000,
                        progress: 0.60,
                        modelType: "bridge",
                        modelCategory: "ifc",
                        ifcFileName: "NAV-IPI-ET1_E07-ZZZ-M3D-EST.ifc",
                        ifcSchema: "IFC4",
                        iconColor: "#7c3aed",
                        todos: [
                            { id: 1, text: "Wingwall reinforcement & approach slab tie-in check", completed: true },
                            { id: 2, text: "Weephole and geotextile filter drainage review", completed: false }
                        ]
                    }
                ];

                // Initial seeding: ONLY seed showcase projects if Firestore is completely empty (first run)
                if (querySnapshot.empty) {
                    for (const showcase of SHOWCASE_PROJECTS) {
                        try {
                            const docRef = await addDoc(projectsCollection, sanitizeForFirestore(showcase));
                            projectsManager.newProject(showcase, docRef.id);
                        } catch {}
                    }
                }

                setProjects([...projectsManager.list]);
            } catch (error) {
                console.error("Error fetching Firestore projects:", error);
            }
        };

        getFirestoreProjects();
    }, []);

    // Helper to display styled error dialog (or fallback alert)
    const showError = (message: string) => {
        const errorMsgEl = document.getElementById("error-modal-message");
        const errorModal = document.getElementById("error-modal");
        if (errorModal && errorModal instanceof HTMLDialogElement && errorMsgEl) {
            errorMsgEl.textContent = message;
            errorModal.showModal();
        } else {
            alert(message);
        }
    };

    // Lesson 3.4 & Challenge: Callback to open the New Project modal (managed via state & ProjectForm)
    const onNewProjectClick = () => {
        setIsNewProjectModalOpen(true);
    };

    // Lesson 3.4 Assignment: Export & Import projects JSON inside ProjectsPage component
    const onExportProject = () => {
        try {
            projectsManager.exportToJSON();
        } catch (err: any) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            showError(errorMessage);
        }
    };

    const onImportProject = () => {
        projectsManager.importFromJSON();
    };

    // Lesson 3.11: Project search function passed as onChange prop to SearchBox
    const onSearchProjects = (value: string) => {
        setSearchQuery(value);
        const filtered = projectsManager.filterProjects(value);
        setProjects(filtered);
    };
    const projectSearch = onSearchProjects;



    // Filter & sort projects declaratively via React state
    const q = searchQuery.toLowerCase().trim();
    const visibleProjects = projects
        .filter((project) => {
            const matchesSearch =
                !q ||
                project.name.toLowerCase().includes(q) ||
                project.description.toLowerCase().includes(q) ||
                project.userRole.toLowerCase().includes(q) ||
                (project.ifcFileName && project.ifcFileName.toLowerCase().includes(q));
            const matchesStatus =
                statusFilter === "all" || project.status.toLowerCase() === statusFilter;
            const isIfc = Boolean(
                project.modelCategory === "ifc" ||
                Boolean(project.ifcFileName)
            );
            const is3d = !isIfc;
            const matchesCategory =
                categoryFilter === "all" ||
                (categoryFilter === "ifc" && isIfc) ||
                (categoryFilter === "3d" && is3d);
            return matchesSearch && matchesStatus && matchesCategory;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case "name-asc":
                    return a.name.localeCompare(b.name);
                case "name-desc":
                    return b.name.localeCompare(a.name);
                case "cost-desc":
                    return (b.cost || 0) - (a.cost || 0);
                case "progress-desc":
                    return (b.progress || 0) - (a.progress || 0);
                case "date-asc":
                    return new Date(a.finishDate).getTime() - new Date(b.finishDate).getTime();
                default:
                    return 0;
            }
        });

    const totalCount = projects.length;
    const activeCount = projects.filter((p) => p.status.toLowerCase() === "active").length;
    const pendingCount = projects.filter((p) => p.status.toLowerCase() === "pending").length;
    const finishedCount = projects.filter((p) => p.status.toLowerCase() === "finished").length;

    const ifcCount = projects.filter((p) => p.modelCategory === "ifc" || Boolean(p.ifcFileName)).length;
    const parametricCount = projects.filter(
        (p) => p.modelCategory !== "ifc" && !p.ifcFileName
    ).length;

    const onDeleteProjectCard = async (proj: Project) => {
        const confirmed = window.confirm(`Are you sure you want to delete "${proj.name}" from Cloud Firestore and workspace?`);
        if (!confirmed) return;
        try {
            await deleteDocument("projects", proj.id);
        } catch (err) {
            console.error("Failed to delete project from Firestore:", err);
        }
        projectsManager.deleteProject(proj.id);
        setProjects([...projectsManager.list]);
    };

    // Lesson 3.5, 3.7, 3.8 & 3.9: Map projects state to <ProjectCard /> wrapped in dynamic <Router.Link to={`/project/${project.id}`}>
    const projectCards = visibleProjects.map((project) => (
        <Router.Link
            to={`/project/${project.id}`}
            key={project.id}
            style={{ display: "flex", flexDirection: "column", textDecoration: "none", color: "inherit", height: "100%", width: "100%" }}
            onClick={() => {
                projectsManager.activeProject = project;
            }}
        >
            <ProjectCard
                project={project}
                onClick={() => {
                    projectsManager.activeProject = project;
                    navigate(`/project/${project.id}`);
                }}
                onDelete={onDeleteProjectCard}
            />
        </Router.Link>
    ));



    return (
        <div className="page" id="projects-page">
            {/* Module 3 Challenge: Reusable ProjectForm Component (SRP) */}
            <ProjectForm
                isOpen={isNewProjectModalOpen}
                projectsManager={projectsManager}
                defaultCategory={categoryFilter === "3d" ? "3d" : "ifc"}
                onClose={() => setIsNewProjectModalOpen(false)}
                onSuccess={(saved) => {
                    setProjects([...projectsManager.list]);
                    if (
                        categoryFilter !== "all" &&
                        saved?.modelCategory &&
                        (saved.modelCategory === "ifc" || saved.modelCategory === "3d") &&
                        saved.modelCategory !== categoryFilter
                    ) {
                        handleCategoryChange(saved.modelCategory);
                    }
                }}
            />

            {/* Pro Organized Header Bar (Matches Viewer Command Strip) */}
            <header id="main-header" className="pro-projects-header">
                <div className="header-title-box">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="header-eyebrow">CDE WORKSPACE / MODELS</span>
                        <span className="pro-live-chip">
                            <span className="pro-live-dot" />
                            <span>LIVE SYNC · {totalCount}</span>
                        </span>
                    </div>
                    <bim-label style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)" }}>
                        BIM Projects Studio
                    </bim-label>
                </div>

                <div className="pro-header-center">
                    <SearchBox onChange={onSearchProjects} />
                </div>

                <div className="pro-header-actions">
                    <div className="pro-action-group">
                        <button
                            type="button"
                            className="pro-head-btn"
                            onClick={onImportProject}
                            title="Import Projects JSON"
                        >
                            <span className="material-icons-round">upload_file</span>
                            <span>Import</span>
                        </button>
                        <button
                            type="button"
                            className="pro-head-btn"
                            onClick={onExportProject}
                            title="Export Projects JSON"
                        >
                            <span className="material-icons-round">download</span>
                            <span>Export</span>
                        </button>
                    </div>
                    <button
                        type="button"
                        className="pro-head-btn primary"
                        onClick={onNewProjectClick}
                        title="Create New BIM Project"
                    >
                        <span className="material-icons-round">add</span>
                        <span>New Project</span>
                    </button>
                </div>
            </header>

            {/* Organized Contextual Filter, Sort & View Rail */}
            <div className="projects-toolbar pro-projects-rail">
                <div className="projects-category-filter-group" id="project-category-filter-group">
                    <button
                        type="button"
                        className={`category-pill ${categoryFilter === "all" ? "active" : ""}`}
                        onClick={() => handleCategoryChange("all")}
                    >
                        <span className="material-icons-round" style={{ fontSize: "16px" }}>dashboard</span>
                        All Models <span className="filter-count">{totalCount}</span>
                    </button>
                    <button
                        type="button"
                        className={`category-pill ifc-pill ${categoryFilter === "ifc" ? "active" : ""}`}
                        onClick={() => handleCategoryChange("ifc")}
                    >
                        <span className="material-icons-round" style={{ fontSize: "16px" }}>description</span>
                        IFC OpenBIM <span className="filter-count">{ifcCount}</span>
                    </button>
                    <button
                        type="button"
                        className={`category-pill parametric-pill ${categoryFilter === "3d" ? "active" : ""}`}
                        onClick={() => handleCategoryChange("3d")}
                    >
                        <span className="material-icons-round" style={{ fontSize: "16px" }}>view_in_ar</span>
                        3D Models <span className="filter-count">{parametricCount}</span>
                    </button>
                </div>

                <div className="pro-rail-controls">
                    <div className="projects-sort-group" id="project-filter-group">
                        <label htmlFor="project-status-select" className="sort-label">
                            <span className="material-icons-round">filter_list</span>
                            <span>Status</span>
                        </label>
                        <select
                            id="project-status-select"
                            className="sort-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All ({totalCount})</option>
                            <option value="active">Active ({activeCount})</option>
                            <option value="pending">Pending ({pendingCount})</option>
                            <option value="finished">Finished ({finishedCount})</option>
                        </select>
                    </div>

                    <div className="projects-sort-group">
                        <label htmlFor="project-sort-select" className="sort-label">
                            <span className="material-icons-round">sort</span>
                            <span>Sort</span>
                        </label>
                        <select
                            id="project-sort-select"
                            className="sort-select"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="name-asc">Name (A → Z)</option>
                            <option value="name-desc">Name (Z → A)</option>
                            <option value="cost-desc">Cost (High → Low)</option>
                            <option value="progress-desc">Progress (High → Low)</option>
                            <option value="date-asc">Finish Date (Earliest)</option>
                        </select>
                    </div>

                    <div className="pro-view-switcher" role="group" aria-label="View Mode">
                        <button
                            type="button"
                            className={`pro-view-btn ${viewMode === "grid" ? "active" : ""}`}
                            onClick={() => setViewMode("grid")}
                            title="Card Grid View"
                        >
                            <span className="material-icons-round">grid_view</span>
                            <span>Cards</span>
                        </button>
                        <button
                            type="button"
                            className={`pro-view-btn ${viewMode === "list" ? "active" : ""}`}
                            onClick={() => setViewMode("list")}
                            title="Enterprise Schedule Table View"
                        >
                            <span className="material-icons-round">table_rows</span>
                            <span>Schedule</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Projects Workspace (Full-Width Card Grid or Enterprise Schedule Table) */}
            {viewMode === "grid" ? (
                <section id="projects-list" className="pro-projects-grid">
                    {projectCards.length > 0 ? (
                        projectCards
                    ) : (
                        <div id="projects-empty-state" className="projects-empty-state">
                            <div className="empty-state-icon-box">
                                <span className="material-icons-round">search_off</span>
                            </div>
                            <div className="empty-state-text">
                                <h3>No Projects Found</h3>
                                <p>There are no projects matching your current filter in the CDE workspace.</p>
                            </div>
                            <div className="empty-state-actions">
                                {(q || statusFilter !== "all" || categoryFilter !== "all") && (
                                    <button
                                        type="button"
                                        className="btn-clear-filters"
                                        onClick={() => {
                                            setSearchQuery("");
                                            setStatusFilter("all");
                                            handleCategoryChange("all");
                                            setProjects([...projectsManager.list]);
                                        }}
                                    >
                                        <span className="material-icons-round">filter_alt_off</span>
                                        <span>Clear Filters &amp; Show All</span>
                                    </button>
                                )}
                                <button type="button" className="btn-primary" onClick={onNewProjectClick}>
                                    <span className="material-icons-round">add</span>
                                    <span>New Project</span>
                                </button>
                            </div>
                        </div>
                    )}
                </section>
            ) : (
                <section className="pro-schedule-wrap">
                    <div className="pro-schedule-card">
                        <table className="pro-schedule-table">
                            <thead>
                                <tr>
                                    <th>Project</th>
                                    <th>Model Type</th>
                                    <th>Lead Role</th>
                                    <th>Status</th>
                                    <th>Target Date</th>
                                    <th>Progress</th>
                                    <th>Budget</th>
                                    <th style={{ textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleProjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: "center", padding: "32px", color: "#64748b" }}>
                                            No matching BIM projects. Adjust search/filters or click New Project.
                                        </td>
                                    </tr>
                                ) : (
                                    visibleProjects.map((proj) => {
                                        const isIfc = proj.modelCategory === "ifc" || Boolean(proj.ifcFileName);
                                        const pct = Math.round((proj.progress || 0) * 100);
                                        const dt = proj.finishDate instanceof Date ? proj.finishDate : new Date(proj.finishDate);
                                        const dtStr = !isNaN(dt.getTime())
                                            ? dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                            : "N/A";
                                        return (
                                            <tr
                                                key={proj.id}
                                                onClick={() => {
                                                    projectsManager.activeProject = proj;
                                                    navigate(`/project/${proj.id}`);
                                                }}
                                            >
                                                <td>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                        <span className="pro-row-avatar" style={{ background: proj.iconColor || "#2563eb" }}>
                                                            {proj.name.trim().substring(0, 2).toUpperCase()}
                                                        </span>
                                                        <div style={{ minWidth: 0 }}>
                                                            <div className="pro-row-title">{proj.name}</div>
                                                            <div className="pro-row-desc">{proj.description}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`pro-type-badge ${isIfc ? "ifc" : "twin"}`}>
                                                        {isIfc ? `IFC · ${proj.ifcSchema || "IFC4"}` : "3D Twin"}
                                                    </span>
                                                </td>
                                                <td style={{ color: "#cbd5e1", textTransform: "capitalize" }}>{proj.userRole}</td>
                                                <td>
                                                    <span className={`pro-status-pill ${proj.status.toLowerCase()}`}>
                                                        {proj.status}
                                                    </span>
                                                </td>
                                                <td style={{ color: "#94a3b8", whiteSpace: "nowrap" }}>{dtStr}</td>
                                                <td style={{ minWidth: "120px" }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                        <div className="pro-row-bar-track">
                                                            <div className="pro-row-bar-fill" style={{ width: `${pct}%` }} />
                                                        </div>
                                                        <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "#7dd3fc" }}>{pct}%</span>
                                                    </div>
                                                </td>
                                                <td style={{ fontWeight: 700, color: "#34d399", whiteSpace: "nowrap" }}>
                                                    ${(proj.cost || 0).toLocaleString()}
                                                </td>
                                                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                                    <button
                                                        type="button"
                                                        className="pro-row-open-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            projectsManager.activeProject = proj;
                                                            navigate(`/project/${proj.id}`);
                                                        }}
                                                    >
                                                        Open →
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="pro-row-del-btn"
                                                        title="Delete Project"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDeleteProjectCard(proj);
                                                        }}
                                                    >
                                                        <span className="material-icons-round" style={{ fontSize: "15px" }}>delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
}
