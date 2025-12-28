import { AppState, GameObjectValue, ID, ScoreEntry } from "../state/types";
import {
  evaluateGameObjectOwnership,
  evaluateActiveWindow,
  evaluateGameObjectState,
  computeGameObjectValue,
  applyGameObjectScoreImpact,
} from "./objectCalculator";
import { getAllObjects } from "./objectStorage";
import { createId } from "./id";

type GameObjectEvaluationContext = {
  state: AppState;
  sessionId: ID;
  playerId?: ID;
  currentRoundId?: ID;
};

/**
 * Evaluates all objects for a session and updates their computed values and states
 */
export function evaluateAllObjects(
  state: AppState,
  sessionId: ID,
  currentRoundId?: ID
): { updatedObjects: GameObjectValue[]; scoreEntries: ScoreEntry[] } {
  const session = state.sessions[sessionId];
  if (!session || !session.objectValueIds) {
    return { updatedObjects: [], scoreEntries: [] };
  }

  const template = session.templateId ? state.templates[session.templateId] : undefined;
  if (!template) {
    return { updatedObjects: [], scoreEntries: [] };
  }

  const updatedObjects: GameObjectValue[] = [];
  const scoreEntries: ScoreEntry[] = [];
  const processed = new Set<ID>(); // Track processed objects to avoid duplicates

  // Evaluate objects for each player and globally
  const allPlayerIds = session.playerIds || [];
  const contexts: GameObjectEvaluationContext[] = [
    { state, sessionId, currentRoundId }, // Global context
    ...allPlayerIds.map((playerId) => ({ state, sessionId, playerId, currentRoundId })), // Per-player contexts
  ];

  for (const context of contexts) {
    const objects = context.playerId
      ? getAllObjects(state, sessionId).filter((v) => v.playerId === context.playerId)
      : getAllObjects(state, sessionId).filter((v) => !v.playerId);

    for (const objectValue of objects) {
      if (processed.has(objectValue.id)) continue;
      processed.add(objectValue.id);

      const varDef = template.objectDefinitions.find((vd) => vd.id === objectValue.objectDefinitionId);
      if (!varDef) continue;

      // Evaluate state
      const newState = evaluateGameObjectState(varDef, objectValue, context);
      evaluateGameObjectOwnership(varDef, context);
      const isActive = evaluateActiveWindow(varDef, context);

      // Update object if state changed or needs computation
      let updatedObject: GameObjectValue = { ...objectValue };
      let needsUpdate = false;

      if (updatedObject.state !== newState) {
        updatedObject.state = newState;
        needsUpdate = true;
      }

      // Compute value if object has calculation formula and is active
      if (varDef.calculation && isActive && (newState === "active" || newState === "owned")) {
        try {
          const computedValue = computeGameObjectValue(varDef, objectValue, context);
          if (updatedObject.computedValue !== computedValue) {
            updatedObject.computedValue = computedValue;
            updatedObject.lastComputedAt = Date.now();
            needsUpdate = true;
          }
        } catch (error) {
          console.warn(`Error computing object ${varDef.name}:`, error);
        }
      }

      // Apply score impact if object has scoreImpact formula
      if (varDef.scoreImpact && isActive && context.playerId && (newState === "active" || newState === "owned")) {
        try {
          const scoreImpact = applyGameObjectScoreImpact(varDef, updatedObject, context);
          if (Math.abs(scoreImpact) > 0.001) {
            // Create score entry for the impact
            const entry: ScoreEntry = {
              id: createId(),
              sessionId,
              playerId: context.playerId,
              createdAt: Date.now(),
              value: scoreImpact,
              roundId: currentRoundId,
              note: `Auto: ${varDef.name} score impact`,
              source: "ruleEngine",
            };
            scoreEntries.push(entry);
          }
        } catch (error) {
          console.warn(`Error applying score impact for object ${varDef.name}:`, error);
        }
      }

      if (needsUpdate) {
        updatedObjects.push(updatedObject);
      }
    }
  }

  return { updatedObjects, scoreEntries };
}

/**
 * Evaluates a single object and returns updated value
 */
export function evaluateGameObject(
  state: AppState,
  sessionId: ID,
  objectValueId: ID,
  currentRoundId?: ID
): GameObjectValue | null {
  const objectValue = state.objectValues[objectValueId];
  if (!objectValue) return null;

  const session = state.sessions[sessionId];
  const template = session?.templateId ? state.templates[session.templateId] : undefined;
  if (!template) return null;

  const varDef = template.objectDefinitions.find((vd) => vd.id === objectValue.objectDefinitionId);
  if (!varDef) return null;

  const context: GameObjectEvaluationContext = {
    state,
    sessionId,
    playerId: objectValue.playerId,
    currentRoundId,
  };

  const newState = evaluateGameObjectState(varDef, objectValue, context);
  const isActive = evaluateActiveWindow(varDef, context);

  let updatedObject: GameObjectValue = { ...objectValue };
  let needsUpdate = false;

  if (updatedObject.state !== newState) {
    updatedObject.state = newState;
    needsUpdate = true;
  }

  if (varDef.calculation && isActive && (newState === "active" || newState === "owned")) {
    try {
      const computedValue = computeGameObjectValue(varDef, objectValue, context);
      if (updatedObject.computedValue !== computedValue) {
        updatedObject.computedValue = computedValue;
        updatedObject.lastComputedAt = Date.now();
        needsUpdate = true;
      }
    } catch (error) {
      console.warn(`Error computing object ${varDef.name}:`, error);
    }
  }

  return needsUpdate ? updatedObject : null;
}

/**
 * Gets score entries from object score impacts
 */
export function getGameObjectScoreEntries(
  state: AppState,
  sessionId: ID,
  playerId: ID,
  currentRoundId?: ID
): ScoreEntry[] {
  const session = state.sessions[sessionId];
  if (!session) return [];

  const template = session.templateId ? state.templates[session.templateId] : undefined;
  if (!template) return [];

  const scoreEntries: ScoreEntry[] = [];
  const objects = getAllObjects(state, sessionId).filter((v) => v.playerId === playerId);

  const context: GameObjectEvaluationContext = {
    state,
    sessionId,
    playerId,
    currentRoundId,
  };

  for (const objectValue of objects) {
    const varDef = template.objectDefinitions.find((vd) => vd.id === objectValue.objectDefinitionId);
    if (!varDef || !varDef.scoreImpact) continue;

    const newState = evaluateGameObjectState(varDef, objectValue, context);
    const isActive = evaluateActiveWindow(varDef, context);

    if (isActive && (newState === "active" || newState === "owned")) {
      try {
        const scoreImpact = applyGameObjectScoreImpact(varDef, objectValue, context);
        if (Math.abs(scoreImpact) > 0.001) {
          const entry: ScoreEntry = {
            id: createId(),
            sessionId,
            playerId,
            createdAt: Date.now(),
            value: scoreImpact,
            roundId: currentRoundId,
            note: `Auto: ${varDef.name} score impact`,
            source: "ruleEngine",
          };
          scoreEntries.push(entry);
        }
      } catch (error) {
        console.warn(`Error applying score impact for object ${varDef.name}:`, error);
      }
    }
  }

  return scoreEntries;
}
