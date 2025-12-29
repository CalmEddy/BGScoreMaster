import { createId } from "./id";
import { AppState, CategoryTemplate, GameTemplate, Player, Round, ScoringRule, Session } from "../state/types";
import { initializeObjectsFromTemplate } from "./objectStorage";

export const applyTemplate = (
  template: GameTemplate,
  state: AppState,
  dispatch: React.Dispatch<any>,
  playerNames: string[],
  sessionTitle?: string
): string => {
  void state;
  const sessionId = createId();
  const now = Date.now();

  // Get all template category IDs (flattened, including children)
  const getAllTemplateCategoryIds = (parentId?: string): string[] => {
    const ids: string[] = [];
    template.categoryTemplates
      .filter((cat) => cat.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((catTemplate) => {
        ids.push(catTemplate.id);
        // Recursively get children
        ids.push(...getAllTemplateCategoryIds(catTemplate.id));
      });
    return ids;
  };

  const categoryTemplateIds = getAllTemplateCategoryIds();

  // Create session
  const session: Session = {
    id: sessionId,
    title: sessionTitle || template.name,
    createdAt: now,
    updatedAt: now,
    settings: {
      roundsEnabled: template.defaultSettings.roundsEnabled,
      scoreDirection: template.defaultSettings.scoreDirection,
      allowNegative: template.defaultSettings.allowNegative,
      showRoundControls: true,
      showSessionObjects: true,
      showPlayerObjects: true,
      showQuickAdd: true,
    },
    playerIds: [],
    categoryTemplateIds: categoryTemplateIds,
    roundIds: [],
    ruleIds: [],
    templateId: template.id,
  };

  dispatch({ type: "session/create", payload: session });

  // Create players
  const playerObjects: Player[] = playerNames
    .map((name, index) => ({
      id: createId(),
      sessionId,
      name: name.trim() || `Player ${index + 1}`,
      seatOrder: index + 1,
    }))
    .filter((player) => player.name.trim());

  playerObjects.forEach((player) => {
    dispatch({ type: "player/add", payload: player });
  });

  // Create rules from templates
  // Note: Rules now reference template category IDs directly
  const ruleIds: string[] = [];
  template.ruleTemplates
    .filter((rule) => rule.enabled)
    .forEach((ruleTemplate) => {
      const ruleId = createId();
      ruleIds.push(ruleId);

      // Rules now use template category IDs directly (no mapping needed)
      const rule: ScoringRule = {
        id: ruleId,
        sessionId,
        name: ruleTemplate.name,
        condition: ruleTemplate.condition,
        action: ruleTemplate.action,
        enabled: ruleTemplate.enabled,
      };

      dispatch({ type: "rule/add", payload: rule });
    });

  // Initialize objects from template
  const objectValues = initializeObjectsFromTemplate(template, sessionId, playerObjects);
  const objectValueIds: string[] = [];
  objectValues.forEach((objectValue) => {
    objectValueIds.push(objectValue.id);
    dispatch({ type: "object/set", payload: objectValue });
  });

  // Activate mechanics
  const activeMechanicIds = template.mechanics
    .filter((m) => m.enabled)
    .map((m) => m.id);

  // Create initial round if rounds are enabled
  let roundIds: string[] = [];
  if (template.defaultSettings.roundsEnabled) {
    const roundId = createId();
    roundIds = [roundId];
    const round: Round = {
      id: roundId,
      sessionId,
      index: 1,
      label: "Round 1",
    };
    dispatch({ type: "round/add", payload: round });
  }

  // Final session update with all IDs
  dispatch({
    type: "session/update",
    payload: {
      ...session,
      playerIds: playerObjects.map((p) => p.id),
      categoryTemplateIds: categoryTemplateIds,
      ruleIds,
      roundIds,
      objectValueIds,
      activeMechanicIds,
    },
  });

  return sessionId;
};

export const applyTemplateToExistingSession = (
  template: GameTemplate,
  session: Session,
  state: AppState,
  dispatch: React.Dispatch<any>
): void => {
  const sessionId = session.id;
  const existingPlayers = session.playerIds.map((id) => state.players[id]).filter(Boolean);

  // Get all template category IDs (flattened, including children)
  const getAllTemplateCategoryIds = (parentId?: string): string[] => {
    const ids: string[] = [];
    template.categoryTemplates
      .filter((cat) => cat.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((catTemplate) => {
        ids.push(catTemplate.id);
        // Recursively get children
        ids.push(...getAllTemplateCategoryIds(catTemplate.id));
      });
    return ids;
  };

  const newCategoryTemplateIds = getAllTemplateCategoryIds();
  const existingCategoryTemplateIds = session.categoryTemplateIds || [];

  // Create rules from templates
  // Note: Rules now reference template category IDs directly
  const newRuleIds: string[] = [];
  template.ruleTemplates
    .filter((rule) => rule.enabled)
    .forEach((ruleTemplate) => {
      const ruleId = createId();
      newRuleIds.push(ruleId);

      // Rules now use template category IDs directly (no mapping needed)
      const rule: ScoringRule = {
        id: ruleId,
        sessionId,
        name: ruleTemplate.name,
        condition: ruleTemplate.condition,
        action: ruleTemplate.action,
        enabled: ruleTemplate.enabled,
      };

      dispatch({ type: "rule/add", payload: rule });
    });

  // Initialize objects from template (only if they don't already exist)
  const existingGameObjectValueIds = session.objectValueIds || [];
  const existingObjectDefIds = new Set(
    existingGameObjectValueIds
      .map((id) => state.objectValues[id]?.objectDefinitionId)
  );

  const objectValues = initializeObjectsFromTemplate(template, sessionId, existingPlayers);
  const newGameObjectValueIds: string[] = [];
  objectValues.forEach((objectValue) => {
    // Only add if object doesn't already exist for this session
    const alreadyExists = existingObjectDefIds.has(objectValue.objectDefinitionId);
    if (!alreadyExists) {
      newGameObjectValueIds.push(objectValue.id);
      dispatch({ type: "object/set", payload: objectValue });
    }
  });

  // Update session with new template ID and added resources
  // Merge category template IDs (avoid duplicates)
  const mergedCategoryTemplateIds = [
    ...new Set([...existingCategoryTemplateIds, ...newCategoryTemplateIds])
  ];

  dispatch({
    type: "session/update",
    payload: {
      ...session,
      templateId: template.id,
      categoryTemplateIds: mergedCategoryTemplateIds,
      ruleIds: [...(session.ruleIds || []), ...newRuleIds],
      objectValueIds: [...existingGameObjectValueIds, ...newGameObjectValueIds],
    },
  });
};

export const validateTemplateCompatibility = (
  template: GameTemplate,
  playerCount: number
): { compatible: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (template.defaultSettings.minPlayers && playerCount < template.defaultSettings.minPlayers) {
    errors.push(`Template requires at least ${template.defaultSettings.minPlayers} players`);
  }

  if (template.defaultSettings.maxPlayers && playerCount > template.defaultSettings.maxPlayers) {
    errors.push(`Template supports at most ${template.defaultSettings.maxPlayers} players`);
  }

  return {
    compatible: errors.length === 0,
    errors,
  };
};

/**
 * Get template categories for a session.
 * Returns the CategoryTemplate objects from the session's template.
 */
export const getSessionTemplateCategories = (
  state: AppState,
  session: Session
): CategoryTemplate[] => {
  if (!session.templateId) return [];
  const template = state.templates[session.templateId];
  if (!template) return [];
  
  // If session has categoryTemplateIds, filter to those; otherwise return all
  if (session.categoryTemplateIds && session.categoryTemplateIds.length > 0) {
    return template.categoryTemplates.filter((cat) =>
      session.categoryTemplateIds.includes(cat.id)
    );
  }
  
  return template.categoryTemplates;
};
