import { AppState, ScoringRule, ScoreEntry } from "../state/types";
import { computeCategoryTotals, computePlayerTotal } from "./calculations";
import { createId } from "./id";
import { getObjectValue } from "./objectStorage";

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
      leftValue = computePlayerTotal(state, sessionId, playerId, currentRoundId);
      break;
    case "category":
      if (!condition.categoryId) return false;
      const categoryTotals = computeCategoryTotals(state, sessionId, playerId, currentRoundId);
      // Check if it's a category or an object
      if (categoryTotals[condition.categoryId] !== undefined) {
        leftValue = categoryTotals[condition.categoryId] ?? 0;
      } else {
        // Try to resolve as object
        const session = state.sessions[sessionId];
        const template = session?.templateId ? state.templates[session.templateId] : undefined;
        if (template) {
          const varDef = template.objectDefinitions.find(
            (v) => v.name.toLowerCase() === condition.categoryId?.toLowerCase() || v.id === condition.categoryId
          );
          if (varDef) {
            // Try player object first
            const playerVar = getObjectValue(state, sessionId, varDef.id, playerId);
            if (playerVar !== undefined && typeof playerVar === "number") {
              leftValue = playerVar;
            } else {
              // Try session object
              const sessionVar = getObjectValue(state, sessionId, varDef.id);
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

  const categoryTotals = computeCategoryTotals(state, sessionId, playerId, currentRoundId);
  const currentTotal = computePlayerTotal(state, sessionId, playerId, currentRoundId);
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

  // Always get fresh template from state - don't cache it
  // Get rules from session, but also check if they still exist in the template
  // This ensures that if a rule was removed from the template, it won't be evaluated
  const template = session.templateId ? state.templates[session.templateId] : undefined;
  
  // If template doesn't exist or has no rules, don't evaluate any rules
  if (!template || !template.ruleTemplates || template.ruleTemplates.length === 0) {
    return [];
  }

  const rules = (session.ruleIds || [])
    .map((id) => state.rules[id])
    .filter((rule): rule is ScoringRule => {
      if (!rule || !rule.enabled) return false;
      // Only include rules that still exist in the template
      // Match by condition/action since session rules have different IDs than template rules
      const matchesTemplateRule = template.ruleTemplates.some((templateRule) => {
        return (
          templateRule.condition.type === rule.condition.type &&
          templateRule.condition.operator === rule.condition.operator &&
          templateRule.condition.value === rule.condition.value &&
          templateRule.condition.categoryId === rule.condition.categoryId &&
          templateRule.condition.roundId === rule.condition.roundId &&
          templateRule.action.type === rule.action.type &&
          templateRule.action.value === rule.action.value &&
          templateRule.action.targetCategoryId === rule.action.targetCategoryId &&
          templateRule.enabled
        );
      });
      return matchesTemplateRule;
    });

  const context: RuleEvaluationContext = {
    playerId,
    sessionId,
    state,
    currentRoundId,
  };

  const entries: ScoreEntry[] = [];

  for (const rule of rules) {
    try {
      const conditionMet = evaluateCondition(rule.condition, context);
      console.debug(`Rule "${rule.name}": condition met=${conditionMet} for player ${playerId}`);
      if (conditionMet) {
        const entry = applyRuleAction(rule, context);
        if (entry) {
          console.debug(`Rule "${rule.name}" creating entry: playerId=${entry.playerId}, value=${entry.value}`);
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
