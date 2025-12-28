import { AppState, GameObjectDefinition, GameObjectValue, ID } from "../state/types";
import { getObjectByDefinition, getObjectValue } from "./objectStorage";
import { evaluateFormula, ExtendedFormulaContext } from "./formulaParser";
import { computeCategoryTotals } from "./calculations";

type GameObjectEvaluationContext = {
  state: AppState;
  sessionId: ID;
  playerId?: ID;
  currentRoundId?: ID;
};

/**
 * Evaluates object ownership based on ownership rules
 */
export function evaluateGameObjectOwnership(
  varDef: GameObjectDefinition,
  context: GameObjectEvaluationContext
): ID | "global" | "inactive" | undefined {
  const { state, sessionId, playerId } = context;

  const ownership = varDef.ownership || (varDef.type === "string" ? "global" : "player");

  switch (ownership) {
    case "inactive":
      return "inactive";
    case "global":
      return "global";
    case "player":
      return playerId || undefined;
    default:
      // Ownership is object reference
      if (ownership.type === "object") {
        const refVarDef = state.templates[state.sessions[sessionId]?.templateId || ""]?.objectDefinitions.find(
          (v) => v.id === ownership.objectId
        );
        if (!refVarDef) return "inactive";

        // Check if referenced object is owned by a player
        const refVarValue = getObjectByDefinition(state, sessionId, ownership.objectId, playerId);
        if (refVarValue) {
          const refState = evaluateGameObjectState(refVarDef, refVarValue, context);
          if (refState === "owned" && refVarValue.playerId) {
            return refVarValue.playerId;
          }
          if (refState === "active" && refVarValue.playerId) {
            return refVarValue.playerId;
          }
        }
        return "inactive";
      }
      return undefined;
  }
}

/**
 * Evaluates if object is active based on active window rules
 */
export function evaluateActiveWindow(
  varDef: GameObjectDefinition,
  context: GameObjectEvaluationContext
): boolean {
  const { state, sessionId, currentRoundId } = context;

  const activeWindow = varDef.activeWindow || "always";

  if (activeWindow === "always") {
    return true;
  }

  if (activeWindow.type === "round") {
    if (activeWindow.roundId) {
      return currentRoundId === activeWindow.roundId;
    }
    if (activeWindow.roundIndex !== undefined) {
      const round = Object.values(state.rounds).find(
        (r) => r.sessionId === sessionId && r.index === activeWindow.roundIndex
      );
      return round?.id === currentRoundId;
    }
    // If no specific round, check if rounds are enabled and we're in any round
    const session = state.sessions[sessionId];
    return session?.settings.roundsEnabled === true && currentRoundId !== undefined;
  }

  if (activeWindow.type === "phase") {
    // Phase support is future - for now, return true if phase mechanic exists
    const session = state.sessions[sessionId];
    const template = session?.templateId ? state.templates[session.templateId] : undefined;
    const hasPhaseMechanic = template?.mechanics.some((m) => m.type === "phase" && m.enabled);
    return hasPhaseMechanic === true;
  }

  if (activeWindow.type === "object") {
    const refVarDef = state.templates[state.sessions[sessionId]?.templateId || ""]?.objectDefinitions.find(
      (v) => v.id === activeWindow.objectId
    );
    if (!refVarDef) return false;

    const refVarValue = getObjectByDefinition(state, sessionId, activeWindow.objectId, context.playerId);
    if (refVarValue) {
      const refState = evaluateGameObjectState(refVarDef, refVarValue, context);
      return refState === "active" || refState === "owned";
    }
    return false;
  }

  return true;
}

/**
 * Evaluates the current state of an object
 */
export function evaluateGameObjectState(
  varDef: GameObjectDefinition,
  varValue: GameObjectValue,
  context: GameObjectEvaluationContext
): "inactive" | "active" | "discarded" | "owned" | string {
  // If object has explicit state, use it
  if (varValue.state) {
    return varValue.state;
  }

  // Check if object is discarded (could be a custom state)
  if (varValue.value === null || varValue.value === undefined) {
    return "inactive";
  }

  // Evaluate ownership
  const ownership = evaluateGameObjectOwnership(varDef, context);
  if (ownership === "inactive") {
    return "inactive";
  }

  // Evaluate active window
  const isActive = evaluateActiveWindow(varDef, context);
  if (!isActive) {
    return "inactive";
  }

  // If owned by a player, return "owned", otherwise "active"
  if (ownership === "global") {
    return "active";
  }

  if (typeof ownership === "string" && ownership !== "global" && ownership !== "inactive") {
    return "owned";
  }

  return varValue.playerId ? "owned" : "active";
}

/**
 * Computes object value from calculation formula
 */
export function computeGameObjectValue(
  varDef: GameObjectDefinition,
  varValue: GameObjectValue,
  context: GameObjectEvaluationContext
): any {
  if (!varDef.calculation) {
    return varValue.value;
  }

  const { state, sessionId, playerId } = context;

  // Check if we should use cached value
  if (varValue.computedValue !== undefined && varValue.lastComputedAt) {
    // For now, always recompute - could add dependency tracking later
  }

  try {
    const session = state.sessions[sessionId];
    const template = session?.templateId ? state.templates[session.templateId] : undefined;

    // Get category totals for this player
    const categoryTotals = playerId ? computeCategoryTotals(state, sessionId, playerId, context.currentRoundId) : {};

    const getCategoryValue = (categoryNameOrId: string): number => {
      if (categoryNameOrId === "total") {
        return Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
      }
      const categories = Object.values(state.categories).filter((c) => c.sessionId === sessionId);
      const category = categories.find(
        (cat) => cat.name.toLowerCase() === categoryNameOrId.toLowerCase() || cat.id === categoryNameOrId
      );
      if (category) {
        return categoryTotals[category.id] ?? 0;
      }
      return categoryTotals[categoryNameOrId] ?? 0;
    };

    const getGameObjectValueForFormula = (objectName: string): number | undefined => {
      if (template) {
        const refVarDef = template.objectDefinitions.find(
          (v) => v.name.toLowerCase() === objectName.toLowerCase() || v.id === objectName
        );
        if (refVarDef) {
          // Try player object first
          const playerVar = getObjectValue(state, sessionId, refVarDef.id, playerId);
          if (playerVar !== undefined) {
            // Handle set types - convert to number for formulas
            if (refVarDef.type === "set") {
              if (refVarDef.setType === "identical") {
                return typeof playerVar === "number" ? playerVar : 0;
              } else if (refVarDef.setType === "elements") {
                // For elements sets, return total count
                if (Array.isArray(playerVar)) {
                  return (playerVar as any[]).reduce((sum, el) => sum + (el.quantity || 0), 0);
                }
                return 0;
              }
            }
            if (typeof playerVar === "number") {
              return playerVar;
            }
          }
          // Try session object
          const sessionVar = getObjectValue(state, sessionId, refVarDef.id);
          if (sessionVar !== undefined) {
            // Handle set types - convert to number for formulas
            if (refVarDef.type === "set") {
              if (refVarDef.setType === "identical") {
                return typeof sessionVar === "number" ? sessionVar : 0;
              } else if (refVarDef.setType === "elements") {
                // For elements sets, return total count
                if (Array.isArray(sessionVar)) {
                  return (sessionVar as any[]).reduce((sum, el) => sum + (el.quantity || 0), 0);
                }
                return 0;
              }
            }
            if (typeof sessionVar === "number") {
              return sessionVar;
            }
          }
        }
      }
      return undefined;
    };

    const getGameObjectStateForFormula = (objectName: string): string => {
      if (template) {
        const refVarDef = template.objectDefinitions.find(
          (v) => v.name.toLowerCase() === objectName.toLowerCase() || v.id === objectName
        );
        if (refVarDef) {
          const refVarValue = getObjectByDefinition(state, sessionId, refVarDef.id, playerId);
          if (refVarValue) {
            return evaluateGameObjectState(refVarDef, refVarValue, context);
          }
        }
      }
      return "inactive";
    };

    const ownsGameObject = (objectName: string, checkPlayerId?: ID): boolean => {
      if (template) {
        const refVarDef = template.objectDefinitions.find(
          (v) => v.name.toLowerCase() === objectName.toLowerCase() || v.id === objectName
        );
        if (refVarDef) {
          const targetPlayerId = checkPlayerId || playerId;
          if (targetPlayerId) {
            const refVarValue = getObjectByDefinition(state, sessionId, refVarDef.id, targetPlayerId);
            if (refVarValue) {
              const refState = evaluateGameObjectState(refVarDef, refVarValue, {
                ...context,
                playerId: targetPlayerId,
              });
              return refState === "owned" || refState === "active";
            }
          }
        }
      }
      return false;
    };

    const getRoundIndex = (): number => {
      if (context.currentRoundId) {
        const round = state.rounds[context.currentRoundId];
        return round?.index || 0;
      }
      return 0;
    };

    // Enhanced formula evaluation with state and ownership functions
    const extendedContext: ExtendedFormulaContext = {
      categories: categoryTotals,
      total: Object.values(categoryTotals).reduce((sum, val) => sum + val, 0),
      round: getRoundIndex(),
      getObjectState: getGameObjectStateForFormula,
      ownsObject: ownsGameObject,
      getRoundIndex: getRoundIndex,
      getPhaseId: () => undefined, // Phase support is future
    };

    const value = evaluateFormula(
      varDef.calculation,
      {
        categories: categoryTotals,
        total: Object.values(categoryTotals).reduce((sum, val) => sum + val, 0),
        round: getRoundIndex(),
      },
      getCategoryValue,
      getGameObjectValueForFormula,
      extendedContext
    );

    return value;
  } catch (error) {
    console.warn(`Error computing object ${varDef.name}:`, error);
    return varValue.value; // Fallback to stored value
  }
}

/**
 * Gets the state of an object (for use in formulas)
 */
export function getGameObjectState(
  state: AppState,
  sessionId: ID,
  objectDefinitionId: ID,
  playerId?: ID
): string {
  const session = state.sessions[sessionId];
  const template = session?.templateId ? state.templates[session.templateId] : undefined;
  if (!template) return "inactive";

  const varDef = template.objectDefinitions.find((v) => v.id === objectDefinitionId);
  if (!varDef) return "inactive";

  const varValue = getObjectByDefinition(state, sessionId, objectDefinitionId, playerId);
  if (!varValue) return "inactive";

  const context: GameObjectEvaluationContext = {
    state,
    sessionId,
    playerId,
  };

  return evaluateGameObjectState(varDef, varValue, context);
}

/**
 * Applies score impact from an object's scoreImpact formula
 */
export function applyGameObjectScoreImpact(
  varDef: GameObjectDefinition,
  varValue: GameObjectValue,
  context: GameObjectEvaluationContext
): number {
  if (!varDef.scoreImpact || !varValue.playerId) {
    return 0;
  }

  const { state, sessionId, playerId } = context;
  if (!playerId) return 0;

  try {
    const session = state.sessions[sessionId];
    const template = session?.templateId ? state.templates[session.templateId] : undefined;

    const categoryTotals = computeCategoryTotals(state, sessionId, playerId, context.currentRoundId);

    const getCategoryValue = (categoryNameOrId: string): number => {
      if (categoryNameOrId === "total") {
        return Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
      }
      const categories = Object.values(state.categories).filter((c) => c.sessionId === sessionId);
      const category = categories.find(
        (cat) => cat.name.toLowerCase() === categoryNameOrId.toLowerCase() || cat.id === categoryNameOrId
      );
      if (category) {
        return categoryTotals[category.id] ?? 0;
      }
      return categoryTotals[categoryNameOrId] ?? 0;
    };

    const getGameObjectValueForFormula = (objectName: string): number | undefined => {
      if (template) {
        const refVarDef = template.objectDefinitions.find(
          (v) => v.name.toLowerCase() === objectName.toLowerCase() || v.id === objectName
        );
        if (refVarDef) {
          const playerVar = getObjectValue(state, sessionId, refVarDef.id, playerId);
          if (playerVar !== undefined) {
            // Handle set types - convert to number for formulas
            if (refVarDef.type === "set") {
              if (refVarDef.setType === "identical") {
                return typeof playerVar === "number" ? playerVar : 0;
              } else if (refVarDef.setType === "elements") {
                // For elements sets, return total count
                if (Array.isArray(playerVar)) {
                  return (playerVar as any[]).reduce((sum, el) => sum + (el.quantity || 0), 0);
                }
                return 0;
              }
            }
            if (typeof playerVar === "number") {
              return playerVar;
            }
          }
          const sessionVar = getObjectValue(state, sessionId, refVarDef.id);
          if (sessionVar !== undefined) {
            // Handle set types - convert to number for formulas
            if (refVarDef.type === "set") {
              if (refVarDef.setType === "identical") {
                return typeof sessionVar === "number" ? sessionVar : 0;
              } else if (refVarDef.setType === "elements") {
                // For elements sets, return total count
                if (Array.isArray(sessionVar)) {
                  return (sessionVar as any[]).reduce((sum, el) => sum + (el.quantity || 0), 0);
                }
                return 0;
              }
            }
            if (typeof sessionVar === "number") {
              return sessionVar;
            }
          }
        }
      }
      return undefined;
    };

    const value = evaluateFormula(
      varDef.scoreImpact,
      {
        categories: categoryTotals,
        total: Object.values(categoryTotals).reduce((sum, val) => sum + val, 0),
      },
      getCategoryValue,
      getGameObjectValueForFormula
    );

    return value;
  } catch (error) {
    console.warn(`Error applying score impact for object ${varDef.name}:`, error);
    return 0;
  }
}
