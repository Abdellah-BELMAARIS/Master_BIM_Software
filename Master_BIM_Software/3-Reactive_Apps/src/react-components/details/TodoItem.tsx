import * as React from "react";
import { IProjectTask, TodoStatus } from "../../classes/Project";

export interface TodoItemProps {
    todo: IProjectTask;
    onToggleStatus: (todoId: number) => void;
    onEdit: (todoId: number) => void;
    onDelete: (todoId: number) => void;
}

// Lesson 3.10 Modularity Challenge: Individual To-Do task card item component
export function TodoItem(props: TodoItemProps) {
    const { todo, onToggleStatus, onEdit, onDelete } = props;

    const currentStatus: TodoStatus =
        todo.status || (todo.completed ? "completed" : "pending");

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

    return (
        <div
            className={`todo-card-item status-${currentStatus} ${
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
                    <span className={`todo-status-pill status-${currentStatus}`}>
                        {statusLabels[currentStatus]}
                    </span>
                </div>
            </div>
            <div className="todo-card-right">
                <span className="todo-date-tag">{todo.date}</span>
                <div className="todo-item-actions">
                    <button
                        type="button"
                        className="todo-action-btn edit"
                        title="Edit Task & Status"
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

