import { useState } from "react";
import { VariableDefinition, VariableValue } from "../state/types";
import { validateVariableValue } from "../lib/variableStorage";

type VariableRendererProps = {
  variable: VariableValue;
  definition: VariableDefinition;
  onUpdate: (value: any) => void;
  compact?: boolean;
};

const VariableRenderer: React.FC<VariableRendererProps> = ({
  variable,
  definition,
  onUpdate,
  compact = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(variable.value);

  const handleSave = () => {
    const validation = validateVariableValue(editValue, definition);
    if (validation.valid) {
      onUpdate(editValue);
      setIsEditing(false);
    } else {
      alert(validation.error);
    }
  };

  const handleIncrement = (amount: number) => {
    if (typeof variable.value === "number") {
      const newValue = variable.value + amount;
      const validation = validateVariableValue(newValue, definition);
      if (validation.valid) {
        onUpdate(newValue);
      }
    }
  };

  const renderValue = () => {
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
                disabled={definition.min !== undefined && variable.value <= definition.min}
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
                    setEditValue(variable.value);
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
                disabled={definition.max !== undefined && variable.value >= definition.max}
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
                  setEditValue(variable.value);
                  setIsEditing(false);
                }
              }}
              autoFocus
            />
          );
        default:
          return <span>{String(variable.value)}</span>;
      }
    }

    // Display mode
    const displayValue = variable.value;
    return (
      <div
        className="inline"
        style={{ gap: "4px", alignItems: "center", cursor: "pointer" }}
        onClick={() => setIsEditing(true)}
      >
        {definition.icon && <span>{definition.icon}</span>}
        <span style={{ fontWeight: "500" }}>{String(displayValue)}</span>
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
      onClick={() => !isEditing && setIsEditing(true)}
    >
      <div className="inline" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <div>
          {definition.icon && <span style={{ marginRight: "8px" }}>{definition.icon}</span>}
          <strong>{definition.name}</strong>
          {definition.description && (
            <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "2px 0" }}>
              {definition.description}
            </p>
          )}
        </div>
        {renderValue()}
      </div>
    </div>
  );
};

export default VariableRenderer;

