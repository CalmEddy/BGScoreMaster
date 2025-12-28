import { AppState, VariableDefinition, VariableValue, ID, Round } from "../state/types";
import { getVariableByDefinition, getVariableValue } from "./variableStorage";
import { evaluateFormula, ExtendedFormulaContext } from "./formulaParser";
import { computeCategoryTotals } from "./calculations";

type VariableEvaluationContext = {
  state: AppState;
  sessionId: ID;
  playerId?: ID;
  currentRoundId?: ID;
};

/**
 * Evaluates variable ownership based on ownership rules
 */
export function evaluateVariableOwnership(
  varDef: VariableDefinition,
  context: VariableEvaluationContext
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
      // Ownership is variable reference
      if (ownership.type === "variable") {
        const refVarDef = state.templates[state.sessions[sessionId]?.templateId || ""]?.variableDefinitions.find(
          (v) => v.id === ownership.variableId
        );
        if (!refVarDef) return "inactive";

        // Check if referenced variable is owned by a player
        const refVarValue = getVariableByDefinition(state, sessionId, ownership.variableId, playerId);
        if (refVarValue) {
          const refState = evaluateVariableState(refVarDef, refVarValue, context);
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
 * Evaluates if variable is active based on active window rules
 */
export function evaluateActiveWindow(
  varDef: VariableDefinition,
  context: VariableEvaluationContext
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

  if (activeWindow.type === "variable") {
    const refVarDef = state.templates[state.sessions[sessionId]?.templateId || ""]?.variableDefinitions.find(
      (v) => v.id === activeWindow.variableId
    );
    if (!refVarDef) return false;

    const refVarValue = getVariableByDefinition(state, sessionId, activeWindow.variableId, context.playerId);
    if (refVarValue) {
      const refState = evaluateVariableState(refVarDef, refVarValue, context);
      return refState === "active" || refState === "owned";
    }
    return false;
  }

  return true;
}

/**
 * Evaluates the current state of a variable
 */
export function evaluateVariableState(
  varDef: VariableDefinition,
  varValue: VariableValue,
  context: VariableEvaluationContext
): "inactive" | "active" | "discarded" | "owned" | string {
  // If variable has explicit state, use it
  if (varValue.state) {
    return varValue.state;
  }

  // Check if variable is discarded (could be a custom state)
  if (varValue.value === null || varValue.value === undefined) {
    return "inactive";
  }

  // Evaluate ownership
  const ownership = evaluateVariableOwnership(varDef, context);
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
 * Computes variable value from calculation formula
 */
export function computeVariableValue(
  varDef: VariableDefinition,
  varValue: VariableValue,
  context: VariableEvaluationContext
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

    const getVariableValueForFormula = (variableName: string): number | undefined => {
      if (template) {
        const refVarDef = template.variableDefinitions.find(
          (v) => v.name.toLowerCase() === variableName.toLowerCase() || v.id === variableName
        );
        if (refVarDef) {
          // Try player variable first
          const playerVar = getVariableValue(state, sessionId, refVarDef.id, playerId);
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
          // Try session variable
          const sessionVar = getVariableValue(state, sessionId, refVarDef.id);
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

    const getVariableStateForFormula = (variableName: string): string => {
      if (template) {
        const refVarDef = template.variableDefinitions.find(
          (v) => v.name.toLowerCase() === variableName.toLowerCase() || v.id === variableName
        );
        if (refVarDef) {
          const refVarValue = getVariableByDefinition(state, sessionId, refVarDef.id, playerId);
          if (refVarValue) {
            return evaluateVariableState(refVarDef, refVarValue, context);
          }
        }
      }
      return "inactive";
    };

    const ownsVariable = (variableName: string, checkPlayerId?: ID): boolean => {
      if (template) {
        const refVarDef = template.variableDefinitions.find(
          (v) => v.name.toLowerCase() === variableName.toLowerCase() || v.id === variableName
        );
        if (refVarDef) {
          const targetPlayerId = checkPlayerId || playerId;
          if (targetPlayerId) {
            const refVarValue = getVariableByDefinition(state, sessionId, refVarDef.id, targetPlayerId);
            if (refVarValue) {
              const refState = evaluateVariableState(refVarDef, refVarValue, {
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
      getVariableState: getVariableStateForFormula,
      ownsVariable: ownsVariable,
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
      getVariableValueForFormula,
      extendedContext
    );

    return value;
  } catch (error) {
    console.warn(`Error computing variable ${varDef.name}:`, error);
    return varValue.value; // Fallback to stored value
  }
}

/**
 * Gets the state of a variable (for use in formulas)
 */
export function getVariableState(
  state: AppState,
  sessionId: ID,
  variableDefinitionId: ID,
  playerId?: ID
): string {
  const session = state.sessions[sessionId];
  const template = session?.templateId ? state.templates[session.templateId] : undefined;
  if (!template) return "inactive";

  const varDef = template.variableDefinitions.find((v) => v.id === variableDefinitionId);
  if (!varDef) return "inactive";

  const varValue = getVariableByDefinition(state, sessionId, variableDefinitionId, playerId);
  if (!varValue) return "inactive";

  const context: VariableEvaluationContext = {
    state,
    sessionId,
    playerId,
  };

  return evaluateVariableState(varDef, varValue, context);
}

/**
 * Applies score impact from variable's scoreImpact formula
 */
export function applyVariableScoreImpact(
  varDef: VariableDefinition,
  varValue: VariableValue,
  context: VariableEvaluationContext
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

    const getVariableValueForFormula = (variableName: string): number | undefined => {
      if (template) {
        const refVarDef = template.variableDefinitions.find(
          (v) => v.name.toLowerCase() === variableName.toLowerCase() || v.id === variableName
        );
        if (refVarDef) {
          const playerVar = getVariableValue(state, sessionId, refVarDef.id, playerId);
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
          const sessionVar = getVariableValue(state, sessionId, refVarDef.id);
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
      getVariableValueForFormula
    );

    return value;
  } catch (error) {
    console.warn(`Error applying score impact for variable ${varDef.name}:`, error);
    return 0;
  }
}

