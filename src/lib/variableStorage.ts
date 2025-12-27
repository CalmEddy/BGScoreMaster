import { AppState, VariableDefinition, VariableValue, Player, Session } from "../state/types";

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
  return variable?.value;
};

export const initializeVariablesFromTemplate = (
  template: { variableDefinitions: VariableDefinition[] },
  sessionId: string,
  players: Player[]
): VariableValue[] => {
  const variables: VariableValue[] = [];
  const now = Date.now();

  template.variableDefinitions.forEach((varDef) => {
    // Determine if variable is per-player or per-session
    // Check category or name patterns to determine scope
    const isSessionVariable = 
      varDef.category?.toLowerCase().includes("session") ||
      varDef.category?.toLowerCase().includes("global") ||
      varDef.name.toLowerCase().includes("phase") ||
      varDef.name.toLowerCase().includes("round") ||
      varDef.name.toLowerCase().includes("turn") ||
      varDef.type === "string"; // String variables are typically session-level

    if (isSessionVariable) {
      // Create one session-level variable
      variables.push({
        id: `${varDef.id}-session-${sessionId}`,
        sessionId,
        variableDefinitionId: varDef.id,
        playerId: undefined,
        value: varDef.defaultValue ?? getDefaultValueForType(varDef.type),
        updatedAt: now,
        updatedBy: "manual",
      });
    } else {
      // Create per-player variables
      players.forEach((player) => {
        variables.push({
          id: `${varDef.id}-${player.id}`,
          sessionId,
          variableDefinitionId: varDef.id,
          playerId: player.id,
          value: varDef.defaultValue ?? getDefaultValueForType(varDef.type),
          updatedAt: now,
          updatedBy: "manual",
        });
      });
    }
  });

  return variables;
};

const getDefaultValueForType = (type: VariableDefinition["type"]): any => {
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
  }

  return { valid: true };
};

