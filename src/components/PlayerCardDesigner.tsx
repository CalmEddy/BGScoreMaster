import { useEffect, useMemo, useState } from "react";
import { createId } from "../lib/id";
import { CategoryTemplate, PlayerCardConfig, GameObjectDefinition } from "../state/types";

type PlayerCardDesignerProps = {
  categories: CategoryTemplate[];
  objects: GameObjectDefinition[];
  value: PlayerCardConfig;
  onChange: (next: PlayerCardConfig) => void;
};

const PlayerCardDesigner = ({ categories, objects, value, onChange }: PlayerCardDesignerProps) => {
  const [showAddSubtract, setShowAddSubtract] = useState(true);
  const [showObjects, setShowObjects] = useState(true);
  const [mode, setMode] = useState<"add" | "subtract">("add");
  const [showObjectModal, setShowObjectModal] = useState(false);
  const [newButtonCategoryId, setNewButtonCategoryId] = useState(categories[0]?.id || "");
  const [newButtonLabel, setNewButtonLabel] = useState("");

  const actionButtons = value.actionButtons;
  const ownedObjectIds = value.objectIds;

  const categoryLookup = useMemo(() => {
    return categories.reduce<Record<string, CategoryTemplate>>((acc, category) => {
      acc[category.id] = category;
      return acc;
    }, {});
  }, [categories]);

  const objectGroups = useMemo(() => {
    const groups = objects.reduce<Record<string, GameObjectDefinition[]>>((acc, objectDefinition) => {
      const groupName = objectDefinition.category || "Other";
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(objectDefinition);
      return acc;
    }, {});
    return Object.entries(groups);
  }, [objects]);

  useEffect(() => {
    if (!newButtonCategoryId && categories.length > 0) {
      setNewButtonCategoryId(categories[0].id);
    }
  }, [categories, newButtonCategoryId]);

  const groupedOwnedObjects = useMemo(() => {
    const groups = objectGroups.reduce<Record<string, GameObjectDefinition[]>>((acc, [groupName]) => {
      acc[groupName] = [];
      return acc;
    }, {});

    ownedObjectIds.forEach((objectId) => {
      const objectDefinition = objects.find((item) => item.id === objectId);
      if (!objectDefinition) return;
      const groupName = objectDefinition.category || "Other";
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(objectDefinition);
    });

    return groups;
  }, [ownedObjectIds, objects, objectGroups]);

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

  const toggleObject = (id: string) => {
    onChange({
      ...value,
      objectIds: ownedObjectIds.includes(id)
        ? ownedObjectIds.filter((existing) => existing !== id)
        : [...ownedObjectIds, id],
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
          onClick={() => setShowObjects((prev) => !prev)}
        >
          <span>Objects</span>
          <span>{showObjects ? "Hide" : "Show"}</span>
        </button>
        {showObjects && (
          <div className="stack">
            <button
              type="button"
              className="designer-table-header"
              onClick={() => setShowObjectModal(true)}
            >
              Owned Objects
              <span>Select objects</span>
            </button>
            {objects.length === 0 ? (
              <p style={{ margin: 0, color: "#6b7280" }}>
                Add objects in the template to display owned objects here.
              </p>
            ) : (
              <div
                className="designer-table"
                style={{ gridTemplateColumns: `repeat(${Math.max(objectGroups.length, 1)}, 1fr)` }}
              >
                <div
                  className="designer-table-row designer-table-head"
                  style={{ gridTemplateColumns: `repeat(${Math.max(objectGroups.length, 1)}, 1fr)` }}
                >
                  {objectGroups.map(([groupName]) => (
                    <div key={groupName}>{groupName}</div>
                  ))}
                </div>
                <div
                  className="designer-table-row"
                  style={{ gridTemplateColumns: `repeat(${Math.max(objectGroups.length, 1)}, 1fr)` }}
                >
                  {objectGroups.map(([groupName]) => (
                    <div key={groupName}>
                      {(groupedOwnedObjects[groupName] || []).length === 0 ? (
                        <span className="designer-table-empty">—</span>
                      ) : (
                        groupedOwnedObjects[groupName]?.map((objectDefinition) => (
                          <div key={objectDefinition.id} className="designer-table-item">
                            {objectDefinition.name}
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

      {showObjectModal && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal stack">
            <div className="inline" style={{ justifyContent: "space-between" }}>
              <h3 style={{ margin: 0 }}>Select Owned Objects</h3>
              <button className="button ghost" type="button" onClick={() => setShowObjectModal(false)}>
                Close
              </button>
            </div>
            <p style={{ margin: 0, color: "#667085" }}>
              Choose the objects that should appear on this player card.
            </p>
            <div className="designer-object-grid">
              {objects.map((objectDefinition) => (
                <label key={objectDefinition.id} className="designer-object-item">
                  <input
                    type="checkbox"
                    checked={ownedObjectIds.includes(objectDefinition.id)}
                    onChange={() => toggleObject(objectDefinition.id)}
                  />
                  <span>
                    {objectDefinition.name}
                    <span className="designer-object-tag">{objectDefinition.category || "Other"}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="inline" style={{ justifyContent: "flex-end" }}>
              <button className="button" type="button" onClick={() => setShowObjectModal(false)}>
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
