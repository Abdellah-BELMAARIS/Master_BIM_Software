import * as React from "react";
import * as Router from "react-router-dom";
import { appIcons } from "../globals";

export interface ISidebarProps {
    activeTab?: "projects" | "users";
    onNavigate?: (tab: "projects" | "users") => void;
}

/**
 * Precision BIM Platform Brand Vector Logo
 * Rendered inline to guarantee 100% reliable SVG bundling across all deployment targets
 */
function CompanyLogo({ compact = false }: { compact?: boolean }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={compact ? "0 0 54 54" : "0 0 245 54"}
            width={compact ? "36" : "200"}
            height={compact ? "36" : "46"}
            preserveAspectRatio="xMinYMid meet"
            id="company-logo"
            aria-label="Construction Company — BIM Platform"
        >
            <defs>
                <linearGradient id="logoBadgeBg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="logoCubeTop" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.25" />
                </linearGradient>
                <linearGradient id="logoCubeLeft" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="logoCubeRight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e40af" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity="0.4" />
                </linearGradient>
            </defs>

            {/* Outer Precision BIM Badge Frame */}
            <rect x="2" y="3" width="48" height="48" rx="6" fill="url(#logoBadgeBg)" stroke="#2563eb" strokeWidth="1.75" />
            <rect x="5" y="6" width="42" height="42" rx="4" fill="none" stroke="rgba(56, 189, 248, 0.18)" strokeWidth="1" />

            {/* Structural BIM Isometric 3D Shaded Cube */}
            <polygon points="26,11 40,19 26,27 12,19" fill="url(#logoCubeTop)" />
            <polygon points="12,19 26,27 26,43 12,35" fill="url(#logoCubeLeft)" />
            <polygon points="26,27 40,19 40,35 26,43" fill="url(#logoCubeRight)" />

            {/* Outer Wireframe & Inner Axis Edges */}
            <path d="M26 11 L40 19 L40 35 L26 43 L12 35 L12 19 Z" fill="none" stroke="#38bdf8" strokeWidth="1.85" strokeLinejoin="round" />
            <path d="M12 19 L26 27 L40 19 M26 27 L26 43" fill="none" stroke="#60a5fa" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />

            {/* CAD Structural Node Vertices */}
            <circle cx="26" cy="11" r="1.7" fill="#f8fafc" />
            <circle cx="26" cy="27" r="2" fill="#38bdf8" />
            <circle cx="12" cy="19" r="1.5" fill="#93c5fd" />
            <circle cx="40" cy="19" r="1.5" fill="#93c5fd" />
            <circle cx="26" cy="43" r="1.5" fill="#93c5fd" />

            {/* Brand Typography */}
            {!compact && (
                <>
                    <text x="60" y="25" fill="#f8fafc" style={{ fontFamily: "'Inter', sans-serif", fontSize: "18px", fontWeight: 800, letterSpacing: "0.05em" }}>
                        CONSTRUCTION
                    </text>
                    <text x="60" y="44" fill="#38bdf8" style={{ fontFamily: "'Inter', sans-serif", fontSize: "15px", fontWeight: 800, letterSpacing: "0.14em" }}>
                        COMPANY
                    </text>
                </>
            )}
        </svg>
    );
}

// Lesson 3.2 & 3.8: Sidebar React Component with React Router <Link>
export function Sidebar(props: ISidebarProps) {
    const location = Router.useLocation();
    const [activeTab, setActiveTab] = React.useState<"projects" | "users">(
        props.activeTab || "projects"
    );
    const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
        try {
            return localStorage.getItem("toc_sidebar_collapsed") === "true";
        } catch {
            return false;
        }
    });

    React.useEffect(() => {
        document.body.classList.toggle("sidebar-collapsed", isCollapsed);
        try {
            localStorage.setItem("toc_sidebar_collapsed", String(isCollapsed));
        } catch {}
        const t = setTimeout(() => window.dispatchEvent(new Event("resize")), 240);
        return () => clearTimeout(t);
    }, [isCollapsed]);

    React.useEffect(() => {
        if (location.pathname === "/" || location.pathname.startsWith("/project")) {
            setActiveTab("projects");
            if (props.onNavigate) {
                props.onNavigate("projects");
            }
        }
    }, [location.pathname]);

    const handleNavClick = (tab: "projects" | "users") => {
        setActiveTab(tab);
        if (props.onNavigate) {
            props.onNavigate(tab);
        }
    };

    const isIfcProjects = location.pathname === "/" && location.search.includes("category=ifc");
    const is3dProjects = location.pathname === "/" && location.search.includes("category=3d");
    const isAllProjects = activeTab === "projects" && !isIfcProjects && !is3dProjects;

    return (
        <aside id="sidebar" className={isCollapsed ? "is-collapsed" : ""}>
            <div
                className="sidebar-header"
                style={{ padding: "1.1rem 0.9rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}
            >
                <CompanyLogo compact={isCollapsed} />
                <button
                    type="button"
                    className="sidebar-collapse-btn"
                    onClick={() => setIsCollapsed((prev) => !prev)}
                    title={isCollapsed ? "Expand Sidebar" : "Hide Sidebar (Icons Only)"}
                    aria-label={isCollapsed ? "Expand Sidebar" : "Hide Sidebar (Icons Only)"}
                >
                    <span className="material-icons-round" style={{ fontSize: "18px" }}>
                        {isCollapsed ? "chevron_right" : "menu_open"}
                    </span>
                </button>
            </div>

            <div className="sidebar-nav-section">
                <span className="sidebar-section-label">WORKSPACE</span>
                <div id="nav-buttons" style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "none", width: "100%" }}>
                    <Router.Link to="/" style={{ textDecoration: "none", display: "block", width: "100%" }} title="BIM Projects">
                        <bim-button
                            label={isCollapsed ? "" : "BIM Projects"}
                            icon={appIcons.projects}
                            active={isAllProjects}
                            onclick={() => handleNavClick("projects")}
                            style={{ width: "100%", height: "42px", minHeight: "42px", maxHeight: "42px", flex: "none", justifyContent: isCollapsed ? "center" : "flex-start" }}
                        ></bim-button>
                    </Router.Link>
                    <bim-button
                        label={isCollapsed ? "" : "AEC Team"}
                        icon={appIcons.users}
                        active={activeTab === "users"}
                        title="AEC Team"
                        onclick={() => handleNavClick("users")}
                        style={{ width: "100%", height: "42px", minHeight: "42px", maxHeight: "42px", flex: "none", justifyContent: isCollapsed ? "center" : "flex-start" }}
                    ></bim-button>
                </div>

                <span className="sidebar-section-label" style={{ marginTop: "1.35rem" }}>CDE DATA &amp; TOOLS</span>
                <ul className="sidebar-secondary-nav">
                    <Router.Link to="/?category=ifc" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                        <li
                            className={`nav-sub-item ${isIfcProjects ? "active" : ""}`}
                            onClick={() => handleNavClick("projects")}
                            title="IFC OpenBIM Models"
                        >
                            <span className="material-icons-round" style={{ color: "#38bdf8" }}>description</span>
                            <span>IFC OpenBIM Models</span>
                        </li>
                    </Router.Link>
                    <Router.Link to="/?category=3d" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                        <li
                            className={`nav-sub-item ${is3dProjects ? "active" : ""}`}
                            onClick={() => handleNavClick("projects")}
                            title="3D BIM Models"
                        >
                            <span className="material-icons-round" style={{ color: "#a855f7" }}>view_in_ar</span>
                            <span>3D BIM Models</span>
                        </li>
                    </Router.Link>
                </ul>
            </div>

            <div className="sidebar-footer">
                <div className="user-profile-bar">
                    <div className="user-avatar-badge">AB</div>
                    <div className="user-meta">
                        <span className="user-name">Abdellah B.</span>
                    </div>
                </div>
                <div className="system-status">
                    <span className="status-dot"></span>
                    <span className="status-text">IFC READY</span>
                </div>
            </div>
        </aside>
    );
}
