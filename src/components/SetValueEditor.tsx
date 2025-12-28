import { useState } from "react";
import { GameObjectDefinition, GameObjectValue, SetValue, ID } from "../state/types";
import Modal from "./Modal";

type SetValueEditorProps = {
  objectValue: GameObjectValue;
  definition: GameObjectDefinition;
  allObjectDefinitions: GameObjectDefinition[];
  onSave: (value: SetValue) => void;
  onClose: () => void;
};

const SetValueEditor = ({
  objectValue,
  definition,
  allObjectDefinitions,
  onSave,
  onClose,
}: SetValueEditorProps) => {
  if (definition.type !== "set" || !definition.setType) {
    return null;
  }

  // Get current value, defaulting appropriately
  const currentValue: SetValue = objectValue.value as SetValue ?? (definition.setType === "identical" ? 0 : []);

  const [value, setValue] = useState<SetValue>(currentValue);

  const handleSave = () => {
    onSave(value);
    onClose();
  };

  if (definition.setType === "identical") {
    // Simple count input for identical sets
    const count = typeof value === "number" ? value : 0;
    return (
      <Modal title={`Edit ${definition.name}`} onClose={onClose}>
        <div className="stack">
          <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            {definition.setElementTemplate?.name
              ? `Set contains identical ${definition.setElementTemplate.name} elements`
              : "Set contains identical elements"}
          </p>
          <div>
            <label className="label">Count</label>
            <div className="inline" style={{ gap: "8px", alignItems: "center" }}>
              <button
                className="button ghost"
                onClick={() => setValue(Math.max(0, count - 1))}
                style={{ padding: "4px 12px" }}
              >
                −
              </button>
              <input
                className="input"
                type="number"
                value={count}
                onChange={(e) => setValue(Math.max(0, parseInt(e.target.value, 10) || 0))}
                style={{ width: "100px", textAlign: "center" }}
                min={0}
              />
              <button
                className="button ghost"
                onClick={() => setValue(count + 1)}
                style={{ padding: "4px 12px" }}
              >
                +
              </button>
            </div>
          </div>
          <div className="inline" style={{ gap: "8px", marginTop: "16px" }}>
            <button className="button" onClick={handleSave}>
              Save
            </button>
            <button className="button secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Elements set editor
  const elementValues = Array.isArray(value) ? value : [];
  const setElements = definition.setElements || [];
  
  // Get element definitions
  const elementDefinitions = setElements
    .map((id) => allObjectDefinitions.find((v) => v.id === id))
    .filter(Boolean) as GameObjectDefinition[];

  const updateElementQuantity = (elementDefId: ID, quantity: number) => {
    const updated = [...elementValues];
    const index = updated.findIndex((ev) => ev.elementObjectDefinitionId === elementDefId);
    
    if (quantity <= 0) {
      // Remove element if quantity is 0 or less
      if (index >= 0) {
        updated.splice(index, 1);
      }
    } else {
      if (index >= 0) {
        updated[index] = { ...updated[index], quantity };
      } else {
        updated.push({ elementObjectDefinitionId: elementDefId, quantity });
      }
    }
    
    setValue(updated);
  };

  const getElementQuantity = (elementDefId: ID): number => {
    const elementValue = elementValues.find((ev) => ev.elementObjectDefinitionId === elementDefId);
    return elementValue?.quantity || 0;
  };

  const totalCount = elementValues.reduce((sum, ev) => sum + ev.quantity, 0);

  return (
    <Modal title={`Edit ${definition.name}`} onClose={onClose}>
      <div className="stack">
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          Manage elements in this set. Total: <strong>{totalCount}</strong>
        </p>
        <div className="list">
          {elementDefinitions.map((elementDef) => {
            const quantity = getElementQuantity(elementDef.id);
            return (
              <div key={elementDef.id} className="card inline" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  {elementDef.icon && <span style={{ marginRight: "8px" }}>{elementDef.icon}</span>}
                  <strong>{elementDef.name}</strong>
                  {elementDef.description && (
                    <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "4px 0 0 0" }}>
                      {elementDef.description}
                    </p>
                  )}
                </div>
                <div className="inline" style={{ gap: "8px", alignItems: "center" }}>
                  <button
                    className="button ghost"
                    onClick={() => updateElementQuantity(elementDef.id, quantity - 1)}
                    disabled={quantity <= 0}
                    style={{ padding: "4px 12px" }}
                  >
                    −
                  </button>
                  <input
                    className="input"
                    type="number"
                    value={quantity}
                    onChange={(e) => updateElementQuantity(elementDef.id, parseInt(e.target.value, 10) || 0)}
                    style={{ width: "80px", textAlign: "center" }}
                    min={0}
                  />
                  <button
                    className="button ghost"
                    onClick={() => updateElementQuantity(elementDef.id, quantity + 1)}
                    style={{ padding: "4px 12px" }}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {elementDefinitions.length === 0 && (
          <p style={{ fontSize: "0.875rem", color: "#6b7280", textAlign: "center", padding: "24px" }}>
            No elements defined for this set. Add elements in the object builder.
          </p>
        )}
        <div className="inline" style={{ gap: "8px", marginTop: "16px" }}>
          <button className="button" onClick={handleSave}>
            Save
          </button>
          <button className="button secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default SetValueEditor;
