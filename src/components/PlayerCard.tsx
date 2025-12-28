import { useMemo } from "react";
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
}) => {
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

  const groupedVariables = useMemo(() => {
    const groups: Record<string, VariableValue[]> = {};
    playerVariables.forEach((variable) => {
      const def = variableDefinitions[variable.variableDefinitionId];
      const category = def?.category || "Other";
      if (!groups[category]) groups[category] = [];
      groups[category].push(variable);
    });
    return groups;
  }, [playerVariables, variableDefinitions]);

  const hasVariables = playerVariables.length > 0 && showVariables;
  return (
    <div className="card player-card">
      <div className="inline" style={{ justifyContent: "space-between" }}>
        <button className="button ghost" onClick={onOpenLedger}>
          {name}
        </button>
        <span className={`score ${isWinner ? "winner" : ""}`}>{total}</span>
      </div>
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

