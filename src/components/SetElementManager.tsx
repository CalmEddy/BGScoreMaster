import { useState } from "react";
import { createId } from "../lib/id";
import { GameObjectDefinition, ID } from "../state/types";

type SetElementManagerProps = {
  setObject: GameObjectDefinition;
  allObjects: GameObjectDefinition[];
  onUpdate: (updates: Partial<GameObjectDefinition>) => void;
  onCreateElement: (elementDef: GameObjectDefinition) => void;
};

const SetElementManager = ({
  setObject,
  allObjects,
  onUpdate,
  onCreateElement,
}: SetElementManagerProps) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newElementName, setNewElementName] = useState("");
  const [newElementIcon, setNewElementIcon] = useState("");
  const [newElementType, setNewElementType] = useState<"number" | "boolean" | "string" | "resource" | "territory" | "card" | "custom">("resource");

  // Get objects that can be added (not already in set, not the set itself)
  const availableObjects = allObjects.filter(
    (v) => v.id !== setObject.id && !setObject.setElements?.includes(v.id)
  );

  // Get current set elements
  const setElements = setObject.setElements || [];
  const currentElements = setElements
    .map((id) => allObjects.find((v) => v.id === id))
    .filter(Boolean) as GameObjectDefinition[];

  const handleAddExisting = (objectId: ID) => {
    const currentElements = setObject.setElements || [];
    if (currentElements.includes(objectId)) {
      return; // Already in set
    }
    // Note: setIds on element objects are handled by ObjectBuilder.handleUpdate
    onUpdate({
      setElements: [...currentElements, objectId],
    });
  };

  const handleCreateAndAdd = () => {
    if (!newElementName.trim()) {
      alert("Please enter an element name");
      return;
    }

    const newElement: GameObjectDefinition = {
      id: createId(),
      name: newElementName.trim(),
      type: newElementType,
      icon: newElementIcon || undefined,
      category: setObject.category || "Custom",
      setIds: [setObject.id], // Mark it as belonging to this set
      defaultValue: newElementType === "number" || newElementType === "resource" ? 0 : undefined,
    };

    onCreateElement(newElement);
    
    // Add to set
    const currentElements = setObject.setElements || [];
    onUpdate({
      setElements: [...currentElements, newElement.id],
    });

    // Reset form
    setNewElementName("");
    setNewElementIcon("");
    setNewElementType("resource");
    setShowAddModal(false);
  };

  const handleRemoveElement = (elementId: ID) => {
    const currentElements = setObject.setElements || [];
    onUpdate({
      setElements: currentElements.filter((id) => id !== elementId),
    });
  };

  if (setObject.setType !== "elements") {
    return null;
  }

  return (
    <div className="card stack" style={{ marginTop: "12px" }}>
      <div className="card-title">Set Elements</div>
      <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
        Add objects to this set. Elements can belong to multiple sets.
      </p>

      {currentElements.length > 0 && (
        <div className="list">
          {currentElements.map((element) => {
            const belongsToSets = element.setIds || [];
            return (
              <div key={element.id} className="card inline" style={{ justifyContent: "space-between" }}>
                <div>
                  {element.icon && <span style={{ marginRight: "8px" }}>{element.icon}</span>}
                  <strong>{element.name}</strong>
                  <span className="badge" style={{ marginLeft: "8px", fontSize: "0.75rem" }}>
                    {element.type}
                  </span>
                  {belongsToSets.length > 1 && (
                    <span style={{ fontSize: "0.75rem", color: "#6b7280", marginLeft: "8px" }}>
                      (in {belongsToSets.length} sets)
                    </span>
                  )}
                </div>
                <button
                  className="button danger"
                  onClick={() => handleRemoveElement(element.id)}
                  style={{ padding: "4px 8px", fontSize: "0.875rem" }}
                >
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="inline" style={{ gap: "8px" }}>
        {availableObjects.length > 0 && (
          <select
            className="input"
            value=""
            onChange={(e) => {
              if (e.target.value) {
                handleAddExisting(e.target.value);
                e.target.value = "";
              }
            }}
          >
            <option value="">Add existing object...</option>
            {availableObjects.map((v) => (
              <option key={v.id} value={v.id}>
                {v.icon && `${v.icon} `}
                {v.name} ({v.type})
              </option>
            ))}
          </select>
        )}
        <button className="button secondary" onClick={() => setShowAddModal(true)}>
          Create New Element
        </button>
      </div>

      {showAddModal && (
        <div className="card stack" style={{ marginTop: "12px", background: "#f9fafb" }}>
          <div className="card-title">Create New Element</div>
          <div>
            <label className="label">Element Name *</label>
            <input
              className="input"
              value={newElementName}
              onChange={(e) => setNewElementName(e.target.value)}
              placeholder="e.g., Gold, Emerald, Ruby"
            />
          </div>
          <div>
            <label className="label">Element Type</label>
            <select
              className="input"
              value={newElementType}
              onChange={(e) => setNewElementType(e.target.value as any)}
            >
              <option value="resource">Resource</option>
              <option value="card">Card</option>
              <option value="number">Number</option>
              <option value="string">String</option>
              <option value="boolean">Boolean</option>
              <option value="territory">Territory</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="label">Icon (emoji)</label>
            <input
              className="input"
              value={newElementIcon}
              onChange={(e) => setNewElementIcon(e.target.value)}
              placeholder="💎 (optional)"
              maxLength={2}
            />
          </div>
          <div className="inline" style={{ gap: "8px" }}>
            <button className="button" onClick={handleCreateAndAdd}>
              Create & Add to Set
            </button>
            <button className="button secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SetElementManager;
