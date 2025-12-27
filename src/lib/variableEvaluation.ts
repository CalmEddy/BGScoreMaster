import { AppState, VariableDefinition, VariableValue, ID, ScoreEntry } from "../state/types";
import {
  evaluateVariableOwnership,
  evaluateActiveWindow,
  evaluateVariableState,
  computeVariableValue,
  applyVariableScoreImpact,
} from "./variableCalculator";
import { getVariableByDefinition, getAllVariables } from "./variableStorage";
import { createId } from "./id";

type VariableEvaluationContext = {
  state: AppState;
  sessionId: ID;
  playerId?: ID;
  currentRoundId?: ID;
};

/**
 * Evaluates all variables for a session and updates their computed values and states
 */
export function evaluateAllVariables(
  state: AppState,
  sessionId: ID,
  currentRoundId?: ID
): { updatedVariables: VariableValue[]; scoreEntries: ScoreEntry[] } {
  const session = state.sessions[sessionId];
  if (!session || !session.variableValueIds) {
    return { updatedVariables: [], scoreEntries: [] };
  }

  const template = session.templateId ? state.templates[session.templateId] : undefined;
  if (!template) {
    return { updatedVariables: [], scoreEntries: [] };
  }

  const updatedVariables: VariableValue[] = [];
  const scoreEntries: ScoreEntry[] = [];
  const processed = new Set<ID>(); // Track processed variables to avoid duplicates

  // Evaluate variables for each player and globally
  const allPlayerIds = session.playerIds || [];
  const contexts: VariableEvaluationContext[] = [
    { state, sessionId, currentRoundId }, // Global context
    ...allPlayerIds.map((playerId) => ({ state, sessionId, playerId, currentRoundId })), // Per-player contexts
  ];

  for (const context of contexts) {
    const variables = context.playerId
      ? getAllVariables(state, sessionId).filter((v) => v.playerId === context.playerId)
      : getAllVariables(state, sessionId).filter((v) => !v.playerId);

    for (const varValue of variables) {
      if (processed.has(varValue.id)) continue;
      processed.add(varValue.id);

      const varDef = template.variableDefinitions.find((vd) => vd.id === varValue.variableDefinitionId);
      if (!varDef) continue;

      // Evaluate state
      const newState = evaluateVariableState(varDef, varValue, context);
      const ownership = evaluateVariableOwnership(varDef, context);
      const isActive = evaluateActiveWindow(varDef, context);

      // Update variable if state changed or needs computation
      let updatedVar: VariableValue = { ...varValue };
      let needsUpdate = false;

      if (updatedVar.state !== newState) {
        updatedVar.state = newState;
        needsUpdate = true;
      }

      // Compute value if variable has calculation formula and is active
      if (varDef.calculation && isActive && (newState === "active" || newState === "owned")) {
        try {
          const computedValue = computeVariableValue(varDef, varValue, context);
          if (updatedVar.computedValue !== computedValue) {
            updatedVar.computedValue = computedValue;
            updatedVar.lastComputedAt = Date.now();
            needsUpdate = true;
          }
        } catch (error) {
          console.warn(`Error computing variable ${varDef.name}:`, error);
        }
      }

      // Apply score impact if variable has scoreImpact formula
      if (varDef.scoreImpact && isActive && context.playerId && (newState === "active" || newState === "owned")) {
        try {
          const scoreImpact = applyVariableScoreImpact(varDef, updatedVar, context);
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
          console.warn(`Error applying score impact for variable ${varDef.name}:`, error);
        }
      }

      if (needsUpdate) {
        updatedVariables.push(updatedVar);
      }
    }
  }

  return { updatedVariables, scoreEntries };
}

/**
 * Evaluates a single variable and returns updated value
 */
export function evaluateVariable(
  state: AppState,
  sessionId: ID,
  variableValueId: ID,
  currentRoundId?: ID
): VariableValue | null {
  const varValue = state.variableValues[variableValueId];
  if (!varValue) return null;

  const session = state.sessions[sessionId];
  const template = session?.templateId ? state.templates[session.templateId] : undefined;
  if (!template) return null;

  const varDef = template.variableDefinitions.find((vd) => vd.id === varValue.variableDefinitionId);
  if (!varDef) return null;

  const context: VariableEvaluationContext = {
    state,
    sessionId,
    playerId: varValue.playerId,
    currentRoundId,
  };

  const newState = evaluateVariableState(varDef, varValue, context);
  const isActive = evaluateActiveWindow(varDef, context);

  let updatedVar: VariableValue = { ...varValue };
  let needsUpdate = false;

  if (updatedVar.state !== newState) {
    updatedVar.state = newState;
    needsUpdate = true;
  }

  if (varDef.calculation && isActive && (newState === "active" || newState === "owned")) {
    try {
      const computedValue = computeVariableValue(varDef, varValue, context);
      if (updatedVar.computedValue !== computedValue) {
        updatedVar.computedValue = computedValue;
        updatedVar.lastComputedAt = Date.now();
        needsUpdate = true;
      }
    } catch (error) {
      console.warn(`Error computing variable ${varDef.name}:`, error);
    }
  }

  return needsUpdate ? updatedVar : null;
}

/**
 * Gets score entries from variable score impacts
 */
export function getVariableScoreEntries(
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
  const variables = getAllVariables(state, sessionId).filter((v) => v.playerId === playerId);

  const context: VariableEvaluationContext = {
    state,
    sessionId,
    playerId,
    currentRoundId,
  };

  for (const varValue of variables) {
    const varDef = template.variableDefinitions.find((vd) => vd.id === varValue.variableDefinitionId);
    if (!varDef || !varDef.scoreImpact) continue;

    const newState = evaluateVariableState(varDef, varValue, context);
    const isActive = evaluateActiveWindow(varDef, context);

    if (isActive && (newState === "active" || newState === "owned")) {
      try {
        const scoreImpact = applyVariableScoreImpact(varDef, varValue, context);
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
        console.warn(`Error applying score impact for variable ${varDef.name}:`, error);
      }
    }
  }

  return scoreEntries;
}

