import { useMemo, useState } from "react";
import { AppState, GameObjectValue, GameObjectDefinition } from "../state/types";
import { getPlayerObjects } from "../lib/objectStorage";
import ObjectRenderer from "./ObjectRenderer";

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
  onObjectUpdate,
  showQuickAdd,
  showObjects,
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
  onObjectUpdate?: (objectValueId: string, value: any) => void;
  showQuickAdd: boolean;
  showObjects: boolean;
  onCategoryAction?: (categoryId: string, mode: "add" | "subtract") => void;
}) => {
  const [actionMode, setActionMode] = useState<"add" | "subtract">("add");

  const playerObjects = useMemo(() => {
    if (!playerId || !sessionId || !state) return [];
    return getPlayerObjects(state, sessionId, playerId);
  }, [playerId, sessionId, state]);

  const template = useMemo(() => {
    if (!sessionId || !state) return undefined;
    const session = state.sessions[sessionId];
    if (!session?.templateId) return undefined;
    return state.templates[session.templateId];
  }, [sessionId, state]);

  const objectDefinitions = useMemo(() => {
    if (!template) return {};
    return template.objectDefinitions.reduce((acc, def) => {
      acc[def.id] = def;
      return acc;
    }, {} as Record<string, GameObjectDefinition>);
  }, [template]);

  const selectedObjectIds = template?.uiConfig?.playerCard?.objectIds;
  const visibleObjects = useMemo(() => {
    if (!selectedObjectIds || selectedObjectIds.length === 0) return playerObjects;
    return playerObjects.filter((objectValue) => selectedObjectIds.includes(objectValue.objectDefinitionId));
  }, [playerObjects, selectedObjectIds]);

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

  const groupedObjects = useMemo(() => {
    const groups: Record<string, GameObjectValue[]> = {};
    visibleObjects.forEach((objectValue) => {
      const def = objectDefinitions[objectValue.objectDefinitionId];
      const category = def?.category || "Other";
      if (!groups[category]) groups[category] = [];
      groups[category].push(objectValue);
    });
    return groups;
  }, [visibleObjects, objectDefinitions]);

  const hasObjects = visibleObjects.length > 0 && showObjects;
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
      {hasObjects && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "8px", fontWeight: "500" }}>
            Objects
          </div>
          {Object.entries(groupedObjects).map(([category, objects]) => (
            <div key={category} style={{ marginBottom: "8px" }}>
              {Object.keys(groupedObjects).length > 1 && (
                <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginBottom: "4px" }}>
                  {category}
                </div>
              )}
              <div className="inline" style={{ gap: "4px", flexWrap: "wrap" }}>
                {objects.map((objectValue) => {
                  const def = objectDefinitions[objectValue.objectDefinitionId];
                  if (!def) return null;
                  return (
                    <ObjectRenderer
                      key={objectValue.id}
                      objectValue={objectValue}
                      definition={def}
                      onUpdate={(value) => {
                        if (onObjectUpdate) {
                          onObjectUpdate(objectValue.id, value);
                        }
                      }}
                      compact
                      allObjectDefinitions={Object.values(objectDefinitions)}
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
