import * as React from "react";
import * as Router from "react-router-dom";

export interface ISidebarProps {
    activeTab?: "projects" | "users";
    onNavigate?: (tab: "projects" | "users") => void;
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
            <div className="sidebar-header">
                <img
                    id="company-logo"
                    src="./assets/company-logo.svg"
                    alt="Construction Company — BIM Platform"
                />
            </div>

            <div className="sidebar-nav-section">
                <span className="sidebar-section-label">WORKSPACE</span>
                <ul id="nav-buttons">
                    <Router.Link to="/">
                        <li
                            className={`nav-item ${activeTab === "projects" ? "active" : ""}`}
                            id="nav-projects-btn"
                            onClick={() => handleNavClick("projects")}
                        >
                            <span className="material-icons-round">domain</span>
                            <span className="nav-label">BIM Projects</span>
                        </li>
                    </Router.Link>
                    <li
                        className={`nav-item ${activeTab === "users" ? "active" : ""}`}
                        id="nav-users-btn"
                        onClick={() => handleNavClick("users")}
                    >
                        <span className="material-icons-round">engineering</span>
                        <span className="nav-label">AEC Team</span>
                    </li>
                </ul>
            </div>

            <div className="sidebar-footer">
                <div className="system-status">
                    <span className="status-dot"></span>
                    <span className="status-text">IFC VIEWER READY</span>
                </div>
                <span className="status-version">IFC4 · 3D</span>
            </div>
        </aside>
    );
}
