import { createGameObjectDefaults } from "../types/GameObject";
import { AppState, GameObjectDefinition, GameObjectValue, GameTemplate, PlayerCardConfig } from "../state/types";

export const CURRENT_SCHEMA_VERSION = 2;

const normalizeId = (value: unknown, fallback: string): string => {
  if (typeof value === "string" && value.trim()) return value;
  return fallback;
};

const toStableId = (prefix: string, name?: string, index?: number): string => {
  const base = name
    ? `${prefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`
    : `${prefix}-${index ?? 0}`;
  return base || `${prefix}-${index ?? 0}`;
};

const migrateOwnership = (ownership: any): GameObjectDefinition["ownership"] => {
  if (!ownership) return ownership;
  if (typeof ownership === "string") return ownership as GameObjectDefinition["ownership"];
  if (ownership.type === "variable") {
    return { type: "object", objectId: ownership.variableId };
  }
  return ownership;
};

const migrateActiveWindow = (activeWindow: any): GameObjectDefinition["activeWindow"] => {
  if (!activeWindow) return activeWindow;
  if (typeof activeWindow === "string") return activeWindow as GameObjectDefinition["activeWindow"];
  if (activeWindow.type === "variable") {
    return { type: "object", objectId: activeWindow.variableId };
  }
  return activeWindow;
};

const migrateObjectDefinition = (definition: any, index: number): GameObjectDefinition => {
  const id = normalizeId(definition.id, toStableId("object", definition.name, index));
  const baseObject = createGameObjectDefaults({
    id,
    name: definition.name ?? `Object ${index + 1}`,
    category: definition.category ?? "custom",
    subtype: definition.subtype ?? definition.type ?? "custom",
    tags: definition.tags ?? [],
    set: definition.set ?? "default",
    icon: definition.icon ?? null,
    color: definition.color ?? null,
    notes: definition.notes ?? definition.description ?? null,
    version: definition.version ?? null,
  });

  return {
    ...baseObject,
    ...definition,
    id,
    ownership: migrateOwnership(definition.ownership),
    activeWindow: migrateActiveWindow(definition.activeWindow),
    setElementTemplate: definition.setElementTemplate
      ? migrateObjectDefinition(definition.setElementTemplate, index)
      : undefined,
  } as GameObjectDefinition;
};

const migrateSetValue = (value: any): any => {
  if (!Array.isArray(value)) return value;
  return value.map((element, index) => {
    if (!element || typeof element !== "object") return element;
    return {
      ...element,
      elementObjectDefinitionId:
        element.elementObjectDefinitionId ?? element.elementVariableDefinitionId ?? toStableId("element", undefined, index),
    };
  });
};

const migrateObjectValue = (value: any, index: number): GameObjectValue => {
  const objectDefinitionId = value.objectDefinitionId ?? value.variableDefinitionId ?? toStableId("object", undefined, index);
  const sessionId = value.sessionId ?? value.session ?? "";
  const playerId = value.playerId ?? undefined;
  const id =
    typeof value.id === "string" && value.id
      ? value.id
      : `${objectDefinitionId}-${playerId ?? "session"}-${sessionId || "unknown"}`;

  return {
    ...value,
    id,
    objectDefinitionId,
    value: migrateSetValue(value.value),
  } as GameObjectValue;
};

const migratePlayerCardConfig = (config: any): PlayerCardConfig | undefined => {
  if (!config) return config;
  return {
    ...config,
    objectIds: config.objectIds ?? config.variableIds ?? [],
  };
};

export const migrateTemplate = (template: GameTemplate): GameTemplate => {
  if (!template) return template;
  const legacyDefinitions = (template as any).variableDefinitions;
  const objectDefinitions = (template.objectDefinitions ?? legacyDefinitions ?? []).map(migrateObjectDefinition);

  return {
    ...template,
    objectDefinitions,
    uiConfig: template.uiConfig
      ? {
          ...template.uiConfig,
          playerCard: migratePlayerCardConfig(template.uiConfig.playerCard),
        }
      : template.uiConfig,
  };
};

export const migrateAppState = (state: AppState): AppState => {
  const legacyState = state as any;
  const templates = Object.fromEntries(
    Object.entries(legacyState.templates || {}).map(([id, template]) => [id, migrateTemplate(template as GameTemplate)])
  );

  const objectValues: Record<string, GameObjectValue> = Object.fromEntries(
    Object.entries(legacyState.objectValues ?? legacyState.variableValues ?? {}).map(([id, value], index) => [
      id,
      migrateObjectValue(value, index),
    ])
  );

  const objectHistory = legacyState.objectHistory ?? legacyState.variableHistory;

  const sessions = Object.fromEntries(
    Object.entries(legacyState.sessions || {}).map(([id, session]: [string, any]) => {
      const settings = session.settings || {};
      return [
        id,
        {
          ...session,
          settings: {
            ...settings,
            showSessionObjects: settings.showSessionObjects ?? settings.showSessionVariables ?? true,
            showPlayerObjects: settings.showPlayerObjects ?? settings.showPlayerVariables ?? true,
          },
          objectValueIds: session.objectValueIds ?? session.variableValueIds ?? [],
        },
      ];
    })
  );

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    sessions,
    players: legacyState.players ?? {},
    categories: legacyState.categories ?? {},
    rounds: legacyState.rounds ?? {},
    entries: legacyState.entries ?? {},
    rules: legacyState.rules ?? {},
    templates,
    objectValues,
    objectHistory,
    activeSessionId: legacyState.activeSessionId,
    onboarding: legacyState.onboarding,
  };
};

export const migrateImportedState = (state: AppState): AppState => {
  if (!state || typeof state !== "object") return state;
  if (state.schemaVersion && state.schemaVersion >= CURRENT_SCHEMA_VERSION) {
    return state;
  }
  return migrateAppState(state);
};

let migrationSelfCheckRan = false;

export const runMigrationSelfCheck = () => {
  if (migrationSelfCheckRan) return;
  migrationSelfCheckRan = true;

  const legacyState = {
    sessions: {
      s1: {
        id: "s1",
        title: "Legacy Session",
        createdAt: 0,
        updatedAt: 0,
        settings: {
          roundsEnabled: true,
          scoreDirection: "higherWins",
          allowNegative: false,
          showSessionVariables: true,
          showPlayerVariables: true,
        },
        playerIds: [],
        categoryIds: [],
        roundIds: [],
        ruleIds: [],
        variableValueIds: ["v1"],
      },
    },
    players: {},
    categories: {},
    rounds: {},
    entries: {},
    rules: {},
    templates: {
      t1: {
        id: "t1",
        name: "Legacy Template",
        version: "1.0.0",
        gameType: "custom",
        createdAt: 0,
        updatedAt: 0,
        defaultSettings: {
          roundsEnabled: true,
          scoreDirection: "higherWins",
          allowNegative: false,
        },
        categoryTemplates: [],
        ruleTemplates: [],
        variableDefinitions: [
          {
            id: "vd1",
            name: "Legacy Object",
            type: "set",
            category: "Legacy",
            setType: "elements",
            setElements: ["el1"],
          },
        ],
        mechanics: [],
      },
    },
    variableValues: {
      v1: {
        id: "v1",
        sessionId: "s1",
        variableDefinitionId: "vd1",
        value: [{ elementVariableDefinitionId: "el1", quantity: 2 }],
        updatedAt: 0,
      },
    },
  } as unknown as AppState;

  const migrated = migrateAppState(legacyState);
  console.assert(migrated.schemaVersion === CURRENT_SCHEMA_VERSION, "Expected schemaVersion upgrade");
  console.assert(migrated.sessions.s1.objectValueIds?.includes("v1"), "Expected objectValueIds to include legacy value");
  console.assert(migrated.objectValues.v1.objectDefinitionId === "vd1", "Expected objectDefinitionId migration");
  const migratedValue = migrated.objectValues.v1.value;
  if (Array.isArray(migratedValue) && migratedValue[0]) {
    console.assert(
      "elementObjectDefinitionId" in migratedValue[0],
      "Expected set element IDs to migrate to elementObjectDefinitionId"
    );
  }
};
