import * as React from "react";
import { Project } from "../classes/Project";

export interface ProjectCardProps {
    project?: Project;
    onClick?: (project: Project) => void;
}

// Lesson 3.5: Nesting components — ProjectCard React Component
export function ProjectCard(props: ProjectCardProps) {
    const project = props.project;

    const name = project ? project.name : "Project Name";
    const description = project ? project.description : "Project Description";
    const status = project ? project.status : "Active";
    const userRole = project ? project.userRole : "Architect";
    const cost = project ? project.cost : 0;
    const progressPercent = project ? Math.round((project.progress || 0) * 100) : 25;
    const initials = name ? name.trim().substring(0, 2) : "PR";
    const iconColor = project ? project.iconColor : "#2563eb";

    const dateStr =
        project && project.finishDate instanceof Date && !isNaN(project.finishDate.getTime())
            ? project.finishDate.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
              })
            : "2023-05-01";

    return (
        <div
            className="project-card"
            onClick={() => {
                if (project && props.onClick) {
                    props.onClick(project);
                }
            }}
        >
            <div className="card-header">
                <div className="card-avatar" style={{ backgroundColor: iconColor }}>
                    {initials}
                </div>
                <div className="card-title-group">
                    <h3>{name}</h3>
                    <p>{description}</p>
                </div>
            </div>
            <div className="card-details">
                <div className="detail-row">
                    <span className="detail-label">Status</span>
                    <span className={`detail-value status-tag ${status.toLowerCase()}`}>
                        {status}
                    </span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Role</span>
                    <span className="detail-value">{userRole}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Cost</span>
                    <span className="detail-value">$ {Number(cost).toLocaleString("en-US")}</span>
                </div>
                <div className="detail-row">
                    <span className="detail-label">Finish Date</span>
                    <span className="detail-value">{dateStr}</span>
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

