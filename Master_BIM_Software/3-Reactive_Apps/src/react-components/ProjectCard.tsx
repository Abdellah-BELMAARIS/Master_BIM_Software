import * as React from "react";
import { Project } from "../classes/Project";

// Lesson 3.7: Strict TypeScript Props interface for ProjectCard
interface Props {
    project: Project;
    onClick?: (project: Project) => void;
}

// Lesson 3.5 & 3.7: ProjectCard React Component receiving dynamic data via props.project
export function ProjectCard(props: Props) {
    const { project } = props;
    const initials = project.name.trim().substring(0, 2) || "PR";
    const progressPercent = Math.round((project.progress || 0) * 100);

    const dateStr =
        project.finishDate instanceof Date && !isNaN(project.finishDate.getTime())
            ? project.finishDate.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
              })
            : String(project.finishDate);

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
                <div className="card-avatar" style={{ backgroundColor: project.iconColor }}>
                    {initials}
                </div>
                <div className="card-title-group">
                    <h3>{props.project.name}</h3>
                    <p>{props.project.description}</p>
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
                        $ {Number(props.project.cost).toLocaleString("en-US")}
                    </span>
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
