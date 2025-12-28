export type GameObject = {
  // Identity & Classification
  id: string;
  name: string;
  category: string;
  subtype?: string;
  tags?: string[];
  set?: string;

  // Ownership & Control
  ownerId?: string | null;
  controllerId?: string | null;
  sharedWithIds?: string[];
  origin?: string;

  // State & Lifecycle
  status?: string;
  location?: string;
  faceState?: string;
  orientation?: string;
  phaseAvailability?: string[];

  // Quantity & Capacity
  count?: number;
  value?: number;
  capacity?: number | null;
  multiplier?: number;
  threshold?: number | null;

  // Scoring & Victory Logic
  pointValue?: number;
  conditionalPoints?: any[];
  scoringTiming?: string;
  endGameOnly?: boolean;
  scoringGroup?: string | null;
  scoringWeight?: number | null;

  // Relationships & Interaction
  linkedObjectIds?: string[];
  adjacency?: any;
  dependency?: any;
  exclusivity?: any;
  range?: number | null;

  // Action & Ability Hooks
  abilities?: any[];
  triggers?: any[];
  cooldown?: any;
  cost?: any;
  oncePer?: string | null;

  // Temporal
  duration?: string;
  expiresAt?: any;
  createdAt?: any;
  lastUsedAt?: any;

  // Visibility & Information
  visibility?: string;
  knownToIds?: string[];
  randomized?: boolean;

  // Rule Modifiers & Exceptions
  modifiers?: any[];
  overrides?: any[];
  immunities?: any[];
  penalties?: any[];

  // Meta & UI Support
  icon?: string | null;
  color?: string | null;
  notes?: string | null;
  sortKey?: string | number | null;
  version?: string | null;
};

export const createGameObjectDefaults = (overrides: Partial<GameObject> = {}): GameObject => ({
  id: overrides.id ?? "",
  name: overrides.name ?? "",
  category: overrides.category ?? "generic",
  subtype: overrides.subtype ?? "",
  tags: overrides.tags ?? [],
  set: overrides.set ?? "",
  ownerId: overrides.ownerId ?? null,
  controllerId: overrides.controllerId ?? null,
  sharedWithIds: overrides.sharedWithIds ?? [],
  origin: overrides.origin ?? "",
  status: overrides.status ?? "active",
  location: overrides.location ?? "",
  faceState: overrides.faceState ?? "faceUp",
  orientation: overrides.orientation ?? "normal",
  phaseAvailability: overrides.phaseAvailability ?? [],
  count: overrides.count ?? 1,
  value: overrides.value ?? 0,
  capacity: overrides.capacity ?? null,
  multiplier: overrides.multiplier ?? 1,
  threshold: overrides.threshold ?? null,
  pointValue: overrides.pointValue ?? 0,
  conditionalPoints: overrides.conditionalPoints ?? [],
  scoringTiming: overrides.scoringTiming ?? "endGame",
  endGameOnly: overrides.endGameOnly ?? false,
  scoringGroup: overrides.scoringGroup ?? null,
  scoringWeight: overrides.scoringWeight ?? null,
  linkedObjectIds: overrides.linkedObjectIds ?? [],
  adjacency: overrides.adjacency ?? null,
  dependency: overrides.dependency ?? null,
  exclusivity: overrides.exclusivity ?? null,
  range: overrides.range ?? null,
  abilities: overrides.abilities ?? [],
  triggers: overrides.triggers ?? [],
  cooldown: overrides.cooldown ?? null,
  cost: overrides.cost ?? null,
  oncePer: overrides.oncePer ?? null,
  duration: overrides.duration ?? "permanent",
  expiresAt: overrides.expiresAt ?? null,
  createdAt: overrides.createdAt ?? null,
  lastUsedAt: overrides.lastUsedAt ?? null,
  visibility: overrides.visibility ?? "public",
  knownToIds: overrides.knownToIds ?? [],
  randomized: overrides.randomized ?? false,
  modifiers: overrides.modifiers ?? [],
  overrides: overrides.overrides ?? [],
  immunities: overrides.immunities ?? [],
  penalties: overrides.penalties ?? [],
  icon: overrides.icon ?? null,
  color: overrides.color ?? null,
  notes: overrides.notes ?? null,
  sortKey: overrides.sortKey ?? null,
  version: overrides.version ?? null,
});

export const isGameObject = (value: unknown): value is GameObject => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as GameObject;
  return typeof candidate.id === "string" && typeof candidate.name === "string" && typeof candidate.category === "string";
};
