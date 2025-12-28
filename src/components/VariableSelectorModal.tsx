import { useState } from "react";
import { GameTemplate, ID } from "../state/types";
import Modal from "./Modal";

const VariableSelectorModal = ({
  template,
  selectedVariableIds,
  onClose,
  onSelect,
}: {
  template: GameTemplate;
  selectedVariableIds: ID[];
  onClose: () => void;
  onSelect: (variableIds: ID[]) => void;
}) => {
  const [selected, setSelected] = useState<Set<ID>>(new Set(selectedVariableIds));

  const handleToggle = (variableId: ID) => {
    const newSelected = new Set(selected);
    if (newSelected.has(variableId)) {
      newSelected.delete(variableId);
    } else {
      newSelected.add(variableId);
    }
    setSelected(newSelected);
  };

  const handleSave = () => {
    onSelect(Array.from(selected));
  };

  return (
    <Modal onClose={onClose} title="Select Variables">
      <div className="stack">
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          Select which variables should appear in the player card table.
        </p>
        <div className="list" style={{ maxHeight: "400px", overflowY: "auto" }}>
          {template.variableDefinitions.map((variable) => (
            <label
              key={variable.id}
              className="inline"
              style={{
                padding: "8px",
                cursor: "pointer",
                borderRadius: "4px",
                backgroundColor: selected.has(variable.id) ? "#f3f4f6" : "transparent",
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(variable.id)}
                onChange={() => handleToggle(variable.id)}
                style={{ marginRight: "8px" }}
              />
              {variable.icon && <span style={{ marginRight: "8px" }}>{variable.icon}</span>}
              <span>{variable.name}</span>
              {variable.description && (
                <span style={{ fontSize: "0.75rem", color: "#6b7280", marginLeft: "8px" }}>
                  {variable.description}
                </span>
              )}
            </label>
          ))}
        </div>
        <div className="inline" style={{ justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
          <button className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default VariableSelectorModal;

