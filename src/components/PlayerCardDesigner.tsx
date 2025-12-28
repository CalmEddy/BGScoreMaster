import { useState } from "react";
import { createId } from "../lib/id";
import { CategoryTemplate, GameTemplate, VariableDefinition, ID } from "../state/types";

type PlayerCardConfig = NonNullable<GameTemplate["playerCardConfig"]>;

const PlayerCardDesigner = ({
  config,
  categories,
  variables,
  onChange,
}: {
  config: PlayerCardConfig | undefined;
  categories: CategoryTemplate[];
  variables: VariableDefinition[];
  onChange: (config: PlayerCardConfig) => void;
}) => {
  const currentConfig: PlayerCardConfig = config || getDefaultConfig(categories, variables);

  const [addSubtractExpanded, setAddSubtractExpanded] = useState(
    currentConfig.addSubtractSection.defaultExpanded ?? true
  );
  const [variablesExpanded, setVariablesExpanded] = useState(
    currentConfig.variablesSection.defaultExpanded ?? true
  );

  const updateConfig = (updates: Partial<PlayerCardConfig>) => {
    onChange({ ...currentConfig, ...updates });
  };

  const updateAddSubtractSection = (updates: Partial<PlayerCardConfig["addSubtractSection"]>) => {
    updateConfig({
      addSubtractSection: { ...currentConfig.addSubtractSection, ...updates },
    });
  };

  const updateVariablesSection = (updates: Partial<PlayerCardConfig["variablesSection"]>) => {
    updateConfig({
      variablesSection: { ...currentConfig.variablesSection, ...updates },
    });
  };

  const handleAddCategoryButton = (categoryId: ID) => {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) return;

    const existingButtons = currentConfig.addSubtractSection.buttons;
    const maxOrder = existingButtons.length > 0 ? Math.max(...existingButtons.map((b) => b.order)) : -1;

    const newButton = {
      id: createId(),
      categoryId,
      label: category.name,
      order: maxOrder + 1,
    };

    updateAddSubtractSection({
      buttons: [...existingButtons, newButton].sort((a, b) => a.order - b.order),
    });
  };

  const handleRemoveCategoryButton = (buttonId: ID) => {
    updateAddSubtractSection({
      buttons: currentConfig.addSubtractSection.buttons.filter((b) => b.id !== buttonId),
    });
  };

  const handleMoveCategoryButton = (buttonId: ID, direction: "up" | "down") => {
    const buttons = [...currentConfig.addSubtractSection.buttons];
    const index = buttons.findIndex((b) => b.id === buttonId);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= buttons.length) return;

    // Swap orders
    const tempOrder = buttons[index].order;
    buttons[index].order = buttons[newIndex].order;
    buttons[newIndex].order = tempOrder;

    updateAddSubtractSection({
      buttons: buttons.sort((a, b) => a.order - b.order),
    });
  };

  const handleUpdateButtonLabel = (buttonId: ID, label: string) => {
    updateAddSubtractSection({
      buttons: currentConfig.addSubtractSection.buttons.map((b) =>
        b.id === buttonId ? { ...b, label } : b
      ),
    });
  };

  const handleToggleVariableColumn = (variableDefinitionId: ID) => {
    const columns = currentConfig.variablesSection.tableConfig.columns;
    const existing = columns.find((c) => c.variableDefinitionId === variableDefinitionId);

    if (existing) {
      // Remove column
      updateVariablesSection({
        tableConfig: {
          columns: columns.filter((c) => c.id !== existing.id),
        },
      });
    } else {
      // Add column
      const variable = variables.find((v) => v.id === variableDefinitionId);
      if (!variable) return;

      const maxOrder = columns.length > 0 ? Math.max(...columns.map((c) => c.order)) : -1;
      const newColumn = {
        id: createId(),
        variableDefinitionId,
        label: variable.name,
        order: maxOrder + 1,
      };

      updateVariablesSection({
        tableConfig: {
          columns: [...columns, newColumn].sort((a, b) => a.order - b.order),
        },
      });
    }
  };

  const handleMoveVariableColumn = (columnId: ID, direction: "up" | "down") => {
    const columns = [...currentConfig.variablesSection.tableConfig.columns];
    const index = columns.findIndex((c) => c.id === columnId);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;

    // Swap orders
    const tempOrder = columns[index].order;
    columns[index].order = columns[newIndex].order;
    columns[newIndex].order = tempOrder;

    updateVariablesSection({
      tableConfig: {
        columns: columns.sort((a, b) => a.order - b.order),
      },
    });
  };

  const handleUpdateColumnLabel = (columnId: ID, label: string) => {
    updateVariablesSection({
      tableConfig: {
        columns: currentConfig.variablesSection.tableConfig.columns.map((c) =>
          c.id === columnId ? { ...c, label } : c
        ),
      },
    });
  };

  const availableCategories = categories.filter(
    (c) => !currentConfig.addSubtractSection.buttons.some((b) => b.categoryId === c.id)
  );

  const availableVariables = variables.filter(
    (v) => !currentConfig.variablesSection.tableConfig.columns.some((c) => c.variableDefinitionId === v.id)
  );

  return (
    <div className="stack">
      <h2>Player Card Configuration</h2>
      <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
        Customize the layout and functionality of player cards in sessions using this template.
      </p>

      {/* Top Section */}
      <div className="card stack">
        <div className="card-title">Top Section</div>
        <label className="inline">
          <input
            type="checkbox"
            checked={currentConfig.showPlayerName}
            onChange={(e) => updateConfig({ showPlayerName: e.target.checked })}
          />
          Show Player Name
        </label>
        <label className="inline">
          <input
            type="checkbox"
            checked={currentConfig.showRoundScore}
            onChange={(e) => updateConfig({ showRoundScore: e.target.checked })}
          />
          Show Round Score
        </label>
        <label className="inline">
          <input
            type="checkbox"
            checked={currentConfig.showTotalScore}
            onChange={(e) => updateConfig({ showTotalScore: e.target.checked })}
          />
          Show Total Score
        </label>
      </div>

      {/* Add/Subtract Section */}
      <div className="card stack">
        <div className="inline" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="card-title">Add/Subtract Section</div>
          <button
            className="button ghost"
            onClick={() => setAddSubtractExpanded(!addSubtractExpanded)}
          >
            {addSubtractExpanded ? "▼" : "▶"}
          </button>
        </div>
        {addSubtractExpanded && (
          <div className="stack">
            <label className="inline">
              <input
                type="checkbox"
                checked={currentConfig.addSubtractSection.enabled}
                onChange={(e) =>
                  updateAddSubtractSection({ enabled: e.target.checked })
                }
              />
              Enable Add/Subtract Section
            </label>
            {currentConfig.addSubtractSection.enabled && (
              <>
                <label className="inline">
                  <input
                    type="checkbox"
                    checked={currentConfig.addSubtractSection.collapsible}
                    onChange={(e) =>
                      updateAddSubtractSection({ collapsible: e.target.checked })
                    }
                  />
                  Collapsible
                </label>
                {currentConfig.addSubtractSection.collapsible && (
                  <label className="inline">
                    <input
                      type="checkbox"
                      checked={currentConfig.addSubtractSection.defaultExpanded ?? true}
                      onChange={(e) =>
                        updateAddSubtractSection({ defaultExpanded: e.target.checked })
                      }
                    />
                    Default Expanded
                  </label>
                )}

                <div className="stack" style={{ marginTop: "12px" }}>
                  <div className="card-title">Category Buttons</div>
                  {currentConfig.addSubtractSection.buttons.length === 0 ? (
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      No buttons configured. Add categories below.
                    </p>
                  ) : (
                    <div className="list">
                      {currentConfig.addSubtractSection.buttons
                        .sort((a, b) => a.order - b.order)
                        .map((button) => {
                          const category = categories.find((c) => c.id === button.categoryId);
                          return (
                            <div key={button.id} className="card inline" style={{ justifyContent: "space-between" }}>
                              <div style={{ flex: 1 }}>
                                <input
                                  className="input"
                                  value={button.label}
                                  onChange={(e) => handleUpdateButtonLabel(button.id, e.target.value)}
                                  style={{ marginBottom: "4px" }}
                                />
                                <small style={{ color: "#6b7280" }}>
                                  Category: {category?.name || "(deleted)"}
                                </small>
                              </div>
                              <div className="inline" style={{ gap: "4px" }}>
                                <button
                                  className="button ghost"
                                  onClick={() => handleMoveCategoryButton(button.id, "up")}
                                  disabled={button.order === 0}
                                  title="Move up"
                                >
                                  ↑
                                </button>
                                <button
                                  className="button ghost"
                                  onClick={() => handleMoveCategoryButton(button.id, "down")}
                                  disabled={
                                    button.order ===
                                    Math.max(...currentConfig.addSubtractSection.buttons.map((b) => b.order))
                                  }
                                  title="Move down"
                                >
                                  ↓
                                </button>
                                <button
                                  className="button danger"
                                  onClick={() => handleRemoveCategoryButton(button.id)}
                                  title="Remove"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {availableCategories.length > 0 && (
                    <div>
                      <label className="label">Add Category Button</label>
                      <select
                        className="input"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddCategoryButton(e.target.value);
                            e.target.value = "";
                          }
                        }}
                      >
                        <option value="">Select a category...</option>
                        {availableCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Variables Section */}
      <div className="card stack">
        <div className="inline" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="card-title">Variables Section</div>
          <button
            className="button ghost"
            onClick={() => setVariablesExpanded(!variablesExpanded)}
          >
            {variablesExpanded ? "▼" : "▶"}
          </button>
        </div>
        {variablesExpanded && (
          <div className="stack">
            <label className="inline">
              <input
                type="checkbox"
                checked={currentConfig.variablesSection.enabled}
                onChange={(e) =>
                  updateVariablesSection({ enabled: e.target.checked })
                }
              />
              Enable Variables Section
            </label>
            {currentConfig.variablesSection.enabled && (
              <>
                <label className="inline">
                  <input
                    type="checkbox"
                    checked={currentConfig.variablesSection.collapsible}
                    onChange={(e) =>
                      updateVariablesSection({ collapsible: e.target.checked })
                    }
                  />
                  Collapsible
                </label>
                {currentConfig.variablesSection.collapsible && (
                  <label className="inline">
                    <input
                      type="checkbox"
                      checked={currentConfig.variablesSection.defaultExpanded ?? true}
                      onChange={(e) =>
                        updateVariablesSection({ defaultExpanded: e.target.checked })
                      }
                    />
                    Default Expanded
                  </label>
                )}

                <div className="stack" style={{ marginTop: "12px" }}>
                  <div className="card-title">Table Columns</div>
                  {currentConfig.variablesSection.tableConfig.columns.length === 0 ? (
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      No columns configured. Variables will be selected in the session.
                    </p>
                  ) : (
                    <div className="list">
                      {currentConfig.variablesSection.tableConfig.columns
                        .sort((a, b) => a.order - b.order)
                        .map((column) => {
                          const variable = variables.find((v) => v.id === column.variableDefinitionId);
                          return (
                            <div key={column.id} className="card inline" style={{ justifyContent: "space-between" }}>
                              <div style={{ flex: 1 }}>
                                <input
                                  className="input"
                                  value={column.label}
                                  onChange={(e) => handleUpdateColumnLabel(column.id, e.target.value)}
                                  style={{ marginBottom: "4px" }}
                                />
                                <small style={{ color: "#6b7280" }}>
                                  Variable: {variable?.name || "(deleted)"}
                                </small>
                              </div>
                              <div className="inline" style={{ gap: "4px" }}>
                                <button
                                  className="button ghost"
                                  onClick={() => handleMoveVariableColumn(column.id, "up")}
                                  disabled={column.order === 0}
                                  title="Move up"
                                >
                                  ↑
                                </button>
                                <button
                                  className="button ghost"
                                  onClick={() => handleMoveVariableColumn(column.id, "down")}
                                  disabled={
                                    column.order ===
                                    Math.max(...currentConfig.variablesSection.tableConfig.columns.map((c) => c.order))
                                  }
                                  title="Move down"
                                >
                                  ↓
                                </button>
                                <button
                                  className="button danger"
                                  onClick={() => handleToggleVariableColumn(column.variableDefinitionId)}
                                  title="Remove"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {availableVariables.length > 0 && (
                    <div>
                      <label className="label">Add Variable Column</label>
                      <select
                        className="input"
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleToggleVariableColumn(e.target.value);
                            e.target.value = "";
                          }
                        }}
                      >
                        <option value="">Select a variable...</option>
                        {availableVariables.map((variable) => (
                          <option key={variable.id} value={variable.id}>
                            {variable.icon && <span>{variable.icon} </span>}
                            {variable.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function getDefaultConfig(
  categories: CategoryTemplate[],
  variables: VariableDefinition[]
): PlayerCardConfig {
  return {
    showPlayerName: true,
    showRoundScore: true,
    showTotalScore: true,
    addSubtractSection: {
      enabled: true,
      collapsible: true,
      defaultExpanded: true,
      buttons: categories.map((cat, index) => ({
        id: createId(),
        categoryId: cat.id,
        label: cat.name,
        order: index,
      })),
    },
    variablesSection: {
      enabled: true,
      collapsible: true,
      defaultExpanded: true,
      tableConfig: {
        columns: [],
      },
    },
  };
}

export default PlayerCardDesigner;

