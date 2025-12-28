import { useState } from "react";
import { createId } from "../lib/id";
import { GameObjectDefinition, GameObjectOwnership, GameObjectActiveWindow } from "../state/types";
import { getAllCommonObjects, getObjectsByCategory } from "../lib/objectLibrary";
import FormulaEditor from "./FormulaEditor";
import SetElementManager from "./SetElementManager";

const ObjectBuilder = ({
  objects,
  onChange,
}: {
  objects: GameObjectDefinition[];
  onChange: (objects: GameObjectDefinition[]) => void;
}) => {
  const [showCommon, setShowCommon] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [newVar, setNewVar] = useState<Partial<GameObjectDefinition>>({
    type: "number",
    defaultValue: 0,
  });
  const ownershipSelectValue =
    typeof newVar.ownership === "object" ? "object" : newVar.ownership ?? "player";
  const activeWindowSelectValue =
    typeof newVar.activeWindow === "object" ? newVar.activeWindow.type : newVar.activeWindow ?? "always";

  const commonObjects = getAllCommonObjects();
  const commonByCategory = getObjectsByCategory(selectedCategory);

  const handleAddCommon = (commonObj: GameObjectDefinition) => {
    // Check if already added
    if (objects.find((v) => v.id === commonObj.id)) {
      alert("This object is already added");
      return;
    }
    onChange([...objects, { ...commonObj }]);
  };

  const handleAddCustom = () => {
    if (!newVar.name?.trim()) {
      alert("Please enter an object name");
      return;
    }
    
    // Validate set configuration
    if (newVar.type === "set" && !newVar.setType) {
      alert("Please select a set type (identical or elements)");
      return;
    }
    
    const objectDefinition: GameObjectDefinition = {
      id: createId(),
      name: newVar.name.trim(),
      type: (newVar.type || "number") as GameObjectDefinition["type"],
      defaultValue: newVar.defaultValue,
      min: newVar.min,
      max: newVar.max,
      options: newVar.options,
      category: newVar.category ?? "Custom",
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
    onChange([...objects, objectDefinition]);
    setNewVar({ type: "number", defaultValue: 0 });
  };
  
  const handleCreateSetElement = (elementDef: GameObjectDefinition) => {
    // Add the new element object to the objects array
    onChange([...objects, elementDef]);
  };

  const handleUpdate = (id: string, updates: Partial<GameObjectDefinition>) => {
    const updated = objects.map((v) => {
      if (v.id === id) {
        const updatedVar = { ...v, ...updates };
        
        // If updating setElements, also update setIds on element objects
        if (updates.setElements !== undefined) {
          // Update setIds on all affected element objects
          const allVars = objects.map((varItem) => {
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
          
          // Replace objects with updated ones
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
    if (!window.confirm("Remove this object?")) return;
    onChange(objects.filter((v) => v.id !== id));
  };

  const groupedObjects = objects.reduce((acc, v) => {
    const cat = v.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(v);
    return acc;
  }, {} as Record<string, GameObjectDefinition[]>);

  return (
    <div className="stack">
      <div className="card stack">
        <div className="inline" style={{ justifyContent: "space-between" }}>
          <div className="card-title">Add Common Objects</div>
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
              {(selectedCategory === "all" ? commonObjects : commonByCategory)
                .filter((v) => !objects.find((existing) => existing.id === v.id))
                .map((commonObj) => (
                  <div key={commonObj.id} className="card inline" style={{ justifyContent: "space-between" }}>
                    <div>
                      {commonObj.icon && <span style={{ marginRight: "8px" }}>{commonObj.icon}</span>}
                      <strong>{commonObj.name}</strong>
                      <span className="badge" style={{ marginLeft: "8px", fontSize: "0.75rem" }}>
                        {commonObj.type}
                      </span>
                      {commonObj.description && (
                        <p style={{ fontSize: "0.875rem", margin: "4px 0", color: "#6b7280" }}>
                          {commonObj.description}
                        </p>
                      )}
                    </div>
                    <button className="button secondary" onClick={() => handleAddCommon(commonObj)}>
                      Add
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="card stack">
        <div className="card-title">Add Custom Object</div>
        <div className="stack">
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              value={newVar.name || ""}
              onChange={(e) => setNewVar({ ...newVar, name: e.target.value })}
              placeholder="Object name"
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={newVar.type || "number"}
              onChange={(e) => {
                const newType = e.target.value as GameObjectDefinition["type"];
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
                        category: newVar.category ?? "Custom",
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
                            ...(newVar.setElementTemplate || { id: createId(), name: "", type: "resource", category: newVar.category ?? "Custom" }),
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
                            ...(newVar.setElementTemplate || { id: createId(), name: "", type: "resource", category: newVar.category ?? "Custom" }),
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
                            ...(newVar.setElementTemplate || { id: createId(), name: "", type: "resource", category: newVar.category ?? "Custom" }),
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
                  setObject={{
                    ...newVar,
                    id: "temp-set-id",
                    name: newVar.name || "",
                    type: "set",
                  } as GameObjectDefinition}
                  allObjects={objects}
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
              value={ownershipSelectValue}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "object") {
                  setNewVar({ ...newVar, ownership: { type: "object", objectId: "" } });
                } else {
                  setNewVar({ ...newVar, ownership: val as GameObjectOwnership });
                }
              }}
            >
              <option value="player">Player</option>
              <option value="global">Global</option>
              <option value="inactive">Inactive</option>
              <option value="object">Object Reference</option>
            </select>
            {typeof newVar.ownership === "object" && newVar.ownership?.type === "object" && (
              <select
                className="input"
                style={{ marginTop: "8px" }}
                value={newVar.ownership.objectId}
                onChange={(e) =>
                  setNewVar({
                    ...newVar,
                    ownership: { type: "object", objectId: e.target.value },
                  })
                }
              >
                <option value="">Select object...</option>
                {objects.map((v) => (
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
              value={activeWindowSelectValue}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "round") {
                  setNewVar({ ...newVar, activeWindow: { type: "round" } });
                } else if (val === "phase") {
                  setNewVar({ ...newVar, activeWindow: { type: "phase" } });
                } else if (val === "object") {
                  setNewVar({ ...newVar, activeWindow: { type: "object", objectId: "" } });
                } else {
                  setNewVar({ ...newVar, activeWindow: val as GameObjectActiveWindow });
                }
              }}
            >
              <option value="always">Always</option>
              <option value="round">Round</option>
              <option value="phase">Phase</option>
              <option value="object">Object Reference</option>
            </select>
            {typeof newVar.activeWindow === "object" && newVar.activeWindow?.type === "object" && (
              <select
                className="input"
                style={{ marginTop: "8px" }}
                value={newVar.activeWindow.objectId}
                onChange={(e) =>
                  setNewVar({
                    ...newVar,
                    activeWindow: { type: "object", objectId: e.target.value },
                  })
                }
              >
                <option value="">Select object...</option>
                {objects.map((v) => (
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
              Formula to compute this object's value. Use {`{objectName}`} or {`{categoryName}`} to reference other values.
            </p>
            <FormulaEditor
              formula={newVar.calculation || ""}
              onChange={(formula) => setNewVar({ ...newVar, calculation: formula })}
              categories={{}}
              objects={objects}
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
              objects={objects}
            />
          </div>

          <button className="button" onClick={handleAddCustom}>
            Add Custom Object
          </button>
        </div>
      </div>

      <div className="card stack">
        <div className="card-title">Defined Objects</div>
        {objects.length === 0 ? (
          <p>No objects defined yet.</p>
        ) : (
          Object.entries(groupedObjects).map(([category, vars]) => (
            <div key={category} style={{ marginBottom: "16px" }}>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "1rem" }}>{category}</h4>
              <div className="list">
                {vars.map((objectDefinition) => {
                  const editOwnershipValue =
                    typeof objectDefinition.ownership === "object" ? "object" : objectDefinition.ownership ?? "player";
                  const editActiveWindowValue =
                    typeof objectDefinition.activeWindow === "object"
                      ? objectDefinition.activeWindow.type
                      : objectDefinition.activeWindow ?? "always";

                  return (
                    <div key={objectDefinition.id} className="card" style={{ marginBottom: "8px" }}>
                    <div className="inline" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        {objectDefinition.icon && <span style={{ marginRight: "8px" }}>{objectDefinition.icon}</span>}
                        <strong>{objectDefinition.name}</strong>
                        <span className="badge" style={{ marginLeft: "8px", fontSize: "0.75rem" }}>
                          {objectDefinition.type}
                        </span>
                        {objectDefinition.description && (
                          <p style={{ fontSize: "0.875rem", margin: "4px 0", color: "#6b7280" }}>
                            {objectDefinition.description}
                          </p>
                        )}
                        <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "4px" }}>
                          {objectDefinition.ownership && (
                            <span style={{ marginRight: "12px" }}>
                              Ownership: {typeof objectDefinition.ownership === "string" ? objectDefinition.ownership : "object"}
                            </span>
                          )}
                          {objectDefinition.activeWindow && (
                            <span style={{ marginRight: "12px" }}>
                              Active: {typeof objectDefinition.activeWindow === "string" ? objectDefinition.activeWindow : objectDefinition.activeWindow.type}
                            </span>
                          )}
                          {objectDefinition.calculation && <span style={{ marginRight: "12px" }}>Has calculation</span>}
                          {objectDefinition.scoreImpact && <span>Has score impact</span>}
                        </div>
                        {objectDefinition.defaultValue !== undefined && (
                          <small style={{ color: "#9ca3af" }}>Default: {String(objectDefinition.defaultValue)}</small>
                        )}
                        {objectDefinition.type === "set" && (
                          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "4px" }}>
                            Set Type: {objectDefinition.setType || "not set"}
                            {objectDefinition.setType === "elements" && objectDefinition.setElements && (
                              <span> • {objectDefinition.setElements.length} elements</span>
                            )}
                            {objectDefinition.setType === "identical" && objectDefinition.setElementTemplate && (
                              <span> • Element: {objectDefinition.setElementTemplate.name}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <button className="button danger" onClick={() => handleRemove(objectDefinition.id)}>
                        Remove
                      </button>
                    </div>
                    {editing === objectDefinition.id && objectDefinition.type === "set" && objectDefinition.setType === "elements" && (
                      <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
                        <SetElementManager
                          setObject={objectDefinition}
                          allObjects={objects}
                          onUpdate={(updates) => handleUpdate(objectDefinition.id, updates)}
                          onCreateElement={handleCreateSetElement}
                        />
                      </div>
                    )}
                    {editing === objectDefinition.id && (
                      <div className="stack" style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
                        <div>
                          <label className="label">Ownership</label>
                          <select
                            className="input"
                            value={editOwnershipValue}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "object") {
                                handleUpdate(objectDefinition.id, { ownership: { type: "object", objectId: "" } });
                              } else {
                                handleUpdate(objectDefinition.id, { ownership: val as GameObjectOwnership });
                              }
                            }}
                          >
                            <option value="player">Player</option>
                            <option value="global">Global</option>
                            <option value="inactive">Inactive</option>
                            <option value="object">Object Reference</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">Active Window</label>
                          <select
                            className="input"
                            value={editActiveWindowValue}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "round") {
                                handleUpdate(objectDefinition.id, { activeWindow: { type: "round" } });
                              } else if (val === "phase") {
                                handleUpdate(objectDefinition.id, { activeWindow: { type: "phase" } });
                              } else if (val === "object") {
                                handleUpdate(objectDefinition.id, { activeWindow: { type: "object", objectId: "" } });
                              } else {
                                handleUpdate(objectDefinition.id, { activeWindow: val as GameObjectActiveWindow });
                              }
                            }}
                          >
                            <option value="always">Always</option>
                            <option value="round">Round</option>
                            <option value="phase">Phase</option>
                            <option value="object">Object Reference</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">Calculation Formula</label>
                          <FormulaEditor
                            formula={objectDefinition.calculation || ""}
                            onChange={(formula) => handleUpdate(objectDefinition.id, { calculation: formula })}
                            categories={{}}
                            objects={objects}
                          />
                        </div>
                        <div>
                          <label className="label">Score Impact Formula</label>
                          <FormulaEditor
                            formula={objectDefinition.scoreImpact || ""}
                            onChange={(formula) => handleUpdate(objectDefinition.id, { scoreImpact: formula })}
                            categories={{}}
                            objects={objects}
                          />
                        </div>
                        <button className="button secondary" onClick={() => setEditing(null)}>
                          Done
                        </button>
                      </div>
                    )}
                    {editing !== objectDefinition.id && (
                      <button
                        className="button secondary"
                        style={{ marginTop: "8px" }}
                        onClick={() => setEditing(objectDefinition.id)}
                      >
                        Edit Advanced
                      </button>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ObjectBuilder;
