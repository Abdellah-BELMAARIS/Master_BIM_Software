import * as React from "react";
import { Project } from "../classes/Project";

// Lesson 3.7: Strict TypeScript Props interface for ProjectCard
export interface ProjectCardProps {
    project: Project;
    onClick?: (project: Project) => void;
    onDelete?: (project: Project) => void;
}

// Backward-compatible alias
type Props = ProjectCardProps;

// Lesson 3.5 & 3.7: ProjectCard React Component receiving dynamic data via props.project
export function ProjectCard(props: Props) {
    const { project } = props;
    const initials = project.name.trim().substring(0, 2) || "PR";
    const progressPercent = Math.round((project.progress || 0) * 100);

    // Resolve accurate 3D model metadata from modelType or project name
    const getModelBadge = (proj: Project): { name: string; icon: string } => {
        let type = proj.modelType;
        const lower = proj.name.toLowerCase();
        if (!type || type === "cube") {
            if (lower.includes("tower") || lower.includes("skyscraper") || lower.includes("apex")) type = "tower";
            else if (lower.includes("bridge") || lower.includes("span") || lower.includes("viaduct") || lower.includes("nordic")) type = "bridge";
            else if (lower.includes("villa") || lower.includes("house") || lower.includes("residence") || lower.includes("azure")) type = "villa";
            else if (lower.includes("car") || lower.includes("auto") || lower.includes("vehic") || lower.includes("ev")) type = "car";
            else if (lower.includes("gear") || lower.includes("hvac") || lower.includes("plant") || lower.includes("mech")) type = "gear";
        }
        switch (type) {
            case "tower":
                return { name: "Apex Skyscraper", icon: "apartment" };
            case "bridge":
                return { name: "Nordic Bridge", icon: "alt_route" };
            case "villa":
                return { name: "Azure Eco-Villa", icon: "cottage" };
            case "car":
                return { name: "Civil EV Coupe", icon: "electric_car" };
            case "gear":
                return { name: "HVAC Dyno Gear", icon: "settings" };
            default:
                return { name: "BIM Pavilion", icon: "view_in_ar" };
        }
    };

    const modelBadge = getModelBadge(project);

    return (
        <div
            className="project-card"
            onClick={() => {
                if (props.onClick) {
                    props.onClick(project);
                }
            }}
        >
            <div className="card-header">
                <div className="card-avatar" style={{ backgroundColor: project.iconColor || "#2563eb" }}>
                    {initials}
                </div>
                <div className="card-title-group" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: "8px" }}>
                        <h3>{props.project.name}</h3>
                        <p>{props.project.description}</p>
                    </div>
                    {props.onDelete && (
                        <button
                            type="button"
                            className="btn-icon"
                            title="Delete Project"
                            style={{
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.25)",
                                color: "#ef4444",
                                cursor: "pointer",
                                padding: "6px",
                                borderRadius: "4px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                transition: "all 0.15s ease",
                            }}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                props.onDelete?.(project);
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.25)";
                                e.currentTarget.style.borderColor = "#ef4444";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
                                e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.25)";
                            }}
                        >
                            <span className="material-icons-round" style={{ fontSize: "1.1rem" }}>delete</span>
                        </button>
                    )}
                </div>
            </div>
            <div className="card-details">
                <div className="detail-row">
                    <span className="detail-label">Status</span>
                    <span className={`detail-value status-tag ${props.project.status.toLowerCase()}`}>
                        {props.project.status}
                    </span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Role</span>
                    <span className="detail-value">{props.project.userRole}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Cost</span>
                    <span className="detail-value">
                        $ {Number(props.project.cost || 0).toLocaleString("en-US")}
                    </span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Finish Date</span>
                    <span className="detail-value">{dateStr}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">3D Model</span>
                    <span className="detail-value" style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "#38bdf8", fontWeight: 600 }}>
                        <span className="material-icons-round" style={{ fontSize: "15px", color: "#38bdf8" }}>{modelBadge.icon}</span>
                        {modelBadge.name}
                    </span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Progress</span>
                    <span className="detail-value">{progressPercent}%</span>
                </div>
            </div>
            <div className="card-progress-bar">
                <div
                    className="card-progress-fill"
                    style={{ width: `${Math.max(4, progressPercent)}%` }}
                ></div>
            </div>
        </div>
    );
}
