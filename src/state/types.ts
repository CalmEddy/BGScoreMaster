import { GameObject } from "../types/GameObject";

export type ID = string;

export type Session = {
  id: ID;
  title: string;
  createdAt: number;
  updatedAt: number;
  settings: {
    roundsEnabled: boolean;
    scoreDirection: "higherWins" | "lowerWins";
    allowNegative: boolean;
    showRoundControls?: boolean;
    showSessionObjects?: boolean;
    showPlayerObjects?: boolean;
    showQuickAdd?: boolean;
  };
  playerIds: ID[];
  categoryIds: ID[];
  roundIds: ID[];
  ruleIds: ID[];
  templateId?: ID;
  objectValueIds?: ID[];
  activeMechanicIds?: ID[];
};

export type Player = {
  id: ID;
  sessionId: ID;
  name: string;
  seatOrder: number;
};

export type Category = {
  id: ID;
  sessionId: ID;
  name: string;
  sortOrder: number;
  parentCategoryId?: ID;
  weight?: number;
  formula?: string;
  displayType: "sum" | "formula" | "weighted";
};

export type Round = {
  id: ID;
  sessionId: ID;
  index: number;
  label: string;
};

export type ScoreEntry = {
  id: ID;
  sessionId: ID;
  playerId: ID;
  createdAt: number;
  value: number;
  roundId?: ID;
  categoryId?: ID;
  note?: string;
  source: "manual" | "ruleEngine";
};

export type ScoringRule = {
  id: ID;
  sessionId: ID;
  name: string;
  condition: {
    type: "total" | "category" | "round";
    operator: ">=" | "<=" | "==" | "!=" | ">" | "<";
    value: number;
    categoryId?: ID;
    roundId?: ID;
  };
  action: {
    type: "add" | "multiply" | "set";
    value: number;
    targetCategoryId?: ID;
  };
  enabled: boolean;
};

export type CategoryTemplate = {
  id: ID;
  name: string;
  description?: string;
  parentId?: ID;
  sortOrder: number;
  defaultWeight?: number;
  defaultFormula?: string;
  displayType: "sum" | "formula" | "weighted";
  required: boolean;
  icon?: string;
};

export type RuleTemplate = {
  id: ID;
  name: string;
  description?: string;
  condition: ScoringRule["condition"];
  action: ScoringRule["action"];
  enabled: boolean;
  required: boolean;
};

export type GameObjectOwnership =
  | "inactive"
  | "player"
  | "global"
  | { type: "object"; objectId: ID };

export type GameObjectActiveWindow =
  | "always"
  | { type: "round"; roundId?: ID; roundIndex?: number }
  | { type: "phase"; phaseId?: ID }
  | { type: "object"; objectId: ID };

export type GameObjectDefinition = GameObject & {
  type: "number" | "boolean" | "string" | "resource" | "territory" | "card" | "custom" | "set";
  defaultValue?: any;
  min?: number;
  max?: number;
  options?: string[];
  description?: string;
  ownership?: GameObjectOwnership;
  activeWindow?: GameObjectActiveWindow;
  calculation?: string;
  scoreImpact?: string;
  state?: string;
  // Set-specific properties
  setType?: "identical" | "elements";
  setElements?: ID[];
  setElementTemplate?: GameObjectDefinition;
  setIds?: ID[];
};

export type GameMechanic = {
  id: ID;
  type: "turnOrder" | "phase" | "resourceManagement" | "territoryControl" | "cardHand" | "diceRoll" | "custom";
  name: string;
  config: Record<string, any>;
  enabled: boolean;
};

export type SetElementValue = {
  elementObjectDefinitionId: ID;
  quantity: number; // For identical sets, this is the count
  properties?: Record<string, any>; // Optional properties for each element
};

export type SetValue = 
  | number  // For identical sets: simple count
  | SetElementValue[]; // For elements sets: array of element values

export type GameObjectValue = {
  id: ID;
  sessionId: ID;
  objectDefinitionId: ID;
  playerId?: ID;
  value: any | SetValue; // Extend to support SetValue
  updatedAt: number;
  updatedBy?: "manual" | "rule" | "mechanic";
  state?: string;
  computedValue?: any;
  lastComputedAt?: number;
};

export type GameObjectHistory = {
  id: ID;
  objectValueId: ID;
  value: any;
  previousValue: any;
  timestamp: number;
  source: "manual" | "rule" | "mechanic";
  note?: string;
};

export type PlayerCardActionButton = {
  id: ID;
  categoryId: ID;
  label?: string;
  color?: string;
};

export type PlayerCardConfig = {
  actionButtons: PlayerCardActionButton[];
  objectIds: ID[];
};

export type GameTemplate = {
  id: ID;
  name: string;
  description?: string;
  author?: string;
  version: string;
  gameType: "board" | "card" | "dice" | "custom";
  icon?: string;
  createdAt: number;
  updatedAt: number;
  defaultSettings: {
    roundsEnabled: boolean;
    scoreDirection: "higherWins" | "lowerWins";
    allowNegative: boolean;
    minPlayers?: number;
    maxPlayers?: number;
    defaultPlayerCount?: number;
  };
  categoryTemplates: CategoryTemplate[];
  ruleTemplates: RuleTemplate[];
  objectDefinitions: GameObjectDefinition[];
  mechanics: GameMechanic[];
  uiConfig?: {
    quickValues?: number[];
    defaultView?: "scoreboard" | "categories" | "players";
    colorScheme?: Record<string, string>;
    playerCard?: PlayerCardConfig;
  };
};

export type AppState = {
  schemaVersion?: number;
  sessions: Record<ID, Session>;
  players: Record<ID, Player>;
  categories: Record<ID, Category>;
  rounds: Record<ID, Round>;
  entries: Record<ID, ScoreEntry>;
  rules: Record<ID, ScoringRule>;
  templates: Record<ID, GameTemplate>;
  objectValues: Record<ID, GameObjectValue>;
  objectHistory?: Record<ID, GameObjectHistory[]>;
  activeSessionId?: ID;
  onboarding?: {
    completed: boolean;
    currentStep?: number;
    dismissedTooltips?: string[];
  };
};

export type AppAction =
  | { type: "session/create"; payload: Session }
  | { type: "session/update"; payload: Session }
  | { type: "session/activate"; payload: ID }
  | { type: "session/remove"; payload: { sessionId: ID } }
  | { type: "player/add"; payload: Player }
  | { type: "player/remove"; payload: { sessionId: ID; playerId: ID } }
  | { type: "player/update"; payload: Player }
  | { type: "category/add"; payload: Category }
  | { type: "category/update"; payload: Category }
  | { type: "category/remove"; payload: { sessionId: ID; categoryId: ID } }
  | { type: "round/add"; payload: Round }
  | { type: "entry/add"; payload: ScoreEntry }
  | { type: "entry/remove"; payload: { entryId: ID } }
  | { type: "rule/add"; payload: ScoringRule }
  | { type: "rule/update"; payload: ScoringRule }
  | { type: "rule/remove"; payload: { sessionId: ID; ruleId: ID } }
  | { type: "template/create"; payload: GameTemplate }
  | { type: "template/update"; payload: GameTemplate }
  | { type: "template/remove"; payload: { templateId: ID } }
  | { type: "template/duplicate"; payload: { templateId: ID; newId: ID; newName: string } }
  | { type: "object/set"; payload: GameObjectValue }
  | { type: "object/update"; payload: GameObjectValue }
  | { type: "object/increment"; payload: { objectValueId: ID; amount: number } }
  | { type: "object/reset"; payload: { objectValueId: ID; defaultValue: any } }
  | { type: "object/history-add"; payload: GameObjectHistory }
  | { type: "object/recompute"; payload: { objectValueId: ID } }
  | { type: "state/replace"; payload: AppState }
  | { type: "onboarding/complete" }
  | { type: "onboarding/set-step"; payload: number }
  | { type: "onboarding/dismiss-tooltip"; payload: string };
