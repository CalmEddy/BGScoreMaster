import { useState } from "react";
import { GameObjectDefinition, GameObjectValue, SetElementValue } from "../state/types";
import { validateGameObjectValue } from "../lib/objectStorage";
import SetValueEditor from "./SetValueEditor";

type ObjectRendererProps = {
  objectValue: GameObjectValue;
  definition: GameObjectDefinition;
  onUpdate: (value: any) => void;
  compact?: boolean;
  allObjectDefinitions?: GameObjectDefinition[]; // Needed for set element editing
};

const ObjectRenderer: React.FC<ObjectRendererProps> = ({
  objectValue,
  definition,
  onUpdate,
  compact = false,
  allObjectDefinitions = [],
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(objectValue.value);
  const [showSetEditor, setShowSetEditor] = useState(false);

  const handleSave = () => {
    const validation = validateGameObjectValue(editValue, definition);
    if (validation.valid) {
      onUpdate(editValue);
      setIsEditing(false);
    } else {
      alert(validation.error);
    }
  };

  const handleIncrement = (amount: number) => {
    if (typeof objectValue.value === "number") {
      const newValue = objectValue.value + amount;
      const validation = validateGameObjectValue(newValue, definition);
      if (validation.valid) {
        onUpdate(newValue);
      }
    } else if (definition.type === "set" && definition.setType === "identical") {
      // Handle increment for identical sets
      const currentCount = typeof objectValue.value === "number" ? objectValue.value : 0;
      const newValue = Math.max(0, currentCount + amount);
      const validation = validateGameObjectValue(newValue, definition);
      if (validation.valid) {
        onUpdate(newValue);
      }
    }
  };
  
  const getSetDisplayValue = (): string => {
    if (definition.type !== "set") return String(objectValue.value);
    
    if (definition.setType === "identical") {
      const count = typeof objectValue.value === "number" ? objectValue.value : 0;
      const elementName = definition.setElementTemplate?.name || "items";
      return `${count} ${elementName}${count !== 1 ? "" : ""}`;
    } else {
      // Elements set
      const elements = Array.isArray(objectValue.value) ? objectValue.value as SetElementValue[] : [];
      const total = elements.reduce((sum, el) => sum + el.quantity, 0);
      if (total === 0) {
        return "0 elements";
      }
      // Show summary: "5 elements" or list first few if compact
      if (compact) {
        return `${total} element${total !== 1 ? "s" : ""}`;
      }
      // Show element breakdown if not compact
      if (elements.length <= 3) {
        return elements.map(el => {
          const elDef = allObjectDefinitions.find(v => v.id === el.elementObjectDefinitionId);
          const name = elDef?.name || "Unknown";
          return `${el.quantity}× ${name}`;
        }).join(", ");
      }
      return `${total} elements (${elements.length} types)`;
    }
  };

  const renderValue = () => {
    // Handle set types specially - always use modal editor
    if (definition.type === "set") {
      const displayValue = getSetDisplayValue();
      const isComputed = definition.calculation && objectValue.computedValue !== undefined;
      
      if (showSetEditor) {
        return (
          <SetValueEditor
            objectValue={objectValue}
            definition={definition}
            allObjectDefinitions={allObjectDefinitions}
            onSave={(value) => {
              onUpdate(value);
              setShowSetEditor(false);
            }}
            onClose={() => setShowSetEditor(false)}
          />
        );
      }
      
      return (
        <div
          className="inline"
          style={{ gap: "4px", alignItems: "center", cursor: definition.calculation ? "default" : "pointer" }}
          onClick={() => !definition.calculation && setShowSetEditor(true)}
        >
          {definition.icon && <span>{definition.icon}</span>}
          <span style={{ fontWeight: "500" }}>{displayValue}</span>
          {isComputed && (
            <span style={{ fontSize: "0.75rem", color: "#16a34a", marginLeft: "4px" }} title="Computed value">
              (computed)
            </span>
          )}
          {!definition.calculation && (
            <span style={{ fontSize: "0.75rem", color: "#6b7280", marginLeft: "4px" }}>
              (click to edit)
            </span>
          )}
        </div>
      );
    }
    
    if (isEditing) {
      switch (definition.type) {
        case "number":
        case "resource":
        case "territory":
        case "card":
          return (
            <div className="inline" style={{ gap: "4px", alignItems: "center" }}>
              <button
                className="button ghost"
                onClick={() => handleIncrement(-1)}
                disabled={definition.min !== undefined && objectValue.value <= definition.min}
                style={{ padding: "2px 6px", minWidth: "auto" }}
              >
                −
              </button>
              <input
                type="number"
                className="input"
                style={{ width: "60px", padding: "4px", textAlign: "center" }}
                value={editValue}
                onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                onBlur={handleSave}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") {
                    setEditValue(objectValue.value);
                    setIsEditing(false);
                  }
                }}
                min={definition.min}
                max={definition.max}
                autoFocus
              />
              <button
                className="button ghost"
                onClick={() => handleIncrement(1)}
                disabled={definition.max !== undefined && objectValue.value >= definition.max}
                style={{ padding: "2px 6px", minWidth: "auto" }}
              >
                +
              </button>
            </div>
          );
        case "boolean":
          return (
            <label className="inline">
              <input
                type="checkbox"
                checked={editValue}
                onChange={(e) => {
                  setEditValue(e.target.checked);
                  onUpdate(e.target.checked);
                  setIsEditing(false);
                }}
              />
            </label>
          );
        case "string":
          if (definition.options && definition.options.length > 0) {
            return (
              <select
                className="input"
                value={editValue}
                onChange={(e) => {
                  setEditValue(e.target.value);
                  onUpdate(e.target.value);
                  setIsEditing(false);
                }}
                onBlur={() => setIsEditing(false)}
                autoFocus
              >
                {definition.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            );
          }
          return (
            <input
              className="input"
              style={{ width: "100px" }}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") {
                  setEditValue(objectValue.value);
                  setIsEditing(false);
                }
              }}
              autoFocus
            />
          );
        default:
          return <span>{String(objectValue.value)}</span>;
      }
    }

    // Display mode
    // Use computed value if available, otherwise use stored value
    const displayValue = definition.calculation && objectValue.computedValue !== undefined
      ? objectValue.computedValue
      : objectValue.value;
    
    const isComputed = definition.calculation && objectValue.computedValue !== undefined;
    const isActive = objectValue.state === "active" || objectValue.state === "owned";
    
    return (
      <div
        className="inline"
        style={{ gap: "4px", alignItems: "center", cursor: definition.calculation ? "default" : "pointer" }}
        onClick={() => !definition.calculation && setIsEditing(true)}
      >
        {definition.icon && <span>{definition.icon}</span>}
        <span style={{ fontWeight: "500" }}>{String(displayValue)}</span>
        {isComputed && (
          <span style={{ fontSize: "0.75rem", color: "#16a34a", marginLeft: "4px" }} title="Computed value">
            (computed)
          </span>
        )}
        {objectValue.state && (
          <span
            style={{
              fontSize: "0.75rem",
              color: isActive ? "#16a34a" : "#9ca3af",
              marginLeft: "4px",
              padding: "2px 6px",
              background: isActive ? "#dcfce7" : "#f3f4f6",
              borderRadius: "4px",
            }}
            title={`State: ${objectValue.state}`}
          >
            {objectValue.state}
          </span>
        )}
        {typeof displayValue === "number" && (definition.min !== undefined || definition.max !== undefined) && (
          <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
            ({definition.min ?? "−∞"}–{definition.max ?? "∞"})
          </span>
        )}
      </div>
    );
  };

  if (compact) {
    return (
      <div
        className="inline"
        style={{
          gap: "4px",
          padding: "4px 8px",
          background: "#f3f4f6",
          borderRadius: "4px",
          fontSize: "0.875rem",
        }}
      >
        {definition.icon && <span>{definition.icon}</span>}
        <span style={{ fontWeight: "500" }}>{definition.name}:</span>
        {renderValue()}
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        padding: "8px",
        marginBottom: "4px",
        cursor: "pointer",
      }}
      onClick={() => {
        if (definition.type === "set") {
          if (!definition.calculation) {
            setShowSetEditor(true);
          }
        } else if (!isEditing) {
          setIsEditing(true);
        }
      }}
    >
      <div className="inline" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          {definition.icon && <span style={{ marginRight: "8px" }}>{definition.icon}</span>}
          <strong>{definition.name}</strong>
          {definition.description && (
            <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "2px 0" }}>
              {definition.description}
            </p>
          )}
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "4px" }}>
            {definition.type === "set" && definition.setType && (
              <span style={{ marginRight: "12px" }}>
                Set: {definition.setType === "identical" ? "identical elements" : `${definition.setElements?.length || 0} element types`}
              </span>
            )}
            {definition.ownership && (
              <span style={{ marginRight: "12px" }}>
                Ownership: {typeof definition.ownership === "string" ? definition.ownership : "object"}
              </span>
            )}
            {definition.activeWindow && (
              <span style={{ marginRight: "12px" }}>
                Active: {typeof definition.activeWindow === "string" ? definition.activeWindow : definition.activeWindow.type}
              </span>
            )}
            {definition.calculation && <span style={{ marginRight: "12px" }}>Has calculation</span>}
            {definition.scoreImpact && <span>Has score impact</span>}
          </div>
        </div>
        {renderValue()}
      </div>
    </div>
  );
};

export default ObjectRenderer;
