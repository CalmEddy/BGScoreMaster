import { useMemo, useState } from "react";
import { AppState } from "../state/types";

const TemplateSelector = ({
  state,
  onSelectTemplate,
  onStartFromScratch,
  onCancel,
}: {
  state: AppState;
  onSelectTemplate: (templateId: string) => void;
  onStartFromScratch: () => void;
  onCancel: () => void;
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

  return (
    <div className="app">
      <div className="topbar">
        <button className="button ghost" onClick={onCancel}>
          Cancel
        </button>
        <h1>Select Scoring Template</h1>
        <button className="button secondary" onClick={onStartFromScratch}>
          Start from Scratch
        </button>
      </div>
      <div className="container stack">
        <div className="card stack">
          <div className="card-title">Choose a Template</div>
          <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            Select a pre-built scoring system template, or start from scratch to create a custom session.
          </p>
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

        {templates.length === 0 ? (
          <div className="card stack" style={{ textAlign: "center", padding: "32px" }}>
            <p style={{ fontSize: "1.1rem", marginBottom: "16px" }}>
              No templates available.
            </p>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "16px" }}>
              Create templates in Builder Mode, or start from scratch.
            </p>
            <button className="button" onClick={onStartFromScratch}>
              Start from Scratch
            </button>
          </div>
        ) : (
          <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {templates.map((template) => (
              <div key={template.id} className="card" style={{ cursor: "pointer" }} onClick={() => onSelectTemplate(template.id)}>
                <div className="inline" style={{ gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                  {template.icon && <span style={{ fontSize: "2rem" }}>{template.icon}</span>}
                  <div style={{ flex: 1 }}>
                    <strong>{template.name}</strong>
                    <span className="badge" style={{ marginLeft: "8px" }}>{template.gameType}</span>
                  </div>
                </div>
                {template.description && (
                  <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "8px 0" }}>
                    {template.description}
                  </p>
                )}
                <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "8px" }}>
                  {template.categoryTemplates?.length || 0} categories • {template.ruleTemplates?.length || 0} rules • {template.objectDefinitions?.length || 0} objects
                </div>
                <button
                  className="button full"
                  style={{ marginTop: "12px" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectTemplate(template.id);
                  }}
                >
                  Use Template
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateSelector;
