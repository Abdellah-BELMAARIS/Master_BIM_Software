import * as React from "react";
import { IProjectTask, Project, TodoStatus } from "../../classes/Project";
import { TodoItem } from "./TodoItem";

export interface TodoListProps {
    project: Project;
    onTodosUpdated: () => void;
}

// Lesson 3.10 Modularity Challenge: Decomposed To-Do Tasks container component
export function TodoList(props: TodoListProps) {
    const { project, onTodosUpdated } = props;

    const [todoSearch, setTodoSearch] = React.useState("");
    const [editingTodoId, setEditingTodoId] = React.useState<number | null>(null);
    const [isTodoModalOpen, setIsTodoModalOpen] = React.useState(false);

    const onOpenAddTodo = () => {
        setEditingTodoId(null);
        setIsTodoModalOpen(true);
    };

    const onOpenEditTodo = (todoId: number) => {
        setEditingTodoId(todoId);
        setIsTodoModalOpen(true);
    };

    const onCloseTodoModal = () => {
        setEditingTodoId(null);
        setIsTodoModalOpen(false);
    };

    const editingTodo = editingTodoId !== null
        ? project.todos.find((t) => t.id === editingTodoId)
        : null;

    const onTodoSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const text = ((formData.get("text") as string) || "").trim();
        if (!text) { return; }

        const rawDateStr = formData.get("date") as string;
        const rawDate = rawDateStr ? new Date(rawDateStr) : new Date();
        const dateStr = isNaN(rawDate.getTime())
            ? new Date().toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })
            : rawDate.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
        const selectedStatus = ((formData.get("status") as TodoStatus) || "pending");

        if (editingTodoId !== null && editingTodo) {
            editingTodo.text = text;
            editingTodo.date = dateStr;
            editingTodo.status = selectedStatus;
            editingTodo.completed = selectedStatus === "completed";
        } else {
            project.todos.push({
                id: Date.now(),
                text,
                date: dateStr,
                status: selectedStatus,
                completed: selectedStatus === "completed",
            });
        }

        onCloseTodoModal();
        onTodosUpdated();
    };

    const statusCycle: Record<TodoStatus, TodoStatus> = {
        "pending": "in-progress",
        "in-progress": "completed",
        "completed": "pending",
    };

    const onToggleStatus = (todoId: number) => {
        const target = project.todos.find((t) => t.id === todoId);
        if (!target) { return; }
        const currentStatus: TodoStatus = target.status || (target.completed ? "completed" : "pending");
        const next = statusCycle[currentStatus];
        target.status = next;
        target.completed = next === "completed";
        onTodosUpdated();
    };

    const onDeleteTodo = (todoId: number) => {
        project.todos = project.todos.filter((t) => t.id !== todoId);
        onTodosUpdated();
    };

    const filteredTodos = todoSearch.trim()
        ? project.todos.filter(
              (t) =>
                  t.text.toLowerCase().includes(todoSearch.toLowerCase().trim()) ||
                  (t.status && t.status.toLowerCase().includes(todoSearch.toLowerCase().trim()))
          )
        : project.todos;

    return (
        <div className="todos-container">
            <div className="todos-header-row">
                <div className="todos-title-wrap">
                    <h4>To-Do</h4>
                    <span className="todo-count-badge" id="todo-count-badge">
                        {project.todos.length}
                    </span>
                </div>
                <div className="todos-actions-group">
                    <div className="search-input-pill">
                        <span className="material-icons-round">search</span>
                        <input
                            type="text"
                            id="todo-search-input"
                            placeholder="Search tasks..."
                            value={todoSearch}
                            onChange={(e) => setTodoSearch(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        className="btn-icon-box"
                        id="add-todo-btn"
                        title="Add Task"
                        onClick={onOpenAddTodo}
                    >
                        <span className="material-icons-round">add</span>
                    </button>
                </div>
            </div>

            {/* To-Do Items List */}
            <div className="todos-list" id="todos-list">
                {filteredTodos.length === 0 ? (
                    <div className="todo-empty-state">
                        No tasks match your filter. Click + to add a task.
                    </div>
                ) : (
                    filteredTodos.map((todo) => (
                        <TodoItem
                            key={todo.id}
                            todo={todo}
                            onToggleStatus={onToggleStatus}
                            onEdit={onOpenEditTodo}
                            onDelete={onDeleteTodo}
                        />
                    ))
                )}
            </div>

            {/* Add / Edit To-Do Modal */}
            {isTodoModalOpen && (
                <dialog id="details-todo-modal" open>
                    <form onSubmit={onTodoSubmit} id="details-todo-form">
                        <h2>{editingTodoId !== null ? "Edit Task / BCF Issue" : "New Task / BCF Issue"}</h2>
                        <div className="input-list">
                            <div className="form-field">
                                <label>
                                    <span className="material-icons-round">assignment</span> Task Description
                                </label>
                                <input
                                    name="text"
                                    id="details-todo-text"
                                    type="text"
                                    placeholder="e.g. Verify structural column grid on Level 02"
                                    defaultValue={editingTodo ? editingTodo.text : ""}
                                    required
                                />
                            </div>
                            <div className="form-row-2col">
                                <div className="form-field">
                                    <label>
                                        <span className="material-icons-round">event</span> Target Date
                                    </label>
                                    <input
                                        name="date"
                                        type="date"
                                        lang="en"
                                        defaultValue={new Date().toISOString().split("T")[0]}
                                    />
                                </div>
                                <div className="form-field">
                                    <label>
                                        <span className="material-icons-round">flag</span> Status
                                    </label>
                                    <select
                                        name="status"
                                        id="details-todo-status"
                                        defaultValue={editingTodo ? editingTodo.status : "pending"}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="in-progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="form-actions">
                            <button
                                type="button"
                                onClick={onCloseTodoModal}
                                className="btn-cancel"
                            >
                                Cancel
                            </button>
                            <button type="submit" className="btn-accept">
                                Save Task
                            </button>
                        </div>
                    </form>
                </dialog>
            )}
        </div>
    );
}

