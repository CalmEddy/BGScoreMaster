import { useState } from "react";
import { createId } from "../lib/id";
import { VariableDefinition } from "../state/types";
import { getAllCommonVariables, getVariablesByCategory } from "../lib/templateLibrary";

const VariableBuilder = ({
  variables,
  onChange,
}: {
  variables: VariableDefinition[];
  onChange: (variables: VariableDefinition[]) => void;
}) => {
  const [showCommon, setShowCommon] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [newVar, setNewVar] = useState<Partial<VariableDefinition>>({
    type: "number",
    defaultValue: 0,
  });

  const commonVariables = getAllCommonVariables();
  const commonByCategory = getVariablesByCategory(selectedCategory);

  const handleAddCommon = (commonVar: VariableDefinition) => {
    // Check if already added
    if (variables.find((v) => v.id === commonVar.id)) {
      alert("This variable is already added");
      return;
    }
    onChange([...variables, { ...commonVar }]);
  };

  const handleAddCustom = () => {
    if (!newVar.name?.trim()) {
      alert("Please enter a variable name");
      return;
    }
    const variable: VariableDefinition = {
      id: createId(),
      name: newVar.name.trim(),
      type: (newVar.type || "number") as VariableDefinition["type"],
      defaultValue: newVar.defaultValue,
      min: newVar.min,
      max: newVar.max,
      options: newVar.options,
      category: newVar.category,
      icon: newVar.icon,
      description: newVar.description,
    };
    onChange([...variables, variable]);
    setNewVar({ type: "number", defaultValue: 0 });
  };

  const handleUpdate = (id: string, updates: Partial<VariableDefinition>) => {
    onChange(variables.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  };

  const handleRemove = (id: string) => {
    if (!window.confirm("Remove this variable?")) return;
    onChange(variables.filter((v) => v.id !== id));
  };

  const groupedVariables = variables.reduce((acc, v) => {
    const cat = v.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(v);
    return acc;
  }, {} as Record<string, VariableDefinition[]>);

  return (
    <div className="stack">
      <div className="card stack">
        <div className="inline" style={{ justifyContent: "space-between" }}>
          <div className="card-title">Add Common Variables</div>
          <button className="button secondary" onClick={() => setShowCommon(!showCommon)}>
            {showCommon ? "Hide" : "Show"} Common
          </button>
        </div>
        {showCommon && (
          <div className="stack">
            <select
              className="input"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="Resources">Resources</option>
              <option value="Victory Points">Victory Points</option>
              <option value="Cards">Cards</option>
              <option value="Dice">Dice</option>
              <option value="Tracks">Tracks</option>
              <option value="Tokens">Tokens</option>
              <option value="Sets">Sets</option>
              <option value="Time">Time</option>
              <option value="Status">Status</option>
            </select>
            <div className="list" style={{ maxHeight: "300px", overflowY: "auto" }}>
              {(selectedCategory === "all" ? commonVariables : commonByCategory)
                .filter((v) => !variables.find((existing) => existing.id === v.id))
                .map((commonVar) => (
                  <div key={commonVar.id} className="card inline" style={{ justifyContent: "space-between" }}>
                    <div>
                      {commonVar.icon && <span style={{ marginRight: "8px" }}>{commonVar.icon}</span>}
                      <strong>{commonVar.name}</strong>
                      <span className="badge" style={{ marginLeft: "8px", fontSize: "0.75rem" }}>
                        {commonVar.type}
                      </span>
                      {commonVar.description && (
                        <p style={{ fontSize: "0.875rem", margin: "4px 0", color: "#6b7280" }}>
                          {commonVar.description}
                        </p>
                      )}
                    </div>
                    <button className="button secondary" onClick={() => handleAddCommon(commonVar)}>
                      Add
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="card stack">
        <div className="card-title">Add Custom Variable</div>
        <div className="stack">
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              value={newVar.name || ""}
              onChange={(e) => setNewVar({ ...newVar, name: e.target.value })}
              placeholder="Variable name"
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={newVar.type || "number"}
              onChange={(e) => setNewVar({ ...newVar, type: e.target.value as VariableDefinition["type"] })}
            >
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="string">String</option>
              <option value="resource">Resource</option>
              <option value="territory">Territory</option>
              <option value="card">Card</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          {newVar.type === "number" && (
            <div className="inline">
              <div style={{ flex: 1 }}>
                <label className="label">Default Value</label>
                <input
                  className="input"
                  type="number"
                  value={newVar.defaultValue || 0}
                  onChange={(e) => setNewVar({ ...newVar, defaultValue: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Min</label>
                <input
                  className="input"
                  type="number"
                  value={newVar.min ?? ""}
                  onChange={(e) => setNewVar({ ...newVar, min: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Optional"
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Max</label>
                <input
                  className="input"
                  type="number"
                  value={newVar.max ?? ""}
                  onChange={(e) => setNewVar({ ...newVar, max: e.target.value ? parseFloat(e.target.value) : undefined })}
                  placeholder="Optional"
                />
              </div>
            </div>
          )}
          <div>
            <label className="label">Category</label>
            <input
              className="input"
              value={newVar.category || ""}
              onChange={(e) => setNewVar({ ...newVar, category: e.target.value })}
              placeholder="e.g., Resources, Victory Points"
            />
          </div>
          <div>
            <label className="label">Icon (emoji)</label>
            <input
              className="input"
              value={newVar.icon || ""}
              onChange={(e) => setNewVar({ ...newVar, icon: e.target.value })}
              placeholder="🎲 (optional)"
              maxLength={2}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={2}
              value={newVar.description || ""}
              onChange={(e) => setNewVar({ ...newVar, description: e.target.value })}
              placeholder="Optional description"
            />
          </div>
          <button className="button" onClick={handleAddCustom}>
            Add Custom Variable
          </button>
        </div>
      </div>

      <div className="card stack">
        <div className="card-title">Defined Variables</div>
        {variables.length === 0 ? (
          <p>No variables defined yet.</p>
        ) : (
          Object.entries(groupedVariables).map(([category, vars]) => (
            <div key={category} style={{ marginBottom: "16px" }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "1rem" }}>{category}</h4>
              <div className="list">
                {vars.map((variable) => (
                  <div key={variable.id} className="card inline" style={{ justifyContent: "space-between" }}>
                    <div>
                      {variable.icon && <span style={{ marginRight: "8px" }}>{variable.icon}</span>}
                      <strong>{variable.name}</strong>
                      <span className="badge" style={{ marginLeft: "8px", fontSize: "0.75rem" }}>
                        {variable.type}
                      </span>
                      {variable.description && (
                        <p style={{ fontSize: "0.875rem", margin: "4px 0", color: "#6b7280" }}>
                          {variable.description}
                        </p>
                      )}
                      {variable.defaultValue !== undefined && (
                        <small style={{ color: "#9ca3af" }}>Default: {String(variable.defaultValue)}</small>
                      )}
                    </div>
                    <button className="button danger" onClick={() => handleRemove(variable.id)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VariableBuilder;

