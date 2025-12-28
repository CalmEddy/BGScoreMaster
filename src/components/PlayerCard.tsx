import { useMemo, useState } from "react";
import { AppState, VariableValue, VariableDefinition, GameTemplate, ID, ScoreEntry } from "../state/types";
import { getPlayerVariables } from "../lib/variableStorage";
import VariableRenderer from "./VariableRenderer";

const quickValues = [1, 5, 10, -1, -5, -10];

const PlayerCard = ({
  name,
  total,
  roundScore,
  isWinner,
  allowNegative,
  onQuickAdd,
  onAddEntry,
  onOpenLedger,
  playerId,
  sessionId,
  state,
  onVariableUpdate,
  showQuickAdd,
  showVariables,
  currentRoundId,
  onCategoryButtonClick,
}: {
  name: string;
  total: number;
  roundScore?: number;
  isWinner: boolean;
  allowNegative: boolean;
  onQuickAdd: (value: number) => void;
  onAddEntry: () => void;
  onOpenLedger: () => void;
  playerId?: string;
  sessionId?: string;
  state?: AppState;
  onVariableUpdate?: (variableValueId: string, value: any) => void;
  showQuickAdd: boolean;
  showVariables: boolean;
  currentRoundId?: string;
  onCategoryButtonClick?: (categoryId: ID, value: number) => void;
}) => {
  const template = useMemo(() => {
    if (!sessionId || !state) return undefined;
    const session = state.sessions[sessionId];
    if (!session?.templateId) return undefined;
    return state.templates[session.templateId];
  }, [sessionId, state]);

  const config = template?.playerCardConfig;

  // Default config if none exists
  const defaultConfig = useMemo(() => {
    if (config) return config;
    // Return sensible defaults
    return {
      showPlayerName: true,
      showRoundScore: true,
      showTotalScore: true,
      addSubtractSection: {
        enabled: showQuickAdd,
        collapsible: false,
        defaultExpanded: true,
        buttons: [],
      },
      variablesSection: {
        enabled: showVariables,
        collapsible: false,
        defaultExpanded: true,
        tableConfig: {
          columns: [],
        },
      },
    };
  }, [config, showQuickAdd, showVariables]);

  const [addSubtractExpanded, setAddSubtractExpanded] = useState(
    defaultConfig.addSubtractSection.defaultExpanded ?? true
  );
  const [variablesExpanded, setVariablesExpanded] = useState(
    defaultConfig.variablesSection.defaultExpanded ?? true
  );
  const [isPositive, setIsPositive] = useState(true);

  const playerVariables = useMemo(() => {
    if (!playerId || !sessionId || !state) return [];
    return getPlayerVariables(state, sessionId, playerId);
  }, [playerId, sessionId, state]);

  const variableDefinitions = useMemo(() => {
    if (!sessionId || !state) return {};
    const session = state.sessions[sessionId];
    if (!session?.templateId) return {};
    const template = state.templates[session.templateId];
    if (!template) return {};
    return template.variableDefinitions.reduce((acc, def) => {
      acc[def.id] = def;
      return acc;
    }, {} as Record<string, VariableDefinition>);
  }, [sessionId, state]);

  const categories = useMemo(() => {
    if (!sessionId || !state) return {};
    return Object.values(state.categories)
      .filter((c) => c.sessionId === sessionId)
      .reduce((acc, cat) => {
        acc[cat.id] = cat;
        return acc;
      }, {} as Record<string, typeof state.categories[string]>);
  }, [sessionId, state]);

  // Map template category IDs to session category IDs by matching names
  const categoryIdMap = useMemo(() => {
    if (!template) return {};
    const map: Record<string, string> = {};
    template.categoryTemplates.forEach((catTemplate) => {
      const sessionCategory = Object.values(categories).find(
        (c) => c.name === catTemplate.name
      );
      if (sessionCategory) {
        map[catTemplate.id] = sessionCategory.id;
      }
    });
    return map;
  }, [template, categories]);

  // Get configured variable columns for table
  const variableColumns = useMemo(() => {
    if (!defaultConfig.variablesSection.enabled) return [];
    return defaultConfig.variablesSection.tableConfig.columns
      .sort((a, b) => a.order - b.order)
      .map((col) => variableDefinitions[col.variableDefinitionId])
      .filter(Boolean) as VariableDefinition[];
  }, [defaultConfig, variableDefinitions]);

  // Get variables that match the configured columns
  const tableVariables = useMemo(() => {
    if (variableColumns.length === 0) return [];
    const varDefIds = new Set(variableColumns.map((v) => v.id));
    return playerVariables.filter((v) => varDefIds.has(v.variableDefinitionId));
  }, [playerVariables, variableColumns]);

  const handleCategoryButtonClick = (categoryId: ID) => {
    if (!onCategoryButtonClick || !currentRoundId) return;
    const value = isPositive ? 1 : -1;
    onCategoryButtonClick(categoryId, value);
  };

  return (
    <div className="card player-card">
      {/* Top Section */}
      <div className="inline" style={{ justifyContent: "space-between", alignItems: "center" }}>
        {defaultConfig.showPlayerName && (
          <button className="button ghost" onClick={onOpenLedger}>
            {name}
          </button>
        )}
        <div className="inline" style={{ gap: "8px", alignItems: "center" }}>
          {defaultConfig.showRoundScore && roundScore !== undefined && (
            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              Round Score {roundScore}
            </span>
          )}
          {defaultConfig.showTotalScore && (
            <span className={`score ${isWinner ? "winner" : ""}`}>{total}</span>
          )}
        </div>
      </div>

      {/* Add/Subtract Section */}
      {defaultConfig.addSubtractSection.enabled && (
        <div style={{ marginTop: "12px" }}>
          {defaultConfig.addSubtractSection.collapsible ? (
            <div>
              <button
                className="button ghost"
                onClick={() => setAddSubtractExpanded(!addSubtractExpanded)}
                style={{ width: "100%", justifyContent: "space-between", padding: "8px" }}
              >
                <span>Add / Subtract</span>
                <span>{addSubtractExpanded ? "▼" : "▶"}</span>
              </button>
              {addSubtractExpanded && (
                <div style={{ marginTop: "8px" }}>
                  {renderAddSubtractSection()}
                </div>
              )}
            </div>
          ) : (
            renderAddSubtractSection()
          )}
        </div>
      )}

      {/* Legacy Quick Add (if enabled and no config buttons) */}
      {showQuickAdd && defaultConfig.addSubtractSection.buttons.length === 0 && (
        <div className="quick-buttons" style={{ marginTop: "12px" }}>
          {quickValues.map((value) => (
            <button
              key={value}
              className="button secondary"
              onClick={() => onQuickAdd(value)}
              disabled={value < 0 && !allowNegative}
            >
              {value > 0 ? `+${value}` : value}
            </button>
          ))}
        </div>
      )}

      <button className="button" onClick={onAddEntry} style={{ marginTop: "12px" }}>
        Add…
      </button>

      {/* Variables Section */}
      {defaultConfig.variablesSection.enabled && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
          {defaultConfig.variablesSection.collapsible ? (
            <div>
              <button
                className="button ghost"
                onClick={() => setVariablesExpanded(!variablesExpanded)}
                style={{ width: "100%", justifyContent: "space-between", padding: "8px" }}
              >
                <span>Variables</span>
                <span>{variablesExpanded ? "▼" : "▶"}</span>
              </button>
              {variablesExpanded && (
                <div style={{ marginTop: "8px" }}>
                  {renderVariablesSection()}
                </div>
              )}
            </div>
          ) : (
            renderVariablesSection()
          )}
        </div>
      )}

      {/* Legacy Variables Display (if enabled and no config columns) */}
      {showVariables && defaultConfig.variablesSection.tableConfig.columns.length === 0 && playerVariables.length > 0 && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "8px", fontWeight: "500" }}>
            Variables
          </div>
          <div className="inline" style={{ gap: "4px", flexWrap: "wrap" }}>
            {playerVariables.map((variable) => {
              const def = variableDefinitions[variable.variableDefinitionId];
              if (!def) return null;
              return (
                <VariableRenderer
                  key={variable.id}
                  variable={variable}
                  definition={def}
                  onUpdate={(value) => {
                    if (onVariableUpdate) {
                      onVariableUpdate(variable.id, value);
                    }
                  }}
                  compact
                  allVariableDefinitions={Object.values(variableDefinitions)}
                />
              );
            })}
          </div>
        </div>
      )}

    </div>
  );

  function renderAddSubtractSection() {
    if (defaultConfig.addSubtractSection.buttons.length === 0) return null;

    return (
      <div className="stack">
        {/* Toggle */}
        <div className="inline" style={{ gap: "8px", alignItems: "center", marginBottom: "8px" }}>
          <button
            className={`button ${isPositive ? "" : "secondary"}`}
            onClick={() => setIsPositive(true)}
            style={{ flex: 1 }}
          >
            +
          </button>
          <button
            className={`button ${!isPositive ? "" : "secondary"}`}
            onClick={() => setIsPositive(false)}
            style={{ flex: 1 }}
          >
            −
          </button>
        </div>

        {/* Category Buttons */}
        <div className="inline" style={{ gap: "4px", flexWrap: "wrap" }}>
          {defaultConfig.addSubtractSection.buttons
            .sort((a, b) => a.order - b.order)
            .map((button) => {
              // Map template category ID to session category ID
              const sessionCategoryId = categoryIdMap[button.categoryId] || button.categoryId;
              const category = categories[sessionCategoryId];
              if (!category) return null;

              return (
                <button
                  key={button.id}
                  className="button secondary"
                  onClick={() => handleCategoryButtonClick(sessionCategoryId)}
                  disabled={!currentRoundId}
                  title={category.name}
                >
                  {button.label || category.name}
                </button>
              );
            })}
        </div>
      </div>
    );
  }

  function renderVariablesSection() {
    if (variableColumns.length === 0) {
      return (
        <div style={{ fontSize: "0.875rem", color: "#6b7280", textAlign: "center", padding: "8px" }}>
          No variables configured. Configure in template builder.
        </div>
      );
    }

    return (
      <div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr>
              {variableColumns.map((varDef) => {
                const colConfig = defaultConfig.variablesSection.tableConfig.columns.find(
                  (c) => c.variableDefinitionId === varDef.id
                );
                return (
                  <th
                    key={varDef.id}
                    style={{
                      padding: "8px",
                      textAlign: "left",
                      borderBottom: "1px solid #e5e7eb",
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    {colConfig?.label || varDef.name}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {tableVariables.length > 0 ? (
              <tr>
                {variableColumns.map((varDef) => {
                  const variable = tableVariables.find((v) => v.variableDefinitionId === varDef.id);
                  return (
                    <td key={varDef.id} style={{ padding: "8px", borderBottom: "1px solid #f3f4f6" }}>
                      {variable ? (
                        <VariableRenderer
                          variable={variable}
                          definition={varDef}
                          onUpdate={(value) => {
                            if (onVariableUpdate) {
                              onVariableUpdate(variable.id, value);
                            }
                          }}
                          compact
                          allVariableDefinitions={Object.values(variableDefinitions)}
                        />
                      ) : (
                        <span style={{ color: "#9ca3af" }}>—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ) : (
              <tr>
                <td
                  colSpan={variableColumns.length}
                  style={{ padding: "8px", textAlign: "center", color: "#9ca3af" }}
                >
                  No variables
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }
};

export default PlayerCard;
