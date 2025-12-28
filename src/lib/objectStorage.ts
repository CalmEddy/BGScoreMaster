import { AppState, GameObjectDefinition, GameObjectValue, Player, GameObjectOwnership, ID, SetElementValue } from "../state/types";
import { getGameObjectState as getObjState, evaluateActiveWindow } from "./objectCalculator";

export const getPlayerObjects = (
  state: AppState,
  sessionId: string,
  playerId: string
): GameObjectValue[] => {
  const session = state.sessions[sessionId];
  if (!session || !session.objectValueIds) return [];

  return session.objectValueIds
    .map((id) => state.objectValues[id])
    .filter((v) => v && v.playerId === playerId);
};

export const getSessionObjects = (
  state: AppState,
  sessionId: string
): GameObjectValue[] => {
  const session = state.sessions[sessionId];
  if (!session || !session.objectValueIds) return [];

  return session.objectValueIds
    .map((id) => state.objectValues[id])
    .filter((v) => v && !v.playerId);
};

export const getAllObjects = (
  state: AppState,
  sessionId: string
): GameObjectValue[] => {
  const session = state.sessions[sessionId];
  if (!session || !session.objectValueIds) return [];

  return session.objectValueIds
    .map((id) => state.objectValues[id])
    .filter(Boolean);
};

export const getObjectByDefinition = (
  state: AppState,
  sessionId: string,
  objectDefinitionId: string,
  playerId?: string
): GameObjectValue | undefined => {
  const session = state.sessions[sessionId];
  if (!session || !session.objectValueIds) return undefined;

  return session.objectValueIds
    .map((id) => state.objectValues[id])
    .find(
      (v) =>
        v &&
        v.objectDefinitionId === objectDefinitionId &&
        v.playerId === playerId
    );
};

export const getObjectValue = (
  state: AppState,
  sessionId: string,
  objectDefinitionId: string,
  playerId?: string
): any => {
  const objectValue = getObjectByDefinition(state, sessionId, objectDefinitionId, playerId);
  if (!objectValue) return undefined;
  
  // If object has computed value, return that
  if (objectValue.computedValue !== undefined) {
    return objectValue.computedValue;
  }
  
  return objectValue.value;
};

/**
 * Gets the state of an object (re-export from objectCalculator)
 */
export { getObjState as getGameObjectState };

/**
 * Filters objects by ownership type
 */
export const getObjectsByOwnership = (
  state: AppState,
  sessionId: string,
  ownership: GameObjectOwnership
): GameObjectValue[] => {
  const session = state.sessions[sessionId];
  if (!session || !session.objectValueIds) return [];

  const template = session.templateId ? state.templates[session.templateId] : undefined;
  if (!template) return [];

  return session.objectValueIds
    .map((id) => state.objectValues[id])
    .filter((v) => {
      if (!v) return false;
      const objDef = template.objectDefinitions.find((vd) => vd.id === v.objectDefinitionId);
      if (!objDef) return false;
      const objOwnership = objDef.ownership || (objDef.type === "string" ? "global" : "player");
      return objOwnership === ownership;
    });
};

/**
 * Filters objects by active window
 */
export const getActiveObjects = (
  state: AppState,
  sessionId: string,
  currentRoundId?: ID,
  playerId?: ID
): GameObjectValue[] => {
  const session = state.sessions[sessionId];
  if (!session || !session.objectValueIds) return [];

  const template = session.templateId ? state.templates[session.templateId] : undefined;
  if (!template) return [];

  return session.objectValueIds
    .map((id) => state.objectValues[id])
    .filter((v) => {
      if (!v) return false;
      const objDef = template.objectDefinitions.find((vd) => vd.id === v.objectDefinitionId);
      if (!objDef) return false;
      
      const context = {
        state,
        sessionId,
        playerId,
        currentRoundId,
      };
      
      return evaluateActiveWindow(objDef, context);
    });
};

export const initializeObjectsFromTemplate = (
  template: { objectDefinitions: GameObjectDefinition[] },
  sessionId: string,
  players: Player[]
): GameObjectValue[] => {
  const objects: GameObjectValue[] = [];
  const now = Date.now();

  template.objectDefinitions.forEach((objDef) => {
    // Use ownership property if defined, otherwise fall back to heuristics
    const ownership = objDef.ownership || (objDef.type === "string" ? "global" : "player");
    
    if (ownership === "global" || ownership === "inactive") {
      // Create one session-level object
      objects.push({
        id: `${objDef.id}-session-${sessionId}`,
        sessionId,
        objectDefinitionId: objDef.id,
        playerId: undefined,
        value: objDef.defaultValue ?? getDefaultValueForType(objDef.type, objDef),
        updatedAt: now,
        updatedBy: "manual",
      });
    } else if (ownership === "player") {
      // Create per-player objects
      players.forEach((player) => {
        objects.push({
          id: `${objDef.id}-${player.id}`,
          sessionId,
          objectDefinitionId: objDef.id,
          playerId: player.id,
          value: objDef.defaultValue ?? getDefaultValueForType(objDef.type, objDef),
          updatedAt: now,
          updatedBy: "manual",
        });
      });
    } else if (ownership.type === "object") {
      // Object-based ownership - initialize as inactive for now
      // Will be evaluated dynamically
      objects.push({
        id: `${objDef.id}-session-${sessionId}`,
        sessionId,
        objectDefinitionId: objDef.id,
        playerId: undefined,
        value: objDef.defaultValue ?? getDefaultValueForType(objDef.type, objDef),
        updatedAt: now,
        updatedBy: "manual",
        state: "inactive",
      });
    }
  });

  return objects;
};

const getDefaultValueForType = (type: GameObjectDefinition["type"], objDef?: GameObjectDefinition): any => {
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
      if (objDef?.setType === "identical") {
        return 0; // Count for identical sets
      } else {
        return []; // Empty array for elements sets
      }
    default:
      return 0;
  }
};

export const validateGameObjectValue = (
  value: any,
  definition: GameObjectDefinition
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
        return { valid: false, error: "Set object must have a setType defined" };
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
          if (!elementValue.elementObjectDefinitionId) {
            return { valid: false, error: "Set element must have an elementObjectDefinitionId" };
          }
          if (!setElementIds.includes(elementValue.elementObjectDefinitionId)) {
            return { valid: false, error: `Set element ${elementValue.elementObjectDefinitionId} is not defined in set` };
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
