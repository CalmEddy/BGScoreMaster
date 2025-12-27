import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { AppAction, AppState, Category, GameTemplate, Player, Round, ScoreEntry, ScoringRule, Session, VariableValue, VariableHistory } from "./types";
import { loadState, saveState } from "../lib/storage";
import { loadTemplates, saveTemplates } from "../lib/templateStorage";
import { initializeStarterTemplates } from "../lib/templates/starter";
import { validateVariableValue } from "../lib/variableStorage";

const initialState: AppState = {
  sessions: {},
  players: {},
  categories: {},
  rounds: {},
  entries: {},
  rules: {},
  templates: {},
  variableValues: {},
  activeSessionId: undefined,
  onboarding: {
    completed: false,
    dismissedTooltips: [],
  },
};

const AppStateContext = createContext<AppState>(initialState);
const AppDispatchContext = createContext<React.Dispatch<AppAction>>(() => undefined);

const updateSessionTimestamp = (session: Session): Session => ({
  ...session,
  updatedAt: Date.now(),
});

const reducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case "state/replace":
      return action.payload;
    case "session/create": {
      const session = action.payload;
      return {
        ...state,
        sessions: { ...state.sessions, [session.id]: session },
        activeSessionId: session.id,
      };
    }
    case "session/update": {
      const session = updateSessionTimestamp(action.payload);
      return {
        ...state,
        sessions: { ...state.sessions, [session.id]: session },
      };
    }
    case "session/activate":
      return { ...state, activeSessionId: action.payload };
    case "player/add": {
      const player = action.payload;
      return {
        ...state,
        players: { ...state.players, [player.id]: player },
      };
    }
    case "player/update": {
      const player = action.payload;
      return {
        ...state,
        players: { ...state.players, [player.id]: player },
      };
    }
    case "player/remove": {
      const { playerId, sessionId } = action.payload;
      const { [playerId]: _, ...restPlayers } = state.players;
      const session = state.sessions[sessionId];
      if (!session) return state;
      return {
        ...state,
        players: restPlayers,
        sessions: {
          ...state.sessions,
          [sessionId]: updateSessionTimestamp({
            ...session,
            playerIds: session.playerIds.filter((id) => id !== playerId),
          }),
        },
      };
    }
    case "category/add": {
      const category = action.payload;
      // Ensure displayType is set (backward compatibility)
      const categoryWithDefaults = {
        ...category,
        displayType: category.displayType ?? "sum",
        weight: category.weight ?? 1.0,
      };
      return {
        ...state,
        categories: { ...state.categories, [category.id]: categoryWithDefaults },
      };
    }
    case "category/update": {
      const category = action.payload;
      return {
        ...state,
        categories: { ...state.categories, [category.id]: category },
      };
    }
    case "category/remove": {
      const { categoryId, sessionId } = action.payload;
      const { [categoryId]: _, ...restCategories } = state.categories;
      const session = state.sessions[sessionId];
      if (!session) return state;
      return {
        ...state,
        categories: restCategories,
        sessions: {
          ...state.sessions,
          [sessionId]: updateSessionTimestamp({
            ...session,
            categoryIds: session.categoryIds.filter((id) => id !== categoryId),
          }),
        },
      };
    }
    case "round/add": {
      const round = action.payload;
      return {
        ...state,
        rounds: { ...state.rounds, [round.id]: round },
      };
    }
    case "entry/add": {
      const entry = action.payload;
      return {
        ...state,
        entries: { ...state.entries, [entry.id]: entry },
      };
    }
    case "entry/remove": {
      const { entryId } = action.payload;
      const { [entryId]: _, ...restEntries } = state.entries;
      return { ...state, entries: restEntries };
    }
    case "rule/add": {
      const rule = action.payload;
      const session = state.sessions[rule.sessionId];
      if (!session) return state;
      return {
        ...state,
        rules: { ...state.rules, [rule.id]: rule },
        sessions: {
          ...state.sessions,
          [rule.sessionId]: updateSessionTimestamp({
            ...session,
            ruleIds: [...(session.ruleIds || []), rule.id],
          }),
        },
      };
    }
    case "rule/update": {
      const rule = action.payload;
      return {
        ...state,
        rules: { ...state.rules, [rule.id]: rule },
      };
    }
    case "rule/remove": {
      const { ruleId, sessionId } = action.payload;
      const { [ruleId]: _, ...restRules } = state.rules;
      const session = state.sessions[sessionId];
      if (!session) return state;
      return {
        ...state,
        rules: restRules,
        sessions: {
          ...state.sessions,
          [sessionId]: updateSessionTimestamp({
            ...session,
            ruleIds: (session.ruleIds || []).filter((id) => id !== ruleId),
          }),
        },
      };
    }
    case "template/create": {
      const template = action.payload;
      return {
        ...state,
        templates: { ...state.templates, [template.id]: template },
      };
    }
    case "template/update": {
      const template = action.payload;
      return {
        ...state,
        templates: { ...state.templates, [template.id]: template },
      };
    }
    case "template/remove": {
      const { templateId } = action.payload;
      const { [templateId]: _, ...restTemplates } = state.templates;
      return { ...state, templates: restTemplates };
    }
    case "template/duplicate": {
      const { templateId, newId, newName } = action.payload;
      const original = state.templates[templateId];
      if (!original) return state;
      const duplicated: GameTemplate = {
        ...original,
        id: newId,
        name: newName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return {
        ...state,
        templates: { ...state.templates, [newId]: duplicated },
      };
    }
    case "variable/set": {
      const variable = action.payload;
      const session = state.sessions[variable.sessionId];
      if (!session) return state;

      // Validate if we have the definition
      const template = variable.sessionId && state.sessions[variable.sessionId]?.templateId
        ? state.templates[state.sessions[variable.sessionId].templateId!]
        : undefined;
      if (template) {
        const varDef = template.variableDefinitions.find((v) => v.id === variable.variableDefinitionId);
        if (varDef) {
          const validation = validateVariableValue(variable.value, varDef);
          if (!validation.valid) {
            console.warn("Invalid variable value:", validation.error);
            return state;
          }
        }
      }

      const variableValueIds = session.variableValueIds || [];
      const isNew = !variableValueIds.includes(variable.id);

      return {
        ...state,
        variableValues: { ...state.variableValues, [variable.id]: variable },
        sessions: {
          ...state.sessions,
          [variable.sessionId]: updateSessionTimestamp({
            ...session,
            variableValueIds: isNew ? [...variableValueIds, variable.id] : variableValueIds,
          }),
        },
      };
    }
    case "variable/update": {
      const variable = action.payload;
      const existing = state.variableValues[variable.id];
      if (!existing) return state;

      // Validate
      const session = state.sessions[variable.sessionId];
      const template = session?.templateId ? state.templates[session.templateId] : undefined;
      if (template) {
        const varDef = template.variableDefinitions.find((v) => v.id === variable.variableDefinitionId);
        if (varDef) {
          const validation = validateVariableValue(variable.value, varDef);
          if (!validation.valid) {
            console.warn("Invalid variable value:", validation.error);
            return state;
          }
        }
      }

      return {
        ...state,
        variableValues: { ...state.variableValues, [variable.id]: variable },
      };
    }
    case "variable/increment": {
      const { variableValueId, amount } = action.payload;
      const variable = state.variableValues[variableValueId];
      if (!variable || typeof variable.value !== "number") return state;

      const newValue = variable.value + amount;

      // Validate min/max
      const session = state.sessions[variable.sessionId];
      const template = session?.templateId ? state.templates[session.templateId] : undefined;
      if (template) {
        const varDef = template.variableDefinitions.find((v) => v.id === variable.variableDefinitionId);
        if (varDef) {
          if (varDef.min !== undefined && newValue < varDef.min) {
            return state;
          }
          if (varDef.max !== undefined && newValue > varDef.max) {
            return state;
          }
        }
      }

      return {
        ...state,
        variableValues: {
          ...state.variableValues,
          [variableValueId]: {
            ...variable,
            value: newValue,
            updatedAt: Date.now(),
          },
        },
      };
    }
    case "variable/reset": {
      const { variableValueId, defaultValue } = action.payload;
      const variable = state.variableValues[variableValueId];
      if (!variable) return state;

      return {
        ...state,
        variableValues: {
          ...state.variableValues,
          [variableValueId]: {
            ...variable,
            value: defaultValue,
            updatedAt: Date.now(),
            updatedBy: "manual",
          },
        },
      };
    }
    case "variable/history-add": {
      const history = action.payload;
      const currentHistory = state.variableHistory || {};
      const varHistory = currentHistory[history.variableValueId] || [];

      return {
        ...state,
        variableHistory: {
          ...currentHistory,
          [history.variableValueId]: [...varHistory, history],
        },
      };
    }
    case "onboarding/complete": {
      return {
        ...state,
        onboarding: {
          ...state.onboarding,
          completed: true,
          currentStep: undefined,
        },
      };
    }
    case "onboarding/set-step": {
      return {
        ...state,
        onboarding: {
          ...state.onboarding,
          currentStep: action.payload,
        },
      };
    }
    case "onboarding/dismiss-tooltip": {
      const dismissed = state.onboarding?.dismissedTooltips ?? [];
      return {
        ...state,
        onboarding: {
          ...state.onboarding,
          dismissedTooltips: [...dismissed, action.payload],
        },
      };
    }
    default:
      return state;
  }
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState, () => {
    const saved = loadState();
    const savedTemplates = loadTemplates();
    
    if (saved) {
      // Ensure onboarding state exists for backward compatibility
      if (!saved.onboarding) {
        saved.onboarding = {
          completed: false,
          dismissedTooltips: [],
        };
      }
      // Ensure rules and ruleIds exist for backward compatibility
      if (!saved.rules) {
        saved.rules = {};
      }
      // Merge templates from separate storage and initialize starters
      const allTemplates = { ...savedTemplates, ...(saved.templates || {}) };
      saved.templates = initializeStarterTemplates(allTemplates);
      // Ensure sessions have ruleIds
      Object.values(saved.sessions || {}).forEach((session) => {
        if (!session.ruleIds) {
          session.ruleIds = [];
        }
      });
      return saved;
    }
    
    // If no saved state, load templates separately and initialize starters
    const templatesWithStarters = initializeStarterTemplates(savedTemplates);
    const initialStateWithTemplates = {
      ...initialState,
      templates: templatesWithStarters,
    };
    return initialStateWithTemplates;
  });

  useEffect(() => {
    saveState(state);
    // Also save templates separately for easier management
    saveTemplates(state.templates);
  }, [state]);

  const memoState = useMemo(() => state, [state]);

  return (
    <AppStateContext.Provider value={memoState}>
      <AppDispatchContext.Provider value={dispatch}>{children}</AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
};

export const useAppState = () => useContext(AppStateContext);
export const useAppDispatch = () => useContext(AppDispatchContext);

export const updateSession = (session: Session): Session => updateSessionTimestamp(session);

export const buildSeatOrder = (players: Player[]): Player[] =>
  [...players].sort((a, b) => a.seatOrder - b.seatOrder);

export const sortCategories = (categories: Category[]): Category[] =>
  [...categories].sort((a, b) => a.sortOrder - b.sortOrder);

export const sortRounds = (rounds: Round[]): Round[] =>
  [...rounds].sort((a, b) => a.index - b.index);

export const sortEntries = (entries: ScoreEntry[]): ScoreEntry[] =>
  [...entries].sort((a, b) => b.createdAt - a.createdAt);

