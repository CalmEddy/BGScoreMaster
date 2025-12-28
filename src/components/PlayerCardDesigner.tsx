import { useEffect, useMemo, useState } from "react";
import { createId } from "../lib/id";
import { CategoryTemplate, PlayerCardConfig, VariableDefinition } from "../state/types";

type PlayerCardDesignerProps = {
  categories: CategoryTemplate[];
  variables: VariableDefinition[];
  value: PlayerCardConfig;
  onChange: (next: PlayerCardConfig) => void;
};

const PlayerCardDesigner = ({ categories, variables, value, onChange }: PlayerCardDesignerProps) => {
  const [showAddSubtract, setShowAddSubtract] = useState(true);
  const [showVariables, setShowVariables] = useState(true);
  const [mode, setMode] = useState<"add" | "subtract">("add");
  const [showVariableModal, setShowVariableModal] = useState(false);
  const [newButtonCategoryId, setNewButtonCategoryId] = useState(categories[0]?.id || "");
  const [newButtonLabel, setNewButtonLabel] = useState("");

  const actionButtons = value.actionButtons;
  const ownedVariableIds = value.variableIds;

  const categoryLookup = useMemo(() => {
    return categories.reduce<Record<string, CategoryTemplate>>((acc, category) => {
      acc[category.id] = category;
      return acc;
    }, {});
  }, [categories]);

  const variableGroups = useMemo(() => {
    const groups = variables.reduce<Record<string, VariableDefinition[]>>((acc, variable) => {
      const groupName = variable.category || "Other";
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(variable);
      return acc;
    }, {});
    return Object.entries(groups);
  }, [variables]);

  useEffect(() => {
    if (!newButtonCategoryId && categories.length > 0) {
      setNewButtonCategoryId(categories[0].id);
    }
  }, [categories, newButtonCategoryId]);

  const groupedOwnedVariables = useMemo(() => {
    const groups = variableGroups.reduce<Record<string, VariableDefinition[]>>((acc, [groupName]) => {
      acc[groupName] = [];
      return acc;
    }, {});

    ownedVariableIds.forEach((variableId) => {
      const variable = variables.find((item) => item.id === variableId);
      if (!variable) return;
      const groupName = variable.category || "Other";
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(variable);
    });

    return groups;
  }, [ownedVariableIds, variables, variableGroups]);

  const handleMove = (index: number, direction: "left" | "right") => {
    const nextIndex = direction === "left" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= actionButtons.length) return;
    const updated = [...actionButtons];
    const [moved] = updated.splice(index, 1);
    updated.splice(nextIndex, 0, moved);
    onChange({ ...value, actionButtons: updated });
  };

  const handleAddButton = () => {
    if (!newButtonCategoryId) return;
    const updated = [
      ...actionButtons,
      {
        id: createId(),
        categoryId: newButtonCategoryId,
        label: newButtonLabel.trim() || undefined,
      },
    ];
    onChange({ ...value, actionButtons: updated });
    setNewButtonLabel("");
  };

  const handleUpdateButton = (id: string, updates: Partial<PlayerCardConfig["actionButtons"][number]>) => {
    onChange({
      ...value,
      actionButtons: actionButtons.map((button) =>
        button.id === id ? { ...button, ...updates } : button
      ),
    });
  };

  const toggleVariable = (id: string) => {
    onChange({
      ...value,
      variableIds: ownedVariableIds.includes(id)
        ? ownedVariableIds.filter((existing) => existing !== id)
        : [...ownedVariableIds, id],
    });
  };

  return (
    <div className="card stack player-card-designer">
      <div className="designer-header">
        <div>
          <div className="designer-title">Player 1</div>
          <div className="designer-subtitle">Player Card Designer</div>
        </div>
        <div className="designer-scoreline">
          <div>
            <div className="designer-label">Round Score</div>
            <div className="designer-score">12</div>
          </div>
          <div>
            <div className="designer-label">Total</div>
            <div className="designer-total">27</div>
          </div>
        </div>
      </div>

      <div className="designer-section">
        <button
          className="designer-section-toggle"
          type="button"
          onClick={() => setShowAddSubtract((prev) => !prev)}
        >
          <span>Add / Subtract</span>
          <span>{showAddSubtract ? "Hide" : "Show"}</span>
        </button>
        {showAddSubtract && (
          <div className="stack">
            <div className="inline" style={{ justifyContent: "space-between" }}>
              <div className="inline" style={{ gap: "6px" }}>
                <button
                  className={`button small ${mode === "add" ? "" : "secondary"}`}
                  type="button"
                  onClick={() => setMode("add")}
                >
                  + Add
                </button>
                <button
                  className={`button small ${mode === "subtract" ? "" : "secondary"}`}
                  type="button"
                  onClick={() => setMode("subtract")}
                >
                  − Subtract
                </button>
              </div>
              <div className={`mode-pill ${mode}`}>
                {mode === "add" ? "Buttons will add" : "Buttons will subtract"}
              </div>
            </div>

            {categories.length === 0 ? (
              <p style={{ margin: 0, color: "#6b7280" }}>
                Add categories to enable action buttons.
              </p>
            ) : (
              <div className="designer-grid">
                {actionButtons.map((button, index) => {
                  const category = categoryLookup[button.categoryId];
                  return (
                    <div key={button.id} className="designer-button-card">
                      <button
                        type="button"
                        className="designer-action"
                        style={{ background: button.color || "#5EEAD4" }}
                      >
                        {button.label || category?.name || "Select category"}
                      </button>
                      <label className="label">Category</label>
                      <select
                        className="input"
                        value={button.categoryId}
                        onChange={(event) =>
                          handleUpdateButton(button.id, { categoryId: event.target.value })
                        }
                      >
                        {categories.map((categoryOption) => (
                          <option key={categoryOption.id} value={categoryOption.id}>
                            {categoryOption.name}
                          </option>
                        ))}
                      </select>
                      <div>
                        <label className="label">Custom Label</label>
                        <input
                          className="input"
                          value={button.label || ""}
                          onChange={(event) => handleUpdateButton(button.id, { label: event.target.value })}
                          placeholder={category?.name || "Category label"}
                        />
                      </div>
                      <div className="inline" style={{ justifyContent: "space-between" }}>
                        <div className="inline" style={{ gap: "4px" }}>
                          <button
                            type="button"
                            className="button ghost small"
                            onClick={() => handleMove(index, "left")}
                            aria-label="Move left"
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            className="button ghost small"
                            onClick={() => handleMove(index, "right")}
                            aria-label="Move right"
                          >
                            →
                          </button>
                        </div>
                        <button
                          type="button"
                          className="button ghost small"
                          onClick={() =>
                            onChange({
                              ...value,
                              actionButtons: actionButtons.filter((item) => item.id !== button.id),
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {categories.length > 0 && (
              <div className="designer-toolbar">
                <div>
                  <label className="label">Category</label>
                  <select
                    className="input"
                    value={newButtonCategoryId}
                    onChange={(event) => setNewButtonCategoryId(event.target.value)}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Custom Label</label>
                  <input
                    className="input"
                    value={newButtonLabel}
                    onChange={(event) => setNewButtonLabel(event.target.value)}
                    placeholder="Optional label override"
                  />
                </div>
                <div>
                  <label className="label">&nbsp;</label>
                  <button type="button" className="button" onClick={handleAddButton}>
                    + Add Button
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="designer-section">
        <button
          className="designer-section-toggle"
          type="button"
          onClick={() => setShowVariables((prev) => !prev)}
        >
          <span>Variables</span>
          <span>{showVariables ? "Hide" : "Show"}</span>
        </button>
        {showVariables && (
          <div className="stack">
            <button
              type="button"
              className="designer-table-header"
              onClick={() => setShowVariableModal(true)}
            >
              Owned Variables
              <span>Select variables</span>
            </button>
            {variables.length === 0 ? (
              <p style={{ margin: 0, color: "#6b7280" }}>
                Add variables in the template to display owned variables here.
              </p>
            ) : (
              <div
                className="designer-table"
                style={{ gridTemplateColumns: `repeat(${Math.max(variableGroups.length, 1)}, 1fr)` }}
              >
                <div
                  className="designer-table-row designer-table-head"
                  style={{ gridTemplateColumns: `repeat(${Math.max(variableGroups.length, 1)}, 1fr)` }}
                >
                  {variableGroups.map(([groupName]) => (
                    <div key={groupName}>{groupName}</div>
                  ))}
                </div>
                <div
                  className="designer-table-row"
                  style={{ gridTemplateColumns: `repeat(${Math.max(variableGroups.length, 1)}, 1fr)` }}
                >
                  {variableGroups.map(([groupName]) => (
                    <div key={groupName}>
                      {(groupedOwnedVariables[groupName] || []).length === 0 ? (
                        <span className="designer-table-empty">—</span>
                      ) : (
                        groupedOwnedVariables[groupName]?.map((variable) => (
                          <div key={variable.id} className="designer-table-item">
                            {variable.name}
                          </div>
                        ))
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showVariableModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal stack">
            <div className="inline" style={{ justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>Select Owned Variables</h3>
              <button className="button ghost" type="button" onClick={() => setShowVariableModal(false)}>
                Close
              </button>
            </div>
            <p style={{ margin: 0, color: "#667085" }}>
              Choose the variables that should appear on this player card.
            </p>
            <div className="designer-variable-grid">
              {variables.map((variable) => (
                <label key={variable.id} className="designer-variable-item">
                  <input
                    type="checkbox"
                    checked={ownedVariableIds.includes(variable.id)}
                    onChange={() => toggleVariable(variable.id)}
                  />
                  <span>
                    {variable.name}
                    <span className="designer-variable-tag">{variable.category || "Other"}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="inline" style={{ justifyContent: "flex-end" }}>
              <button className="button" type="button" onClick={() => setShowVariableModal(false)}>
                Save Selection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerCardDesigner;