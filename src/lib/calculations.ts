import { AppState, Category, ScoreEntry } from "../state/types";
import { evaluateFormula, ExtendedFormulaContext } from "./formulaParser";
import { getVariableValue } from "./variableStorage";
import { evaluateAllVariables } from "./variableEvaluation";
import { getVariableState as getVarState } from "./variableCalculator";

export const getSessionEntries = (state: AppState, sessionId: string): ScoreEntry[] =>
  Object.values(state.entries || {}).filter((entry) => entry.sessionId === sessionId);

// Compute base category totals from entries (before formulas/weights)
const computeBaseCategoryTotals = (
  state: AppState,
  sessionId: string,
  playerId: string
): Record<string, number> => {
  const totals: Record<string, number> = {};
  getSessionEntries(state, sessionId)
    .filter((entry) => entry.playerId === playerId)
    .forEach((entry) => {
      const key = entry.categoryId ?? "uncategorized";
      totals[key] = (totals[key] ?? 0) + entry.value;
    });
  return totals;
};

// Compute nested category totals (parent = sum of children)
const computeNestedCategoryTotals = (
  state: AppState,
  sessionId: string,
  categoryTotals: Record<string, number>
): Record<string, number> => {
  const result = { ...categoryTotals };
  const categories = Object.values(state.categories).filter((c) => c.sessionId === sessionId);

  // Build parent-child relationships
  const childrenByParent: Record<string, Category[]> = {};
  categories.forEach((cat) => {
    if (cat.parentCategoryId) {
      if (!childrenByParent[cat.parentCategoryId]) {
        childrenByParent[cat.parentCategoryId] = [];
      }
      childrenByParent[cat.parentCategoryId].push(cat);
    }
  });

  // Track which categories we've already computed to avoid duplicate work
  const computed = new Set<string>();

  // Recursively compute parent totals from children
  const computeParentTotal = (categoryId: string): number => {
    // If already computed, return cached value
    if (computed.has(categoryId)) {
      return result[categoryId] ?? 0;
    }

    const children = childrenByParent[categoryId] || [];
    if (children.length === 0) {
      // Leaf category - return its value from entries
      computed.add(categoryId);
      return result[categoryId] ?? 0;
    }

    // Parent category - sum all children
    let total = 0;
    children.forEach((child) => {
      total += computeParentTotal(child.id);
    });
    result[categoryId] = total;
    computed.add(categoryId);
    return total;
  };

  // Only compute parent totals for categories that have entries (or children with entries)
  // This ensures we don't add parent categories that shouldn't be in the result
  Object.keys(categoryTotals).forEach((categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    if (category?.parentCategoryId) {
      computeParentTotal(category.parentCategoryId);
    }
  });

  return result;
};

// Apply formulas to categories
const applyFormulas = (
  state: AppState,
  sessionId: string,
  categoryTotals: Record<string, number>,
  playerId: string,
  currentRoundId?: string
): Record<string, number> => {
  const result = { ...categoryTotals };
  const categories = Object.values(state.categories).filter(
    (c) => c.sessionId === sessionId && c.displayType === "formula" && c.formula
  );

  const session = state.sessions[sessionId];
  const template = session?.templateId ? state.templates[session.templateId] : undefined;

  categories.forEach((category) => {
    if (!category.formula) return;

    try {
      const getCategoryValue = (categoryNameOrId: string): number => {
        // Handle special variables
        if (categoryNameOrId === "total") {
          return Object.values(result).reduce((sum, val) => sum + val, 0);
        }
        // Try to find category by name first, then by ID (for backward compatibility)
        const categories = Object.values(state.categories).filter((c) => c.sessionId === sessionId);
        const category = categories.find(
          (cat) => cat.name.toLowerCase() === categoryNameOrId.toLowerCase() || cat.id === categoryNameOrId
        );
        if (category) {
          return result[category.id] ?? 0;
        }
        // If not found, try direct lookup (for backward compatibility with old formulas using IDs)
        return result[categoryNameOrId] ?? 0;
      };

      const resolveVariable = (variableName: string): number | undefined => {
        // Try to find variable by name from template
        if (template) {
          const varDef = template.variableDefinitions.find(
            (v) => v.name.toLowerCase() === variableName.toLowerCase() || v.id === variableName
          );
          if (varDef) {
            // Try player variable first (returns computed value if available)
            const playerVar = getVariableValue(state, sessionId, varDef.id, playerId);
            if (playerVar !== undefined) {
              // Handle set types - convert to number for formulas
              if (varDef.type === "set") {
                if (varDef.setType === "identical") {
                  return typeof playerVar === "number" ? playerVar : 0;
                } else if (varDef.setType === "elements") {
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
            const sessionVar = getVariableValue(state, sessionId, varDef.id);
            if (sessionVar !== undefined) {
              // Handle set types - convert to number for formulas
              if (varDef.type === "set") {
                if (varDef.setType === "identical") {
                  return typeof sessionVar === "number" ? sessionVar : 0;
                } else if (varDef.setType === "elements") {
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

      // Enhanced context with variable state and ownership functions
      const session = state.sessions[sessionId];
      const getRoundIndex = (): number => {
        if (currentRoundId) {
          const round = state.rounds[currentRoundId];
          return round?.index || 0;
        }
        return 0;
      };

      const extendedContext: ExtendedFormulaContext = {
        categories: result,
        total: Object.values(result).reduce((sum, val) => sum + val, 0),
        round: getRoundIndex(),
        getVariableState: (varName: string) => {
          if (template) {
            const varDef = template.variableDefinitions.find(
              (v) => v.name.toLowerCase() === varName.toLowerCase() || v.id === varName
            );
            if (varDef) {
              return getVarState(state, sessionId, varDef.id, playerId);
            }
          }
          return "inactive";
        },
        ownsVariable: (varName: string, checkPlayerId?: string) => {
          if (template) {
            const varDef = template.variableDefinitions.find(
              (v) => v.name.toLowerCase() === varName.toLowerCase() || v.id === varName
            );
            if (varDef) {
              const targetPlayerId = checkPlayerId || playerId;
              const varState = getVarState(state, sessionId, varDef.id, targetPlayerId);
              return varState === "owned" || varState === "active";
            }
          }
          return false;
        },
        getRoundIndex: getRoundIndex,
        getPhaseId: () => undefined, // Phase support is future
      };

      const value = evaluateFormula(
        category.formula,
        {
          categories: result,
          total: Object.values(result).reduce((sum, val) => sum + val, 0),
          round: getRoundIndex(),
        },
        getCategoryValue,
        resolveVariable,
        extendedContext
      );

      result[category.id] = value;
    } catch (error) {
      // If formula fails, keep the base total
      console.warn(`Formula error for category ${category.name}:`, error);
    }
  });

  return result;
};

// Apply weights to categories
const applyWeights = (
  state: AppState,
  sessionId: string,
  categoryTotals: Record<string, number>
): Record<string, number> => {
  const result: Record<string, number> = {};
  const categories = Object.values(state.categories).filter((c) => c.sessionId === sessionId);

  // Process all category totals, preserving entries even if category doesn't exist
  Object.entries(categoryTotals).forEach(([categoryId, baseTotal]) => {
    const category = categories.find((c) => c.id === categoryId);
    let finalTotal = baseTotal;
    
    if (category) {
      // Category exists - apply weight if needed
      if (category.displayType === "weighted" && category.weight) {
        finalTotal = baseTotal * category.weight;
      }
    }
    // Category doesn't exist (e.g., "uncategorized" or invalid categoryId) - preserve the total
    
    result[categoryId] = finalTotal;
  });

  return result;
};

export const computeCategoryTotals = (
  state: AppState,
  sessionId: string,
  playerId: string,
  currentRoundId?: string
): Record<string, number> => {
  // Step 0: Evaluate variables first (this updates computed values and applies score impacts)
  // Note: Variable score impacts create ScoreEntry objects, which will be included in base totals
  const { updatedVariables, scoreEntries } = evaluateAllVariables(state, sessionId, currentRoundId);
  
  // If variables were updated, we'd need to update state, but for now we'll work with current state
  // The score entries from variable impacts will be included in the next evaluation cycle

  // Step 1: Compute base totals from entries (including any score entries from variable impacts)
  let totals = computeBaseCategoryTotals(state, sessionId, playerId);

  // Step 2: Compute nested category totals (parents from children)
  totals = computeNestedCategoryTotals(state, sessionId, totals);

  // Step 3: Apply formulas (with enhanced variable support)
  totals = applyFormulas(state, sessionId, totals, playerId, currentRoundId);

  // Step 4: Apply weights
  totals = applyWeights(state, sessionId, totals);

  return totals;
};

export const computePlayerTotal = (state: AppState, sessionId: string, playerId: string, currentRoundId?: string): number => {
  const categoryTotals = computeCategoryTotals(state, sessionId, playerId, currentRoundId);
  return Object.values(categoryTotals).reduce((sum, total) => sum + total, 0);
};

export const findWinners = (totals: Record<string, number>, direction: "higherWins" | "lowerWins") => {
  const values = Object.values(totals);
  if (!values.length) return [] as string[];
  const target = direction === "higherWins" ? Math.max(...values) : Math.min(...values);
  return Object.entries(totals)
    .filter(([, value]) => value === target)
    .map(([playerId]) => playerId);
};

export const computeRoundScore = (
  state: AppState,
  sessionId: string,
  playerId: string,
  roundId: string
): number => {
  // Sum all entries for this player in this round
  const roundEntries = Object.values(state.entries || {}).filter(
    (e) => e.sessionId === sessionId && e.playerId === playerId && e.roundId === roundId
  );
  return roundEntries.reduce((sum, entry) => sum + entry.value, 0);
};

export const formatCategoryName = (
  categories: Record<string, Category>,
  categoryId: string | undefined
): string => {
  if (!categoryId) return "Uncategorized";
  return categories[categoryId]?.name ?? "(deleted)";
};

