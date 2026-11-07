import * as React from "react";
import { updateDocument } from "../../core/database";
import { IProject, IProjectTask, Project, TodoPriority, TodoStatus } from "../../classes/Project";
import { ProjectTaskCard } from "./ProjectTaskCard";
import { TodoForm } from "./TodoForm";
import { SearchBox } from "../SearchBox";

export interface ProjectTasksListProps {
    project: Project;
    onTodosUpdated?: () => void;
}

/**
 * Module 3 Challenge: ProjectTasksList Component
 * - Manages BIM Tasks & BCF Issues list in the Project Details Page.
 * - Integrates reusable <SearchBox /> from Lesson 3.11.
 * - Houses nested <TodoForm /> for creating and editing tasks.
 * - Synchronizes all task state changes (create, edit, delete, status cycle) to Cloud Firestore.
 */
export function ProjectTasksList(props: ProjectTasksListProps) {
    const { project, onTodosUpdated } = props;

    const [todoSearch, setTodoSearch] = React.useState("");
    const [editingTodoId, setEditingTodoId] = React.useState<number | null>(null);
    const [isTodoModalOpen, setIsTodoModalOpen] = React.useState(false);

    // Synchronize tasks array to Cloud Firestore
    const syncTodosToFirestore = async (newTodos: IProjectTask[]) => {
        project.todos = newTodos;
        try {
            await updateDocument<IProject>("projects", project.id, {
                todos: newTodos,
            });
        } catch (err) {
            console.error("Failed to sync ToDos to Cloud Firestore:", err);
        }
        if (onTodosUpdated) onTodosUpdated();
    };

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
        ? project.todos.find((t) => t.id === editingTodoId) || null
        : null;

    // Handle create & update from TodoForm
    const onSaveTodo = (savedTask: IProjectTask) => {
        let updatedTodos: IProjectTask[];
        if (editingTodoId !== null) {
            updatedTodos = project.todos.map((t) =>
                t.id === editingTodoId ? savedTask : t
            );
        } else {
            updatedTodos = [...project.todos, savedTask];
        }
        syncTodosToFirestore(updatedTodos);
    };

    const statusCycle: Record<TodoStatus, TodoStatus> = {
        "pending": "in-progress",
        "in-progress": "completed",
        "completed": "pending",
    };

    const onToggleStatus = (todoId: number) => {
        const updatedTodos = project.todos.map((t) => {
            if (t.id === todoId) {
                const currentStatus: TodoStatus = t.status || (t.completed ? "completed" : "pending");
                const nextStatus = statusCycle[currentStatus];
                return {
                    ...t,
                    status: nextStatus,
                    completed: nextStatus === "completed",
                };
            }
            return t;
        });
        syncTodosToFirestore(updatedTodos);
    };

    const onDeleteTodo = (todoId: number) => {
        const updatedTodos = project.todos.filter((t) => t.id !== todoId);
        syncTodosToFirestore(updatedTodos);
    };

    // Filter by task description, status, or priority
    const q = todoSearch.toLowerCase().trim();
    const filteredTodos = q
        ? project.todos.filter((t) => {
              const textMatch = t.text.toLowerCase().includes(q);
              const statusMatch = (t.status || "").toLowerCase().includes(q);
              const priorityMatch = (t.priority || "").toLowerCase().includes(q);
              return textMatch || statusMatch || priorityMatch;
          })
        : project.todos;

    return (
        <div className="todos-container">
            <div className="todos-header-row">
                <div className="todos-title-wrap">
                    <h4>To-Do & BCF Issues</h4>
                    <span className="todo-count-badge" id="todo-count-badge">
                        {project.todos.length}
                    </span>
                </div>
                <div className="todos-actions-group" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {/* Integrated reusable SearchBox component from Lesson 3.11 */}
                    <SearchBox
                        placeholder="Search tasks by text, status, priority..."
                        onChange={(value) => setTodoSearch(value)}
                    />
                    <button
                        type="button"
                        className="btn-icon-box"
                        id="add-todo-btn"
                        title="Add Task / BCF Issue"
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
                        {q
                            ? `No tasks match "${todoSearch}". Try a different keyword.`
                            : "No tasks created yet. Click + to add your first BIM task."}
                    </div>
                ) : (
                    filteredTodos.map((todo) => (
                        <ProjectTaskCard
                            key={todo.id}
                            todo={todo}
                            onToggleStatus={onToggleStatus}
                            onEdit={onOpenEditTodo}
                            onDelete={onDeleteTodo}
                        />
                    ))
                )}
            </div>

            {/* Reusable ToDo Form Component */}
            <TodoForm
                task={editingTodo}
                isOpen={isTodoModalOpen}
                onClose={onCloseTodoModal}
                onSubmit={onSaveTodo}
            />
        </div>
    );
}

// Backward-compatible alias
export const TodoList = ProjectTasksList;

