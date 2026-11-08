import * as React from "react";
import * as Router from "react-router-dom";

export interface ISidebarProps {
    activeTab?: "projects" | "users";
    onNavigate?: (tab: "projects" | "users") => void;
}

/**
 * Precision BIM Platform Brand Vector Logo
 * Rendered inline to guarantee 100% reliable SVG bundling across all deployment targets
 */
function CompanyLogo() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 245 54"
            width="225"
            height="50"
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
            <text x="60" y="25" fill="#f8fafc" style={{ fontFamily: "'Inter', sans-serif", fontSize: "18px", fontWeight: 800, letterSpacing: "0.05em" }}>
                CONSTRUCTION
            </text>
            <text x="60" y="44" fill="#38bdf8" style={{ fontFamily: "'Inter', sans-serif", fontSize: "15px", fontWeight: 800, letterSpacing: "0.14em" }}>
                COMPANY
            </text>
        </svg>
    );
}

// Lesson 3.2 & 3.8: Sidebar React Component with React Router <Link>
export function Sidebar(props: ISidebarProps) {
    const location = Router.useLocation();
    const [activeTab, setActiveTab] = React.useState<"projects" | "users">(
        props.activeTab || "projects"
    );

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

    return (
        <aside id="sidebar">
            <div className="sidebar-header" style={{ padding: "1.25rem 1rem", display: "flex", alignItems: "center" }}>
                <CompanyLogo />
            </div>

            <div className="sidebar-nav-section">
                <span className="sidebar-section-label">WORKSPACE</span>
                <ul id="nav-buttons">
                    <Router.Link to="/" style={{ textDecoration: "none", width: "100%", display: "block" }}>
                        <li
                            className={`nav-item ${activeTab === "projects" ? "active" : ""}`}
                            id="nav-projects-btn"
                            onClick={() => handleNavClick("projects")}
                        >
                            <span className="material-icons-round">domain</span>
                            <span className="nav-label">BIM Projects</span>
                            <span className="nav-badge">6</span>
                        </li>
                    </Router.Link>
                    <li
                        className={`nav-item ${activeTab === "users" ? "active" : ""}`}
                        id="nav-users-btn"
                        onClick={() => handleNavClick("users")}
                    >
                        <span className="material-icons-round">engineering</span>
                        <span className="nav-label">AEC Team</span>
                        <span className="nav-pill-role">Online</span>
                    </li>
                </ul>

                <span className="sidebar-section-label" style={{ marginTop: "1.35rem" }}>CDE DATA & TOOLS</span>
                <ul className="sidebar-secondary-nav">
                    <Router.Link to="/?category=ifc" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                        <li
                            className={`nav-sub-item ${location.pathname === "/" && location.search.includes("category=ifc") ? "active" : ""}`}
                            onClick={() => handleNavClick("projects")}
                            title="Filter to IFC OpenBIM Models"
                        >
                            <span className="material-icons-round" style={{ color: "#38bdf8" }}>description</span>
                            <span>IFC OpenBIM Models</span>
                        </li>
                    </Router.Link>
                    <Router.Link to="/?category=3d" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                        <li
                            className={`nav-sub-item ${location.pathname === "/" && location.search.includes("category=3d") ? "active" : ""}`}
                            onClick={() => handleNavClick("projects")}
                            title="Filter to 3D Parametric Digital Twins"
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
