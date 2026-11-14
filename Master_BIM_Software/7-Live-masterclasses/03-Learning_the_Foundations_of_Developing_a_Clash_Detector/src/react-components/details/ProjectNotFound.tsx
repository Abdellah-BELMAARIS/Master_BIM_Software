import * as React from "react";
import * as Router from "react-router-dom";

export interface ProjectNotFoundProps {
    title?: string;
    message?: string;
}

// Lesson 3.10: Elegant Project Not Found / Missing ID conditional fallback component
export function ProjectNotFound(props: ProjectNotFoundProps) {
    const title = props.title || "Project Not Found";
    const message =
        props.message ||
        "The requested BIM project could not be found or the link may be invalid.";

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
                        <span className="header-eyebrow">PROJECT CDE / NAVIGATION</span>
                        <h2>{title}</h2>
                    </div>
                </div>
            </header>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 1,
                    padding: "2rem",
                    textAlign: "center",
                }}
            >
                <div className="empty-state-icon-box" style={{ marginBottom: "1rem" }}>
                    <span className="material-icons-round" style={{ fontSize: "2.5rem" }}>
                        domain_disabled
                    </span>
                </div>
                <h3 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>{title}</h3>
                <p
                    style={{
                        color: "var(--text-secondary)",
                        maxWidth: "420px",
                        marginBottom: "1.5rem",
                    }}
                >
                    {message}
                </p>
                <Router.Link to="/" className="btn-primary">
                    <span className="material-icons-round">arrow_back</span>
                    <span>Back to Projects Dashboard</span>
                </Router.Link>
            </div>
        </div>
    );
}

