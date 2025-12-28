import { useMemo, useState } from "react";
import { AppState, GameTemplate } from "../state/types";
import { createId } from "../lib/id";

const BuilderHome = ({
  state,
  onNewTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onDuplicateTemplate,
  onBack,
}: {
  state: AppState;
  onNewTemplate: () => void;
  onEditTemplate: (templateId: string) => void;
  onDeleteTemplate: (templateId: string) => void;
  onDuplicateTemplate: (templateId: string) => void;
  onBack?: () => void;
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  const templates = useMemo(() => {
    let filtered = Object.values(state.templates);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.gameType.toLowerCase().includes(query)
      );
    }

    if (filterType !== "all") {
      filtered = filtered.filter((t) => t.gameType === filterType);
    }

    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [state.templates, searchQuery, filterType]);

  const handleDelete = (template: GameTemplate) => {
    if (window.confirm(`Delete template "${template.name}"?`)) {
      onDeleteTemplate(template.id);
    }
  };

  const handleDuplicate = (template: GameTemplate) => {
    onDuplicateTemplate(template.id);
  };

  return (
    <div className="app">
      <div className="topbar">
        {onBack && (
          <button className="button ghost" onClick={onBack}>
            Home
          </button>
        )}
        <h1>Template Builder</h1>
        <button className="button" onClick={onNewTemplate}>
          + New Template
        </button>
      </div>
      <div className="container stack">
        <div className="card stack">
          <div className="inline" style={{ gap: "12px" }}>
            <input
              className="input"
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1 }}
            />
            <select
              className="input"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ width: "150px" }}
            >
              <option value="all">All Types</option>
              <option value="board">Board Games</option>
              <option value="card">Card Games</option>
              <option value="dice">Dice Games</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div className="card stack">
          <div className="card-title">Templates</div>
          {templates.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px" }}>
              <p style={{ fontSize: "1.1rem", marginBottom: "16px" }}>
                No templates yet. Create your first scoring system template!
              </p>
              <button className="button" onClick={onNewTemplate}>
                Create Template
              </button>
            </div>
          ) : (
            <div className="list">
              {templates.map((template) => (
                <div key={template.id} className="card" style={{ textAlign: "left" }}>
                  <div className="inline" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div className="inline" style={{ gap: "8px", marginBottom: "8px" }}>
                        {template.icon && <span style={{ fontSize: "1.5rem" }}>{template.icon}</span>}
                        <strong>{template.name}</strong>
                        <span className="badge">{template.gameType}</span>
                        {template.version && (
                          <span className="badge" style={{ fontSize: "0.75rem" }}>
                            v{template.version}
                          </span>
                        )}
                      </div>
                      {template.description && (
                        <p style={{ margin: "4px 0", fontSize: "0.875rem", color: "#6b7280" }}>
                          {template.description}
                        </p>
                      )}
                      <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "8px" }}>
                        {template.categoryTemplates?.length || 0} categories •{" "}
                        {template.ruleTemplates?.length || 0} rules •{" "}
                        {template.variableDefinitions?.length || 0} variables
                        {template.author && ` • by ${template.author}`}
                      </div>
                      <small style={{ color: "#9ca3af" }}>
                        Updated {new Date(template.updatedAt).toLocaleString()}
                      </small>
                    </div>
                    <div className="inline">
                      <button
                        className="button secondary"
                        onClick={() => onEditTemplate(template.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="button secondary"
                        onClick={() => handleDuplicate(template)}
                      >
                        Duplicate
                      </button>
                      <button
                        className="button danger"
                        onClick={() => handleDelete(template)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuilderHome;

