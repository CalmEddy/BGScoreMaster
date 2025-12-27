import { AppState, VariableDefinition, VariableValue, Player, Session, VariableOwnership, VariableActiveWindow, ID, SetValue, SetElementValue } from "../state/types";
import { getVariableState as getVarState, evaluateActiveWindow } from "./variableCalculator";

export const getPlayerVariables = (
  state: AppState,
  sessionId: string,
  playerId: string
): VariableValue[] => {
  const session = state.sessions[sessionId];
  if (!session || !session.variableValueIds) return [];

  return session.variableValueIds
    .map((id) => state.variableValues[id])
    .filter((v) => v && v.playerId === playerId);
};

export const getSessionVariables = (
  state: AppState,
  sessionId: string
): VariableValue[] => {
  const session = state.sessions[sessionId];
  if (!session || !session.variableValueIds) return [];

  return session.variableValueIds
    .map((id) => state.variableValues[id])
    .filter((v) => v && !v.playerId);
};

export const getAllVariables = (
  state: AppState,
  sessionId: string
): VariableValue[] => {
  const session = state.sessions[sessionId];
  if (!session || !session.variableValueIds) return [];

  return session.variableValueIds
    .map((id) => state.variableValues[id])
    .filter(Boolean);
};

export const getVariableByDefinition = (
  state: AppState,
  sessionId: string,
  variableDefinitionId: string,
  playerId?: string
): VariableValue | undefined => {
  const session = state.sessions[sessionId];
  if (!session || !session.variableValueIds) return undefined;

  return session.variableValueIds
    .map((id) => state.variableValues[id])
    .find(
      (v) =>
        v &&
        v.variableDefinitionId === variableDefinitionId &&
        v.playerId === playerId
    );
};

export const getVariableValue = (
  state: AppState,
  sessionId: string,
  variableDefinitionId: string,
  playerId?: string
): any => {
  const variable = getVariableByDefinition(state, sessionId, variableDefinitionId, playerId);
  if (!variable) return undefined;
  
  // If variable has computed value, return that
  if (variable.computedValue !== undefined) {
    return variable.computedValue;
  }
  
  return variable.value;
};

/**
 * Gets the state of a variable (re-export from variableCalculator)
 */
export { getVarState as getVariableState };

/**
 * Filters variables by ownership type
 */
export const getVariablesByOwnership = (
  state: AppState,
  sessionId: string,
  ownership: VariableOwnership
): VariableValue[] => {
  const session = state.sessions[sessionId];
  if (!session || !session.variableValueIds) return [];

  const template = session.templateId ? state.templates[session.templateId] : undefined;
  if (!template) return [];

  return session.variableValueIds
    .map((id) => state.variableValues[id])
    .filter((v) => {
      if (!v) return false;
      const varDef = template.variableDefinitions.find((vd) => vd.id === v.variableDefinitionId);
      if (!varDef) return false;
      const varOwnership = varDef.ownership || (varDef.type === "string" ? "global" : "player");
      return varOwnership === ownership;
    });
};

/**
 * Filters variables by active window
 */
export const getActiveVariables = (
  state: AppState,
  sessionId: string,
  currentRoundId?: ID,
  playerId?: ID
): VariableValue[] => {
  const session = state.sessions[sessionId];
  if (!session || !session.variableValueIds) return [];

  const template = session.templateId ? state.templates[session.templateId] : undefined;
  if (!template) return [];

  return session.variableValueIds
    .map((id) => state.variableValues[id])
    .filter((v) => {
      if (!v) return false;
      const varDef = template.variableDefinitions.find((vd) => vd.id === v.variableDefinitionId);
      if (!varDef) return false;
      
      const context = {
        state,
        sessionId,
        playerId,
        currentRoundId,
      };
      
      return evaluateActiveWindow(varDef, context);
    });
};

export const initializeVariablesFromTemplate = (
  template: { variableDefinitions: VariableDefinition[] },
  sessionId: string,
  players: Player[]
): VariableValue[] => {
  const variables: VariableValue[] = [];
  const now = Date.now();

  template.variableDefinitions.forEach((varDef) => {
    // Use ownership property if defined, otherwise fall back to heuristics
    const ownership = varDef.ownership || (varDef.type === "string" ? "global" : "player");
    
    if (ownership === "global" || ownership === "inactive") {
      // Create one session-level variable
      variables.push({
        id: `${varDef.id}-session-${sessionId}`,
        sessionId,
        variableDefinitionId: varDef.id,
        playerId: undefined,
        value: varDef.defaultValue ?? getDefaultValueForType(varDef.type, varDef),
        updatedAt: now,
        updatedBy: "manual",
      });
    } else if (ownership === "player") {
      // Create per-player variables
      players.forEach((player) => {
        variables.push({
          id: `${varDef.id}-${player.id}`,
          sessionId,
          variableDefinitionId: varDef.id,
          playerId: player.id,
          value: varDef.defaultValue ?? getDefaultValueForType(varDef.type, varDef),
          updatedAt: now,
          updatedBy: "manual",
        });
      });
    } else if (ownership.type === "variable") {
      // Variable-based ownership - initialize as inactive for now
      // Will be evaluated dynamically
      variables.push({
        id: `${varDef.id}-session-${sessionId}`,
        sessionId,
        variableDefinitionId: varDef.id,
        playerId: undefined,
        value: varDef.defaultValue ?? getDefaultValueForType(varDef.type, varDef),
        updatedAt: now,
        updatedBy: "manual",
        state: "inactive",
      });
    }
  });

  return variables;
};

const getDefaultValueForType = (type: VariableDefinition["type"], varDef?: VariableDefinition): any => {
  switch (type) {
    case "number":
    case "resource":
    case "territory":
    case "card":
      return 0;
    case "boolean":
      return false;
    case "string":
    case "custom":
      return "";
    case "set":
      // For sets, default depends on setType
      if (varDef?.setType === "identical") {
        return 0; // Count for identical sets
      } else {
        return []; // Empty array for elements sets
      }
    default:
      return 0;
  }
};

export const validateVariableValue = (
  value: any,
  definition: VariableDefinition
): { valid: boolean; error?: string } => {
  // Type validation
  switch (definition.type) {
    case "number":
    case "resource":
    case "territory":
    case "card":
      if (typeof value !== "number" || isNaN(value)) {
        return { valid: false, error: "Value must be a number" };
      }
      if (definition.min !== undefined && value < definition.min) {
        return { valid: false, error: `Value must be at least ${definition.min}` };
      }
      if (definition.max !== undefined && value > definition.max) {
        return { valid: false, error: `Value must be at most ${definition.max}` };
      }
      break;
    case "boolean":
      if (typeof value !== "boolean") {
        return { valid: false, error: "Value must be a boolean" };
      }
      break;
    case "string":
      if (typeof value !== "string") {
        return { valid: false, error: "Value must be a string" };
      }
      if (definition.options && !definition.options.includes(value)) {
        return { valid: false, error: `Value must be one of: ${definition.options.join(", ")}` };
      }
      break;
    case "set":
      if (!definition.setType) {
        return { valid: false, error: "Set variable must have a setType defined" };
      }
      if (definition.setType === "identical") {
        // Identical sets should have a number value (count)
        if (typeof value !== "number" || isNaN(value)) {
          return { valid: false, error: "Identical set value must be a number (count)" };
        }
        if (value < 0) {
          return { valid: false, error: "Set count cannot be negative" };
        }
        if (definition.min !== undefined && value < definition.min) {
          return { valid: false, error: `Set count must be at least ${definition.min}` };
        }
        if (definition.max !== undefined && value > definition.max) {
          return { valid: false, error: `Set count must be at most ${definition.max}` };
        }
      } else if (definition.setType === "elements") {
        // Elements sets should have an array of SetElementValue
        if (!Array.isArray(value)) {
          return { valid: false, error: "Elements set value must be an array" };
        }
        // Validate each element in the array
        const setElementIds = definition.setElements || [];
        for (const elementValue of value as SetElementValue[]) {
          if (!elementValue.elementVariableDefinitionId) {
            return { valid: false, error: "Set element must have an elementVariableDefinitionId" };
          }
          if (!setElementIds.includes(elementValue.elementVariableDefinitionId)) {
            return { valid: false, error: `Set element ${elementValue.elementVariableDefinitionId} is not defined in set` };
          }
          if (typeof elementValue.quantity !== "number" || isNaN(elementValue.quantity)) {
            return { valid: false, error: "Set element quantity must be a number" };
          }
          if (elementValue.quantity < 0) {
            return { valid: false, error: "Set element quantity cannot be negative" };
          }
        }
      }
      break;
  }

  return { valid: true };
};

