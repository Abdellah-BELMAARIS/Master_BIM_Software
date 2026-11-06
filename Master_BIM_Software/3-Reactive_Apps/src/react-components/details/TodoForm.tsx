import * as React from "react";
import { IProjectTask, TodoPriority, TodoStatus } from "../../classes/Project";

export interface TodoFormProps {
    task?: IProjectTask | null;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (task: IProjectTask) => void;
}

/**
 * Module 3 Challenge: Dedicated ToDo Form Component
 * Enables creating and updating tasks with 4-tier BIM priorities and lifecycle statuses.
 */
export function TodoForm(props: TodoFormProps) {
    const { task, isOpen, onClose, onSubmit } = props;
    const isEditing = Boolean(task);
    const dialogRef = React.useRef<HTMLDialogElement | null>(null);

    React.useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (isOpen) {
            if (!dialog.open) {
                dialog.showModal();
            }
        } else {
            if (dialog.open) {
                dialog.close();
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);

        const text = ((formData.get("text") as string) || "").trim();
        if (!text) return;

        const rawDate = formData.get("date") as string;
        const parsed = rawDate ? new Date(rawDate) : new Date();
        const dateStr = isNaN(parsed.getTime())
            ? new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })
            : parsed.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });

        const status = (formData.get("status") as TodoStatus) || "pending";
        const priority = (formData.get("priority") as TodoPriority) || "medium";

        const savedTask: IProjectTask = {
            id: task ? task.id : Date.now(),
            text,
            date: dateStr,
            status,
            priority,
            completed: status === "completed",
        };

        onSubmit(savedTask);
        if (dialogRef.current?.open) {
            dialogRef.current.close();
        }
        onClose();
    };

    return (
        <dialog
            ref={dialogRef}
            id="todo-form-modal"
            className="todo-modal-dialog"
            onCancel={(e) => {
                e.preventDefault();
                onClose();
            }}
        >
            <form onSubmit={handleSubmit} id="details-todo-form">
                <h2>{isEditing ? "Edit BIM Task / BCF Issue" : "New BIM Task / BCF Issue"}</h2>
                <div className="input-list">
                    <div className="form-field">
                        <label>
                            <span className="material-icons-round">assignment</span> Task Description
                        </label>
                        <input
                            name="text"
                            type="text"
                            placeholder="e.g. Verify structural column reinforcement on Level 02"
                            defaultValue={task?.text || ""}
                            required
                        />
                    </div>

                    <div className="form-row-2col">
                        <div className="form-field">
                            <label>
                                <span className="material-icons-round">event</span> Due Date
                            </label>
                            <input
                                name="date"
                                type="date"
                                lang="en-US"
                                defaultValue={new Date().toISOString().split("T")[0]}
                            />
                        </div>

                        <div className="form-field">
                            <label>
                                <span className="material-icons-round">flag</span> Status
                            </label>
                            <select name="status" defaultValue={task?.status || "pending"}>
                                <option value="pending">Pending</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-field">
                        <label>
                            <span className="material-icons-round">priority_high</span> Priority
                        </label>
                        <select name="priority" defaultValue={task?.priority || "medium"}>
                            <option value="low">🟢 Low Priority</option>
                            <option value="medium">🟡 Medium Priority</option>
                            <option value="high">🟠 High Priority</option>
                            <option value="critical">🔴 Critical (Urgent Clash / BCF)</option>
                        </select>
                    </div>
                </div>

                <div className="form-actions">
                    <button
                        type="button"
                        onClick={() => {
                            if (dialogRef.current?.open) {
                                dialogRef.current.close();
                            }
                            onClose();
                        }}
                        className="btn-cancel"
                    >
                        Cancel
                    </button>
                    <button type="submit" className="btn-accept">
                        {isEditing ? "Save Task" : "Add Task"}
                    </button>
                </div>
            </form>
        </dialog>
    );
}
