import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { AppAction, AppState, Category, GameTemplate, Player, Round, ScoreEntry, Session } from "./types";
import { loadState, saveState } from "../lib/storage";
import { loadTemplates, saveTemplates } from "../lib/templateStorage";
import { initializeStarterTemplates } from "../lib/templates/starter";
import { validateGameObjectValue } from "../lib/objectStorage";
import { CURRENT_SCHEMA_VERSION, migrateAppState, runMigrationSelfCheck } from "../lib/migrations";

const initialState: AppState = {
  schemaVersion: CURRENT_SCHEMA_VERSION,
  sessions: {},
  players: {},
  categories: {},
  rounds: {},
  entries: {},
  rules: {},
  templates: {},
  objectValues: {},
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
    case "session/remove": {
      const { sessionId } = action.payload;
      const session = state.sessions[sessionId];
      if (!session) return state;

      // Remove all related data
      const playersToRemove = session.playerIds || [];
      const categoriesToRemove = session.categoryIds || [];
      const roundsToRemove = session.roundIds || [];
      const rulesToRemove = session.ruleIds || [];
      const objectValuesToRemove = session.objectValueIds || [];

      // Filter out players
      const remainingPlayers = state.players
        ? Object.fromEntries(
            Object.entries(state.players).filter(([id]) => !playersToRemove.includes(id))
          )
        : {};

      // Filter out categories
      const remainingCategories = state.categories
        ? Object.fromEntries(
            Object.entries(state.categories).filter(([id]) => !categoriesToRemove.includes(id))
          )
        : {};

      // Filter out rounds
      const remainingRounds = state.rounds
        ? Object.fromEntries(
            Object.entries(state.rounds).filter(([id]) => !roundsToRemove.includes(id))
          )
        : {};

      // Filter out rules
      const remainingRules = state.rules
        ? Object.fromEntries(
            Object.entries(state.rules).filter(([id]) => !rulesToRemove.includes(id))
          )
        : {};

      // Filter out entries for this session
      const remainingEntries = state.entries
        ? Object.fromEntries(
            Object.entries(state.entries).filter(([, entry]) => entry.sessionId !== sessionId)
          )
        : {};

      // Filter out object values
      const remainingGameObjectValues = state.objectValues
        ? Object.fromEntries(
            Object.entries(state.objectValues).filter(([id]) => !objectValuesToRemove.includes(id))
          )
        : {};

      // Filter out object history for removed object values
      const remainingGameObjectHistory = state.objectHistory
        ? Object.fromEntries(
            Object.entries(state.objectHistory).filter(([id]) => !objectValuesToRemove.includes(id))
          )
        : undefined;

      // Remove session
      const { [sessionId]: _, ...remainingSessions } = state.sessions;

      // Clear activeSessionId if it was the deleted session
      const newActiveSessionId =
        state.activeSessionId === sessionId ? undefined : state.activeSessionId;

      return {
        ...state,
        sessions: remainingSessions,
        players: remainingPlayers,
        categories: remainingCategories,
        rounds: remainingRounds,
        rules: remainingRules,
        entries: remainingEntries,
        objectValues: remainingGameObjectValues,
        objectHistory: remainingGameObjectHistory,
        activeSessionId: newActiveSessionId,
      };
    }
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
      const session = state.sessions[entry.sessionId];
      return {
        ...state,
        entries: { ...(state.entries || {}), [entry.id]: entry },
        sessions: session
          ? {
              ...state.sessions,
              [entry.sessionId]: updateSessionTimestamp(session),
            }
          : state.sessions,
      };
    }
    case "entry/remove": {
      const { entryId } = action.payload;
      if (!state.entries) return state;
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
      const newState = {
        ...state,
        templates: { ...state.templates, [template.id]: template },
      };
      // Save templates immediately to ensure persistence
      saveTemplates(newState.templates);
      return newState;
    }
    case "template/update": {
      const template = action.payload;
      const newState = {
        ...state,
        templates: { ...state.templates, [template.id]: template },
      };
      // Save templates immediately to ensure persistence
      saveTemplates(newState.templates);
      return newState;
    }
    case "template/remove": {
      const { templateId } = action.payload;
      const { [templateId]: _, ...restTemplates } = state.templates;
      const newState = { ...state, templates: restTemplates };
      // Save templates immediately to ensure persistence
      saveTemplates(newState.templates);
      return newState;
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
      const newState = {
        ...state,
        templates: { ...state.templates, [newId]: duplicated },
      };
      // Save templates immediately to ensure persistence
      saveTemplates(newState.templates);
      return newState;
    }
    case "object/set": {
      const objectValue = action.payload;
      const session = state.sessions[objectValue.sessionId];
      if (!session) return state;

      // Validate if we have the definition
      const template = objectValue.sessionId && state.sessions[objectValue.sessionId]?.templateId
        ? state.templates[state.sessions[objectValue.sessionId].templateId!]
        : undefined;
      if (template) {
        const varDef = template.objectDefinitions.find((v) => v.id === objectValue.objectDefinitionId);
        if (varDef) {
          const validation = validateGameObjectValue(objectValue.value, varDef);
          if (!validation.valid) {
            console.warn("Invalid object value:", validation.error);
            return state;
          }
        }
      }

      const objectValueIds = session.objectValueIds || [];
      const isNew = !objectValueIds.includes(objectValue.id);

      return {
        ...state,
        objectValues: { ...state.objectValues, [objectValue.id]: objectValue },
        sessions: {
          ...state.sessions,
          [objectValue.sessionId]: updateSessionTimestamp({
            ...session,
            objectValueIds: isNew ? [...objectValueIds, objectValue.id] : objectValueIds,
          }),
        },
      };
    }
    case "object/update": {
      const objectValue = action.payload;
      const existing = state.objectValues[objectValue.id];
      if (!existing) return state;

      // Validate
      const session = state.sessions[objectValue.sessionId];
      const template = session?.templateId ? state.templates[session.templateId] : undefined;
      if (template) {
        const varDef = template.objectDefinitions.find((v) => v.id === objectValue.objectDefinitionId);
        if (varDef) {
          const validation = validateGameObjectValue(objectValue.value, varDef);
          if (!validation.valid) {
            console.warn("Invalid object value:", validation.error);
            return state;
          }
        }
      }

      return {
        ...state,
        objectValues: { ...state.objectValues, [objectValue.id]: objectValue },
      };
    }
    case "object/increment": {
      const { objectValueId, amount } = action.payload;
      const objectValue = state.objectValues[objectValueId];
      if (!objectValue || typeof objectValue.value !== "number") return state;

      const newValue = objectValue.value + amount;

      // Validate min/max
      const session = state.sessions[objectValue.sessionId];
      const template = session?.templateId ? state.templates[session.templateId] : undefined;
      if (template) {
        const varDef = template.objectDefinitions.find((v) => v.id === objectValue.objectDefinitionId);
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
        objectValues: {
          ...state.objectValues,
          [objectValueId]: {
            ...objectValue,
            value: newValue,
            updatedAt: Date.now(),
          },
        },
      };
    }
    case "object/reset": {
      const { objectValueId, defaultValue } = action.payload;
      const objectValue = state.objectValues[objectValueId];
      if (!objectValue) return state;

      return {
        ...state,
        objectValues: {
          ...state.objectValues,
          [objectValueId]: {
            ...objectValue,
            value: defaultValue,
            updatedAt: Date.now(),
            updatedBy: "manual",
          },
        },
      };
    }
    case "object/history-add": {
      const history = action.payload;
      const currentHistory = state.objectHistory || {};
      const objHistory = currentHistory[history.objectValueId] || [];

      return {
        ...state,
        objectHistory: {
          ...currentHistory,
          [history.objectValueId]: [...objHistory, history],
        },
      };
    }
    case "object/recompute": {
      const { objectValueId } = action.payload;
      const objectValue = state.objectValues[objectValueId];
      if (!objectValue) return state;

      // Recompute will be handled by the evaluation system
      // This action just marks that recomputation is needed
      // The actual recomputation happens in the evaluation functions
      return state;
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
      const onboarding = state.onboarding ?? { completed: false, dismissedTooltips: [] };
      return {
        ...state,
        onboarding: {
          ...onboarding,
          currentStep: action.payload,
        },
      };
    }
    case "onboarding/dismiss-tooltip": {
      const onboarding = state.onboarding ?? { completed: false, dismissedTooltips: [] };
      const dismissed = onboarding.dismissedTooltips ?? [];
      return {
        ...state,
        onboarding: {
          ...onboarding,
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

    const isDev = (import.meta as { env?: { DEV?: boolean } }).env?.DEV;
    if (isDev) {
      runMigrationSelfCheck();
    }
    
    if (saved) {
      const migratedState = migrateAppState(saved);
      // Ensure onboarding state exists for backward compatibility
      if (!migratedState.onboarding) {
        migratedState.onboarding = {
          completed: false,
          dismissedTooltips: [],
        };
      }
      // Ensure rules and ruleIds exist for backward compatibility
      if (!migratedState.rules) {
        migratedState.rules = {};
      }
      // Merge templates from separate storage and initialize starters
      // Prioritize templates from separate storage (newer), but include any from main state
      const allTemplates = { ...(migratedState.templates || {}), ...savedTemplates };
      migratedState.templates = initializeStarterTemplates(allTemplates);
      // Ensure sessions have ruleIds
      Object.values(migratedState.sessions || {}).forEach((session) => {
        if (!session.ruleIds) {
          session.ruleIds = [];
        }
      });
      return migratedState;
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
