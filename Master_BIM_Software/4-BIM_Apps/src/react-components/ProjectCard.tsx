import * as React from "react";
import { Project } from "../classes/Project";
import { appIcons } from "../globals";

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

    const dateObj = project.finishDate instanceof Date ? project.finishDate : new Date(project.finishDate);
    const dateStr = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "N/A";

    // Resolve accurate, human-readable 3D model metadata and self-explanatory badge
    const getModelBadge = (proj: Project): { name: string; icon: string; category: "ifc" | "3d"; schema?: string } => {
        const nameLow = (proj.name || "").toLowerCase();
        const fileLow = (proj.ifcFileName || "").toLowerCase();

        if (proj.modelCategory === "ifc" || proj.ifcFileName || nameLow.includes("ifc")) {
            const schema = proj.ifcSchema || (nameLow.includes("ifc4") || fileLow.includes("ifc4") ? "IFC4" : "IFC2X3");
            
            if (nameLow.includes("stadium") || fileLow.includes("stadium")) {
                return { name: `65k Football Stadium · ${schema}`, icon: "sports_soccer", category: "ifc", schema };
            }
            if (nameLow.includes("aurora") || nameLow.includes("10-villa") || fileLow.includes("aurora") || fileLow.includes("ten_villa")) {
                return { name: `10-Villa Estate · ${schema}`, icon: "holiday_village", category: "ifc", schema };
            }
            if (nameLow.includes("office") || nameLow.includes("hq") || nameLow.includes("structural complex") || fileLow.includes("mbsd")) {
                return { name: `Commercial HQ · ${schema}`, icon: "corporate_fare", category: "ifc", schema };
            }
            if (nameLow.includes("superstructure") || fileLow.includes("zzz")) {
                return { name: `Civic Framing · ${schema}`, icon: "domain", category: "ifc", schema };
            }
            if (nameLow.includes("civic") || nameLow.includes("hns") || fileLow.includes("arq")) {
                return { name: `Civic Architecture · ${schema}`, icon: "apartment", category: "ifc", schema };
            }
            if (nameLow.includes("e01") || fileLow.includes("e01")) {
                return { name: `Viaduct Span E01 · ${schema}`, icon: "bridge", category: "ifc", schema };
            }
            if (nameLow.includes("e02") || fileLow.includes("e02")) {
                return { name: `Box Girder E02 · ${schema}`, icon: "bridge", category: "ifc", schema };
            }
            if (nameLow.includes("pier") || nameLow.includes("e03") || fileLow.includes("e03")) {
                return { name: `Viaduct Pier E03 · ${schema}`, icon: "foundation", category: "ifc", schema };
            }
            if (nameLow.includes("abutment") || nameLow.includes("e07") || fileLow.includes("e07")) {
                return { name: `Retaining Abutment E07 · ${schema}`, icon: "account_balance", category: "ifc", schema };
            }

            const label = proj.ifcFileName ? proj.ifcFileName.replace(".ifc", "") : `${schema} Model`;
            return {
                name: label.length > 22 ? `${label.substring(0, 20)}...` : label,
                icon: "description",
                category: "ifc",
                schema,
            };
        }

        let type = proj.modelType;
        if (!type || type === "cube") {
            if (nameLow.includes("tower") || nameLow.includes("skyscraper") || nameLow.includes("apex")) type = "tower";
            else if (nameLow.includes("bridge") || nameLow.includes("span") || nameLow.includes("viaduct") || nameLow.includes("nordic")) type = "bridge";
            else if (nameLow.includes("villa") || nameLow.includes("house") || nameLow.includes("residence") || nameLow.includes("azure")) type = "villa";
            else if (nameLow.includes("car") || nameLow.includes("auto") || nameLow.includes("vehic") || nameLow.includes("ev")) type = "car";
            else if (nameLow.includes("gear") || nameLow.includes("hvac") || nameLow.includes("plant") || nameLow.includes("mech")) type = "gear";
        }
        switch (type) {
            case "tower":
                return { name: "Commercial Skyscraper · 3D", icon: "apartment", category: "3d" };
            case "bridge":
                return { name: "Cable-Stayed Bridge · 3D", icon: "alt_route", category: "3d" };
            case "villa":
                return { name: "Luxury Modern Villa · 3D", icon: "cottage", category: "3d" };
            case "car":
                return { name: "Autonomous EV Hub · 3D", icon: "electric_car", category: "3d" };
            case "gear":
                return { name: "District HVAC Plant · 3D", icon: "settings", category: "3d" };
            default:
                return { name: "Exhibition Pavilion · 3D", icon: "view_in_ar", category: "3d" };
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
                        <bim-label>{props.project.description}</bim-label>
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
                    <bim-label icon={appIcons.status} className="detail-label">Status</bim-label>
                    <span className={`detail-value status-tag ${props.project.status.toLowerCase()}`}>
                        {props.project.status}
                    </span>
                </div>
                <div className="detail-row">
                    <bim-label icon={appIcons.role} className="detail-label">Role</bim-label>
                    <span className="detail-value">{props.project.userRole}</span>
                </div>
                <div className="detail-row">
                    <bim-label icon={appIcons.cost} className="detail-label">Cost</bim-label>
                    <span className="detail-value">
                        $ {Number(props.project.cost || 0).toLocaleString("en-US")}
                    </span>
                </div>
                <div className="detail-row">
                    <bim-label icon={appIcons.date} className="detail-label">Finish Date</bim-label>
                    <span className="detail-value">{dateStr}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">{modelBadge.category === "ifc" ? "IFC Model" : "3D Model"}</span>
                    <span className="detail-value" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: modelBadge.category === "ifc" ? "#34d399" : "#38bdf8", fontWeight: 600 }}>
                        <span className="material-icons-round" style={{ fontSize: "15px", color: modelBadge.category === "ifc" ? "#10b981" : "#38bdf8" }}>{modelBadge.icon}</span>
                        <span>{modelBadge.name}</span>
                        {modelBadge.schema && (
                            <span style={{ fontSize: "0.68rem", padding: "1px 5px", borderRadius: "3px", background: "rgba(16, 185, 129, 0.2)", border: "1px solid rgba(16, 185, 129, 0.4)", color: "#6ee7b7", fontFamily: "monospace", fontWeight: 700 }}>
                                {modelBadge.schema}
                            </span>
                        )}
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
