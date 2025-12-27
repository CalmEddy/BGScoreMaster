import { AppState, Category, ScoreEntry } from "../state/types";
import { evaluateFormula } from "./formulaParser";
import { getVariableValue } from "./variableStorage";

export const getSessionEntries = (state: AppState, sessionId: string): ScoreEntry[] =>
  Object.values(state.entries).filter((entry) => entry.sessionId === sessionId);

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

  // Recursively compute parent totals from children
  const computeParentTotal = (categoryId: string): number => {
    const children = childrenByParent[categoryId] || [];
    if (children.length === 0) {
      return result[categoryId] ?? 0;
    }

    let total = 0;
    children.forEach((child) => {
      total += computeParentTotal(child.id);
    });
    result[categoryId] = total;
    return total;
  };

  // Compute all parent categories
  categories.forEach((cat) => {
    if (cat.parentCategoryId) {
      computeParentTotal(cat.parentCategoryId);
    }
  });

  return result;
};

// Apply formulas to categories
const applyFormulas = (
  state: AppState,
  sessionId: string,
  categoryTotals: Record<string, number>,
  playerId: string
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
      const getCategoryValue = (categoryId: string): number => {
        // Handle special variables
        if (categoryId === "total") {
          return Object.values(result).reduce((sum, val) => sum + val, 0);
        }
        return result[categoryId] ?? 0;
      };

      const resolveVariable = (variableName: string): number | undefined => {
        // Try to find variable by name from template
        if (template) {
          const varDef = template.variableDefinitions.find(
            (v) => v.name.toLowerCase() === variableName.toLowerCase() || v.id === variableName
          );
          if (varDef) {
            // Try player variable first
            const playerVar = getVariableValue(state, sessionId, varDef.id, playerId);
            if (playerVar !== undefined && typeof playerVar === "number") {
              return playerVar;
            }
            // Try session variable
            const sessionVar = getVariableValue(state, sessionId, varDef.id);
            if (sessionVar !== undefined && typeof sessionVar === "number") {
              return sessionVar;
            }
          }
        }
        return undefined;
      };

      const value = evaluateFormula(
        category.formula,
        {
          categories: result,
          total: Object.values(result).reduce((sum, val) => sum + val, 0),
        },
        getCategoryValue,
        resolveVariable
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

  categories.forEach((category) => {
    const baseTotal = categoryTotals[category.id] ?? 0;
    if (category.displayType === "weighted" && category.weight) {
      result[category.id] = baseTotal * category.weight;
    } else {
      result[category.id] = baseTotal;
    }
  });

  return result;
};

export const computeCategoryTotals = (
  state: AppState,
  sessionId: string,
  playerId: string
): Record<string, number> => {
  // Step 1: Compute base totals from entries
  let totals = computeBaseCategoryTotals(state, sessionId, playerId);

  // Step 2: Compute nested category totals (parents from children)
  totals = computeNestedCategoryTotals(state, sessionId, totals);

  // Step 3: Apply formulas
  totals = applyFormulas(state, sessionId, totals, playerId);

  // Step 4: Apply weights
  totals = applyWeights(state, sessionId, totals);

  return totals;
};

export const computePlayerTotal = (state: AppState, sessionId: string, playerId: string): number => {
  const categoryTotals = computeCategoryTotals(state, sessionId, playerId);
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

export const formatCategoryName = (
  categories: Record<string, Category>,
  categoryId: string | undefined
): string => {
  if (!categoryId) return "Uncategorized";
  return categories[categoryId]?.name ?? "(deleted)";
};

