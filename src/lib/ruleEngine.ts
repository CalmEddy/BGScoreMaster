import { AppState, ScoringRule, ScoreEntry } from "../state/types";
import { computeCategoryTotals, computePlayerTotal } from "./calculations";
import { createId } from "./id";
import { getVariableValue } from "./variableStorage";

type RuleEvaluationContext = {
  playerId: string;
  sessionId: string;
  state: AppState;
  currentRoundId?: string;
};

// Evaluate a single rule condition
function evaluateCondition(
  condition: ScoringRule["condition"],
  context: RuleEvaluationContext
): boolean {
  const { playerId, sessionId, state, currentRoundId } = context;

  let leftValue: number;

  switch (condition.type) {
    case "total":
      leftValue = computePlayerTotal(state, sessionId, playerId);
      break;
    case "category":
      if (!condition.categoryId) return false;
      const categoryTotals = computeCategoryTotals(state, sessionId, playerId);
      // Check if it's a category or a variable
      if (categoryTotals[condition.categoryId] !== undefined) {
        leftValue = categoryTotals[condition.categoryId] ?? 0;
      } else {
        // Try to resolve as variable
        const session = state.sessions[sessionId];
        const template = session?.templateId ? state.templates[session.templateId] : undefined;
        if (template) {
          const varDef = template.variableDefinitions.find(
            (v) => v.name.toLowerCase() === condition.categoryId?.toLowerCase() || v.id === condition.categoryId
          );
          if (varDef) {
            // Try player variable first
            const playerVar = getVariableValue(state, sessionId, varDef.id, playerId);
            if (playerVar !== undefined && typeof playerVar === "number") {
              leftValue = playerVar;
            } else {
              // Try session variable
              const sessionVar = getVariableValue(state, sessionId, varDef.id);
              if (sessionVar !== undefined && typeof sessionVar === "number") {
                leftValue = sessionVar;
              } else {
                return false;
              }
            }
          } else {
            return false;
          }
        } else {
          return false;
        }
      }
      break;
    case "round":
      // Count entries in specific round
      const roundEntries = Object.values(state.entries).filter(
        (e) =>
          e.sessionId === sessionId &&
          e.playerId === playerId &&
          e.roundId === condition.roundId
      );
      leftValue = roundEntries.length;
      break;
    default:
      return false;
  }

  const rightValue = condition.value;

  switch (condition.operator) {
    case ">=":
      return leftValue >= rightValue;
    case "<=":
      return leftValue <= rightValue;
    case "==":
      return Math.abs(leftValue - rightValue) < 0.001; // Float comparison
    case "!=":
      return Math.abs(leftValue - rightValue) >= 0.001;
    case ">":
      return leftValue > rightValue;
    case "<":
      return leftValue < rightValue;
    default:
      return false;
  }
}

// Apply a rule action and create entry
function applyRuleAction(
  rule: ScoringRule,
  context: RuleEvaluationContext
): ScoreEntry | null {
  const { playerId, sessionId, state, currentRoundId } = context;

  const categoryTotals = computeCategoryTotals(state, sessionId, playerId);
  const currentTotal = computePlayerTotal(state, sessionId, playerId);
  const targetCategoryTotal = rule.action.targetCategoryId
    ? categoryTotals[rule.action.targetCategoryId] ?? 0
    : currentTotal;

  let newValue: number;

  switch (rule.action.type) {
    case "add":
      newValue = rule.action.value;
      break;
    case "multiply":
      newValue = targetCategoryTotal * rule.action.value - targetCategoryTotal;
      break;
    case "set":
      newValue = rule.action.value - targetCategoryTotal;
      break;
    default:
      return null;
  }

  // Don't create entry if value would be 0
  if (Math.abs(newValue) < 0.001) {
    return null;
  }

  const entry: ScoreEntry = {
    id: createId(),
    sessionId,
    playerId,
    createdAt: Date.now(),
    value: newValue,
    roundId: currentRoundId,
    categoryId: rule.action.targetCategoryId,
    note: `Auto: ${rule.name}`,
    source: "ruleEngine",
  };

  return entry;
}

// Evaluate all rules for a player and return entries to add
export function evaluateRules(
  state: AppState,
  sessionId: string,
  playerId: string,
  currentRoundId?: string
): ScoreEntry[] {
  const session = state.sessions[sessionId];
  if (!session) return [];

  const rules = (session.ruleIds || [])
    .map((id) => state.rules[id])
    .filter((rule): rule is ScoringRule => rule !== undefined && rule.enabled);

  const context: RuleEvaluationContext = {
    playerId,
    sessionId,
    state,
    currentRoundId,
  };

  const entries: ScoreEntry[] = [];

  for (const rule of rules) {
    try {
      if (evaluateCondition(rule.condition, context)) {
        const entry = applyRuleAction(rule, context);
        if (entry) {
          entries.push(entry);
        }
      }
    } catch (error) {
      console.warn(`Error evaluating rule ${rule.name}:`, error);
    }
  }

  return entries;
}

// Check if a rule would trigger (for preview/testing)
export function testRule(
  rule: ScoringRule,
  state: AppState,
  sessionId: string,
  playerId: string,
  currentRoundId?: string
): { wouldTrigger: boolean; entry?: ScoreEntry } {
  const context: RuleEvaluationContext = {
    playerId,
    sessionId,
    state,
    currentRoundId,
  };

  try {
    const wouldTrigger = evaluateCondition(rule.condition, context);
    let entry: ScoreEntry | undefined;
    if (wouldTrigger) {
      entry = applyRuleAction(rule, context) || undefined;
    }
    return { wouldTrigger, entry };
  } catch (error) {
    return { wouldTrigger: false };
  }
}

