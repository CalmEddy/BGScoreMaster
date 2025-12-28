import { useMemo, useState } from "react";
import { AppState, VariableValue, VariableDefinition } from "../state/types";
import { getPlayerVariables } from "../lib/variableStorage";
import VariableRenderer from "./VariableRenderer";

const quickValues = [1, 5, 10, -1, -5, -10];

const PlayerCard = ({
  name,
  total,
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
  onCategoryAction,
}: {
  name: string;
  total: number;
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
  onCategoryAction?: (categoryId: string, mode: "add" | "subtract") => void;
}) => {
  const [actionMode, setActionMode] = useState<"add" | "subtract">("add");

  const playerVariables = useMemo(() => {
    if (!playerId || !sessionId || !state) return [];
    return getPlayerVariables(state, sessionId, playerId);
  }, [playerId, sessionId, state]);

  const template = useMemo(() => {
    if (!sessionId || !state) return undefined;
    const session = state.sessions[sessionId];
    if (!session?.templateId) return undefined;
    return state.templates[session.templateId];
  }, [sessionId, state]);

  const variableDefinitions = useMemo(() => {
    if (!template) return {};
    return template.variableDefinitions.reduce((acc, def) => {
      acc[def.id] = def;
      return acc;
    }, {} as Record<string, VariableDefinition>);
  }, [template]);

  const selectedVariableIds = template?.uiConfig?.playerCard?.variableIds;
  const visibleVariables = useMemo(() => {
    if (!selectedVariableIds || selectedVariableIds.length === 0) return playerVariables;
    return playerVariables.filter((variable) => selectedVariableIds.includes(variable.variableDefinitionId));
  }, [playerVariables, selectedVariableIds]);

  const actionButtons = template?.uiConfig?.playerCard?.actionButtons || [];
  const categoryNameMap = useMemo(() => {
    if (!template) return {};
    return template.categoryTemplates.reduce<Record<string, string>>((acc, category) => {
      acc[category.id] = category.name;
      return acc;
    }, {});
  }, [template]);

  const sessionCategories = useMemo(() => {
    if (!sessionId || !state) return [];
    const session = state.sessions[sessionId];
    if (!session?.categoryIds) return [];
    return session.categoryIds.map((id) => state.categories[id]).filter(Boolean);
  }, [sessionId, state]);

  const groupedVariables = useMemo(() => {
    const groups: Record<string, VariableValue[]> = {};
    visibleVariables.forEach((variable) => {
      const def = variableDefinitions[variable.variableDefinitionId];
      const category = def?.category || "Other";
      if (!groups[category]) groups[category] = [];
      groups[category].push(variable);
    });
    return groups;
  }, [visibleVariables, variableDefinitions]);

  const hasVariables = visibleVariables.length > 0 && showVariables;
  const hasActionButtons = actionButtons.length > 0 && !!onCategoryAction;
  return (
    <div className="card player-card">
      <div className="inline" style={{ justifyContent: "space-between" }}>
        <button className="button ghost" onClick={onOpenLedger}>
          {name}
        </button>
        <span className={`score ${isWinner ? "winner" : ""}`}>{total}</span>
      </div>
      {hasActionButtons && (
        <div className="player-card-actions">
          <div className="inline" style={{ justifyContent: "space-between" }}>
            <span className="player-card-actions-label">Add / Subtract</span>
            <div className="inline" style={{ gap: "6px" }}>
              <button
                className={`button small ${actionMode === "add" ? "" : "secondary"}`}
                onClick={() => setActionMode("add")}
              >
                + Add
              </button>
              <button
                className={`button small ${actionMode === "subtract" ? "" : "secondary"}`}
                onClick={() => setActionMode("subtract")}
                disabled={!allowNegative}
              >
                − Subtract
              </button>
            </div>
          </div>
          <div className="player-card-action-grid">
            {actionButtons.map((button) => {
              const templateCategoryName = categoryNameMap[button.categoryId];
              const matchedCategory = sessionCategories.find(
                (category) => category.name === templateCategoryName
              );
              const isDisabled = !matchedCategory || (!allowNegative && actionMode === "subtract");
              return (
                <button
                  key={button.id}
                  className="player-card-action-button"
                  style={{ background: button.color || "#5EEAD4" }}
                  disabled={isDisabled}
                  onClick={() => {
                    if (matchedCategory && onCategoryAction) {
                      onCategoryAction(matchedCategory.id, actionMode);
                    }
                  }}
                >
                  {button.label || templateCategoryName || "Category"}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {showQuickAdd && (
        <div className="quick-buttons">
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
      <button className="button" onClick={onAddEntry}>
        Add…
      </button>
      {hasVariables && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "8px", fontWeight: "500" }}>
            Variables
          </div>
          {Object.entries(groupedVariables).map(([category, variables]) => (
            <div key={category} style={{ marginBottom: "8px" }}>
              {Object.keys(groupedVariables).length > 1 && (
                <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginBottom: "4px" }}>
                  {category}
                </div>
              )}
              <div className="inline" style={{ gap: "4px", flexWrap: "wrap" }}>
                {variables.map((variable) => {
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
          ))}
        </div>
      )}
    </div>
  );
};

export default PlayerCard;

