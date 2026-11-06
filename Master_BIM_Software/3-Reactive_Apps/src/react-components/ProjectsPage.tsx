import * as React from "react";

// Lesson 3.3: Creating a ProjectsPage React component
export function ProjectsPage() {
    return (
        <div className="page" id="projects-page">
            {/* New / Edit Project Modal Dialog */}
            <dialog id="new-project-modal">
                <form id="new-project-form">
                    <h2 id="project-modal-title">New Project</h2>
                    <div className="input-list">
                        <div className="form-field">
                            <label>
                                <span className="material-icons-round">corporate_fare</span> Name
                            </label>
                            <input
                                name="name"
                                type="text"
                                id="project-name-input"
                                placeholder="Riverfront Promenade"
                                required
                            />
                            <p className="input-tip">TIP: Give it a short name (min. 5 chars).</p>
                        </div>

                        <div className="form-field">
                            <label>
                                <span className="material-icons-round">subject</span> Description
                            </label>
                            <textarea
                                name="description"
                                id="project-desc-input"
                                placeholder="Enter architectural & structural scope description..."
                                cols={30}
                                rows={3}
                                defaultValue={""}
                            />
                        </div>

                        <div className="form-row-2col">
                            <div className="form-field">
                                <label>
                                    <span className="material-icons-round">person</span> Role
                                </label>
                                <select name="userRole" id="project-role-input">
                                    <option value="Architect">Architect</option>
                                    <option value="Engineer">Engineer</option>
                                    <option value="Developer">Developer</option>
                                </select>
                            </div>

                            <div className="form-field">
                                <label>
                                    <span className="material-icons-round">help_outline</span> Status
                                </label>
                                <select name="status" id="project-status-input">
                                    <option value="Active">Active</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Finished">Finished</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-row-2col">
                            <div className="form-field">
                                <label>
                                    <span className="material-icons-round">payments</span> Cost ($)
                                </label>
                                <input
                                    name="cost"
                                    type="number"
                                    id="project-cost-input"
                                    min={0}
                                    step={1000}
                                    defaultValue={0}
                                />
                            </div>

                            <div className="form-field">
                                <label>
                                    <span className="material-icons-round">trending_up</span> Progress (%)
                                </label>
                                <input
                                    name="progress"
                                    type="number"
                                    id="project-progress-input"
                                    min={0}
                                    max={100}
                                    defaultValue={25}
                                />
                            </div>
                        </div>

                        <div className="form-row-2col">
                            <div className="form-field">
                                <label>
                                    <span className="material-icons-round">calendar_today</span> Finish Date
                                </label>
                                <input name="finishDate" type="date" id="project-date-input" />
                            </div>

                            <div className="form-field">
                                <label>
                                    <span className="material-icons-round">view_in_ar</span> 3D Model Type
                                </label>
                                <select name="modelType" id="project-model-input">
                                    <option value="cube">Cube Massing Model</option>
                                    <option value="gear">Mechanical Gear HVAC</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" id="cancel-btn" className="btn-cancel">
                            Cancel
                        </button>
                        <button type="submit" id="project-submit-btn" className="btn-accept">
                            Accept
                        </button>
                    </div>
                </form>
            </dialog>

            {/* Top Action Header */}
            <header id="main-header">
                <div className="header-title-box">
                    <span className="header-eyebrow">CDE WORKSPACE / MODELS</span>
                    <h2>BIM Projects</h2>
                </div>
                <div className="header-actions">
                    <button
                        className="btn-icon btn-action-tool"
                        id="import-projects-btn"
                        title="Import Projects (JSON)"
                    >
                        <span className="material-icons-round">upload_file</span>
                        <span className="btn-tool-label">Import JSON</span>
                    </button>
                    <button
                        className="btn-icon btn-action-tool"
                        id="export-projects-btn"
                        title="Export Projects (JSON)"
                    >
                        <span className="material-icons-round">file_download</span>
                        <span className="btn-tool-label">Export JSON</span>
                    </button>
                    <button className="btn-primary" id="new-project-btn">
                        <span className="material-icons-round">add</span>
                        <span>New Project</span>
                    </button>
                </div>
            </header>

            {/* Projects Search & Status Filter Toolbar */}
            <div className="projects-toolbar">
                <div className="search-input-pill projects-search-box">
                    <span className="material-icons-round">search</span>
                    <input
                        type="text"
                        id="project-search-input"
                        placeholder="Search projects by name, description, or role..."
                    />
                    <button
                        type="button"
                        className="btn-clear-search"
                        id="clear-search-btn"
                        title="Clear search text"
                        style={{ display: "none" }}
                    >
                        <span className="material-icons-round">close</span>
                    </button>
                </div>
                <div className="projects-filter-group" id="project-filter-group">
                    <button type="button" className="filter-pill active" data-status-filter="all">
                        All <span className="filter-count">0</span>
                    </button>
                    <button type="button" className="filter-pill" data-status-filter="active">
                        Active <span className="filter-count">0</span>
                    </button>
                    <button type="button" className="filter-pill" data-status-filter="pending">
                        Pending <span className="filter-count">0</span>
                    </button>
                    <button type="button" className="filter-pill" data-status-filter="finished">
                        Finished <span className="filter-count">0</span>
                    </button>
                </div>
                <div className="projects-sort-group">
                    <label htmlFor="project-sort-select" className="sort-label">
                        <span className="material-icons-round">sort</span>
                        <span>Sort:</span>
                    </label>
                    <select id="project-sort-select" className="sort-select">
                        <option value="name-asc">Name (A → Z)</option>
                        <option value="name-desc">Name (Z → A)</option>
                        <option value="cost-desc">Cost (High → Low)</option>
                        <option value="progress-desc">Progress (High → Low)</option>
                        <option value="date-asc">Finish Date (Earliest)</option>
                    </select>
                </div>
            </div>

            {/* Projects Grid (Dynamically populated by ProjectsManager) */}
            <section id="projects-list"></section>

            {/* Floating Export Button */}
            <button id="floating-export-btn" className="fab-btn" title="Export Projects">
                <span className="material-icons-round">download</span>
            </button>
        </div>
    );
}

