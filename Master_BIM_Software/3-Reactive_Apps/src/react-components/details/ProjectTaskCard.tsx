import * as React from "react";
import { IProjectTask, TodoPriority, TodoStatus } from "../../classes/Project";

export interface ProjectTaskCardProps {
    todo: IProjectTask;
    onToggleStatus: (todoId: number) => void;
    onEdit: (todoId: number) => void;
    onDelete: (todoId: number) => void;
}

export function ProjectTaskCard(props: ProjectTaskCardProps) {
    const { todo, onToggleStatus, onEdit, onDelete } = props;

    const currentStatus: TodoStatus =
        todo.status || (todo.completed ? "completed" : "pending");

    const currentPriority: TodoPriority = todo.priority || "medium";

    const statusLabels: Record<TodoStatus, string> = {
        "pending": "Pending",
        "in-progress": "In Progress",
        "completed": "Completed",
    };

    const statusIcons: Record<TodoStatus, string> = {
        "pending": "schedule",
        "in-progress": "autorenew",
        "completed": "check_circle",
    };

    const priorityStyles: Record<TodoPriority, { bg: string; text: string; border: string; label: string }> = {
        low: {
            bg: "rgba(16, 185, 129, 0.15)",
            text: "#10b981",
            border: "rgba(16, 185, 129, 0.4)",
            label: "Low",
        },
        medium: {
            bg: "rgba(245, 158, 11, 0.15)",
            text: "#f59e0b",
            border: "rgba(245, 158, 11, 0.4)",
            label: "Medium",
        },
        high: {
            bg: "rgba(249, 115, 22, 0.15)",
            text: "#f97316",
            border: "rgba(249, 115, 22, 0.4)",
            label: "High",
        },
        critical: {
            bg: "rgba(239, 68, 68, 0.2)",
            text: "#ef4444",
            border: "rgba(239, 68, 68, 0.6)",
            label: "Critical",
        },
    };

    const activePriorityStyle = priorityStyles[currentPriority] || priorityStyles.medium;

    return (
        <div
            className={`todo-card-item status-${currentStatus} priority-${currentPriority} ${
                currentStatus === "completed" ? "completed" : ""
            }`}
        >
            <div
                className="todo-card-left"
                title={`Click to cycle status (${statusLabels[currentStatus]})`}
                onClick={() => onToggleStatus(todo.id)}
            >
                <button type="button" className="todo-icon-box">
                    <span className="material-icons-round">
                        {statusIcons[currentStatus]}
                    </span>
                </button>
                <div className="todo-text-group">
                    <p className="todo-desc">{todo.text}</p>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
                        <span className={`todo-status-pill status-${currentStatus}`}>
                            {statusLabels[currentStatus]}
                        </span>
                        <span
                            className="todo-priority-pill"
                            style={{
                                backgroundColor: activePriorityStyle.bg,
                                color: activePriorityStyle.text,
                                border: `1px solid ${activePriorityStyle.border}`,
                                padding: "2px 7px",
                                borderRadius: "10px",
                                fontSize: "11px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                            }}
                        >
                            {activePriorityStyle.label}
                        </span>
                    </div>
                </div>
            </div>
            <div className="todo-card-right">
                <span className="todo-date-tag">{todo.date}</span>
                <div className="todo-item-actions">
                    <button
                        type="button"
                        className="todo-action-btn edit"
                        title="Edit Task & Priority"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(todo.id);
                        }}
                    >
                        <span className="material-icons-round">edit</span>
                    </button>
                    <button
                        type="button"
                        className="todo-action-btn todo-delete-btn delete"
                        title="Delete Task"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(todo.id);
                        }}
                    >
                        <span className="material-icons-round">delete</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// Backward-compatible alias
export const TodoItem = ProjectTaskCard;

