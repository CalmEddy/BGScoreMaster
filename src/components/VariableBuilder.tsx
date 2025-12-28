import { useState } from "react";
import { createId } from "../lib/id";
import { VariableDefinition, VariableOwnership, VariableActiveWindow, ID } from "../state/types";
import { getAllCommonVariables, getVariablesByCategory } from "../lib/templateLibrary";
import FormulaEditor from "./FormulaEditor";
import SetElementManager from "./SetElementManager";

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
    
    // Validate set configuration
    if (newVar.type === "set" && !newVar.setType) {
      alert("Please select a set type (identical or elements)");
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
      ownership: newVar.ownership,
      activeWindow: newVar.activeWindow,
      calculation: newVar.calculation,
      scoreImpact: newVar.scoreImpact,
      state: newVar.state,
      // Set-specific properties
      setType: newVar.setType,
      setElements: newVar.setElements,
      setElementTemplate: newVar.setElementTemplate,
      setIds: newVar.setIds,
    };
    onChange([...variables, variable]);
    setNewVar({ type: "number", defaultValue: 0 });
  };
  
  const handleCreateSetElement = (elementDef: VariableDefinition) => {
    // Add the new element variable to the variables array
    onChange([...variables, elementDef]);
  };

  const handleUpdate = (id: string, updates: Partial<VariableDefinition>) => {
    const updated = variables.map((v) => {
      if (v.id === id) {
        const updatedVar = { ...v, ...updates };
        
        // If updating setElements, also update setIds on element variables
        if (updates.setElements !== undefined) {
          // Update setIds on all affected element variables
          const allVars = variables.map((varItem) => {
            const isElement = updates.setElements?.includes(varItem.id);
            const wasElement = v.setElements?.includes(varItem.id);
            
            if (isElement && !wasElement) {
              // Element was added to set
              return {
                ...varItem,
                setIds: [...(varItem.setIds || []), id].filter((id, idx, arr) => arr.indexOf(id) === idx),
              };
            } else if (!isElement && wasElement) {
              // Element was removed from set
              return {
                ...varItem,
                setIds: (varItem.setIds || []).filter((setId) => setId !== id),
              };
            }
            return varItem;
          });
          
          // Replace variables with updated ones
          const setVarIndex = allVars.findIndex((v) => v.id === id);
          if (setVarIndex >= 0) {
            allVars[setVarIndex] = updatedVar;
          }
          onChange(allVars);
          return updatedVar;
        }
        
        return updatedVar;
      }
      return v;
    });
    
    if (updates.setElements === undefined) {
      onChange(updated);
    }
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
              onChange={(e) => {
                const newType = e.target.value as VariableDefinition["type"];
                // Reset set-specific properties when changing away from set type
                if (newType !== "set") {
                  setNewVar({ ...newVar, type: newType, setType: undefined, setElements: undefined, setElementTemplate: undefined });
                } else {
                  setNewVar({ ...newVar, type: newType });
                }
              }}
            >
              <option value="number">Number</option>
              <option value="boolean">Boolean</option>
              <option value="string">String</option>
              <option value="resource">Resource</option>
              <option value="territory">Territory</option>
              <option value="card">Card</option>
              <option value="custom">Custom</option>
              <option value="set">Set</option>
            </select>
          </div>
          {newVar.type === "set" && (
            <div className="stack">
              <div>
                <label className="label">Set Type *</label>
                <select
                  className="input"
                  value={newVar.setType || ""}
                  onChange={(e) => {
                    const setType = e.target.value as "identical" | "elements";
                    setNewVar({
                      ...newVar,
                      setType,
                      // Reset set-specific properties when changing set type
                      setElements: setType === "elements" ? (newVar.setElements || []) : undefined,
                      setElementTemplate: setType === "identical" ? (newVar.setElementTemplate || {
                        id: createId(),
                        name: "",
                        type: "resource",
                      }) : undefined,
                    });
                  }}
                >
                  <option value="">Select set type...</option>
                  <option value="identical">Identical Elements (count-based)</option>
                  <option value="elements">Different Elements (element collection)</option>
                </select>
              </div>
              {newVar.setType === "identical" && (
                <div className="card stack" style={{ background: "#f9fafb" }}>
                  <div className="card-title">Element Template</div>
                  <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    Define the template for identical elements in this set (e.g., "Wood", "Energy Card")
                  </p>
                  <div>
                    <label className="label">Element Name *</label>
                    <input
                      className="input"
                      value={newVar.setElementTemplate?.name || ""}
                      onChange={(e) =>
                        setNewVar({
                          ...newVar,
                          setElementTemplate: {
                            ...(newVar.setElementTemplate || { id: createId(), name: "", type: "resource" }),
                            name: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., Wood, Energy Card"
                    />
                  </div>
                  <div>
                    <label className="label">Element Type</label>
                    <select
                      className="input"
                      value={newVar.setElementTemplate?.type || "resource"}
                      onChange={(e) =>
                        setNewVar({
                          ...newVar,
                          setElementTemplate: {
                            ...(newVar.setElementTemplate || { id: createId(), name: "", type: "resource" }),
                            type: e.target.value as any,
                          },
                        })
                      }
                    >
                      <option value="resource">Resource</option>
                      <option value="card">Card</option>
                      <option value="number">Number</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Element Icon (emoji)</label>
                    <input
                      className="input"
                      value={newVar.setElementTemplate?.icon || ""}
                      onChange={(e) =>
                        setNewVar({
                          ...newVar,
                          setElementTemplate: {
                            ...(newVar.setElementTemplate || { id: createId(), name: "", type: "resource" }),
                            icon: e.target.value || undefined,
                          },
                        })
                      }
                      placeholder="🪵 (optional)"
                      maxLength={2}
                    />
                  </div>
                </div>
              )}
              {newVar.setType === "elements" && (
                <SetElementManager
                  setVariable={{
                    ...newVar,
                    id: "temp-set-id",
                    name: newVar.name || "",
                    type: "set",
                  } as VariableDefinition}
                  allVariables={variables}
                  onUpdate={(updates) => {
                    setNewVar({ ...newVar, ...updates });
                  }}
                  onCreateElement={handleCreateSetElement}
                />
              )}
              <div>
                <label className="label">Default Count/Value</label>
                <input
                  className="input"
                  type="number"
                  value={newVar.defaultValue ?? 0}
                  onChange={(e) => setNewVar({ ...newVar, defaultValue: parseFloat(e.target.value) || 0 })}
                  placeholder="Default count for identical sets, 0 for elements sets"
                />
              </div>
            </div>
          )}
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
          
          <div>
            <label className="label">Ownership</label>
            <select
              className="input"
              value={
                typeof newVar.ownership === "object" && newVar.ownership?.type === "variable"
                  ? "variable"
                  : newVar.ownership || "player"
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === "variable") {
                  setNewVar({ ...newVar, ownership: { type: "variable", variableId: "" } });
                } else {
                  setNewVar({ ...newVar, ownership: val as VariableOwnership });
                }
              }}
            >
              <option value="player">Player</option>
              <option value="global">Global</option>
              <option value="inactive">Inactive</option>
              <option value="variable">Variable Reference</option>
            </select>
            {typeof newVar.ownership === "object" && newVar.ownership?.type === "variable" && (
              <select
                className="input"
                style={{ marginTop: "8px" }}
                value={newVar.ownership.variableId}
                onChange={(e) =>
                  setNewVar({
                    ...newVar,
                    ownership: { type: "variable", variableId: e.target.value },
                  })
                }
              >
                <option value="">Select variable...</option>
                {variables.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="label">Active Window</label>
            <select
              className="input"
              value={
                typeof newVar.activeWindow === "object" && newVar.activeWindow?.type
                  ? newVar.activeWindow.type
                  : newVar.activeWindow || "always"
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === "round") {
                  setNewVar({ ...newVar, activeWindow: { type: "round" } });
                } else if (val === "phase") {
                  setNewVar({ ...newVar, activeWindow: { type: "phase" } });
                } else if (val === "variable") {
                  setNewVar({ ...newVar, activeWindow: { type: "variable", variableId: "" } });
                } else {
                  setNewVar({ ...newVar, activeWindow: val as VariableActiveWindow });
                }
              }}
            >
              <option value="always">Always</option>
              <option value="round">Round</option>
              <option value="phase">Phase</option>
              <option value="variable">Variable Reference</option>
            </select>
            {typeof newVar.activeWindow === "object" && newVar.activeWindow?.type === "variable" && (
              <select
                className="input"
                style={{ marginTop: "8px" }}
                value={newVar.activeWindow.variableId}
                onChange={(e) =>
                  setNewVar({
                    ...newVar,
                    activeWindow: { type: "variable", variableId: e.target.value },
                  })
                }
              >
                <option value="">Select variable...</option>
                {variables.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="label">Calculation Formula (optional)</label>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "8px" }}>
              Formula to compute this variable's value. Use {`{variableName}`} or {`{categoryName}`} to reference other values.
            </p>
            <FormulaEditor
              formula={newVar.calculation || ""}
              onChange={(formula) => setNewVar({ ...newVar, calculation: formula })}
              categories={{}}
              variables={variables}
            />
          </div>

          <div>
            <label className="label">Score Impact Formula (optional)</label>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "8px" }}>
              Formula that directly modifies player score. Creates ScoreEntry automatically when conditions are met.
            </p>
            <FormulaEditor
              formula={newVar.scoreImpact || ""}
              onChange={(formula) => setNewVar({ ...newVar, scoreImpact: formula })}
              categories={{}}
              variables={variables}
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
                  <div key={variable.id} className="card" style={{ marginBottom: "8px" }}>
                    <div className="inline" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
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
                        <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "4px" }}>
                          {variable.ownership && (
                            <span style={{ marginRight: "12px" }}>
                              Ownership: {typeof variable.ownership === "string" ? variable.ownership : "variable"}
                            </span>
                          )}
                          {variable.activeWindow && (
                            <span style={{ marginRight: "12px" }}>
                              Active: {typeof variable.activeWindow === "string" ? variable.activeWindow : variable.activeWindow.type}
                            </span>
                          )}
                          {variable.calculation && <span style={{ marginRight: "12px" }}>Has calculation</span>}
                          {variable.scoreImpact && <span>Has score impact</span>}
                        </div>
                        {variable.defaultValue !== undefined && (
                          <small style={{ color: "#9ca3af" }}>Default: {String(variable.defaultValue)}</small>
                        )}
                        {variable.type === "set" && (
                          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "4px" }}>
                            Set Type: {variable.setType || "not set"}
                            {variable.setType === "elements" && variable.setElements && (
                              <span> • {variable.setElements.length} elements</span>
                            )}
                            {variable.setType === "identical" && variable.setElementTemplate && (
                              <span> • Element: {variable.setElementTemplate.name}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <button className="button danger" onClick={() => handleRemove(variable.id)}>
                        Remove
                      </button>
                    </div>
                    {editing === variable.id && variable.type === "set" && variable.setType === "elements" && (
                      <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
                        <SetElementManager
                          setVariable={variable}
                          allVariables={variables}
                          onUpdate={(updates) => handleUpdate(variable.id, updates)}
                          onCreateElement={handleCreateSetElement}
                        />
                      </div>
                    )}
                    {editing === variable.id && (
                      <div className="stack" style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
                        <div>
                          <label className="label">Ownership</label>
                          <select
                            className="input"
                            value={
                              typeof variable.ownership === "object" && variable.ownership?.type === "variable"
                                ? "variable"
                                : variable.ownership || "player"
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "variable") {
                                handleUpdate(variable.id, { ownership: { type: "variable", variableId: "" } });
                              } else {
                                handleUpdate(variable.id, { ownership: val as VariableOwnership });
                              }
                            }}
                          >
                            <option value="player">Player</option>
                            <option value="global">Global</option>
                            <option value="inactive">Inactive</option>
                            <option value="variable">Variable Reference</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">Active Window</label>
                          <select
                            className="input"
                            value={
                              typeof variable.activeWindow === "object" && variable.activeWindow?.type
                                ? variable.activeWindow.type
                                : variable.activeWindow || "always"
                            }
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "round") {
                                handleUpdate(variable.id, { activeWindow: { type: "round" } });
                              } else if (val === "phase") {
                                handleUpdate(variable.id, { activeWindow: { type: "phase" } });
                              } else if (val === "variable") {
                                handleUpdate(variable.id, { activeWindow: { type: "variable", variableId: "" } });
                              } else {
                                handleUpdate(variable.id, { activeWindow: val as VariableActiveWindow });
                              }
                            }}
                          >
                            <option value="always">Always</option>
                            <option value="round">Round</option>
                            <option value="phase">Phase</option>
                            <option value="variable">Variable Reference</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">Calculation Formula</label>
                          <FormulaEditor
                            formula={variable.calculation || ""}
                            onChange={(formula) => handleUpdate(variable.id, { calculation: formula })}
                            categories={{}}
                            variables={variables}
                          />
                        </div>
                        <div>
                          <label className="label">Score Impact Formula</label>
                          <FormulaEditor
                            formula={variable.scoreImpact || ""}
                            onChange={(formula) => handleUpdate(variable.id, { scoreImpact: formula })}
                            categories={{}}
                            variables={variables}
                          />
                        </div>
                        <button className="button secondary" onClick={() => setEditing(null)}>
                          Done
                        </button>
                      </div>
                    )}
                    {editing !== variable.id && (
                      <button
                        className="button secondary"
                        style={{ marginTop: "8px" }}
                        onClick={() => setEditing(variable.id)}
                      >
                        Edit Advanced
                      </button>
                    )}
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

