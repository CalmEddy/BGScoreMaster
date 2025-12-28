import { createId } from "./id";
import { AppState, Category, GameTemplate, Player, Round, ScoringRule, Session } from "../state/types";
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
    categoryIds: [],
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

  // Create categories from templates
  const categoryMap = new Map<string, string>(); // templateId -> actualId
  const createCategories = (parentTemplateId?: string, parentActualId?: string) => {
    template.categoryTemplates
      .filter((cat) => cat.parentId === parentTemplateId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((catTemplate) => {
        const categoryId = createId();
        categoryMap.set(catTemplate.id, categoryId);

        const category: Category = {
          id: categoryId,
          sessionId,
          name: catTemplate.name,
          sortOrder: catTemplate.sortOrder,
          parentCategoryId: parentActualId,
          displayType: catTemplate.displayType,
          weight: catTemplate.defaultWeight,
          formula: catTemplate.defaultFormula,
        };

        dispatch({ type: "category/add", payload: category });
        dispatch({
          type: "session/update",
          payload: {
            ...session,
            categoryIds: [...(session.categoryIds || []), categoryId],
          },
        });

        // Recursively create children
        createCategories(catTemplate.id, categoryId);
      });
  };

  createCategories();

  // Create rules from templates
  const ruleIds: string[] = [];
  template.ruleTemplates
    .filter((rule) => rule.enabled)
    .forEach((ruleTemplate) => {
      const ruleId = createId();
      ruleIds.push(ruleId);

      // Map category IDs in condition and action
      const condition = {
        ...ruleTemplate.condition,
        categoryId: ruleTemplate.condition.categoryId
          ? categoryMap.get(ruleTemplate.condition.categoryId)
          : ruleTemplate.condition.categoryId,
      };

      const action = {
        ...ruleTemplate.action,
        targetCategoryId: ruleTemplate.action.targetCategoryId
          ? categoryMap.get(ruleTemplate.action.targetCategoryId)
          : ruleTemplate.action.targetCategoryId,
      };

      const rule: ScoringRule = {
        id: ruleId,
        sessionId,
        name: ruleTemplate.name,
        condition,
        action,
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
      categoryIds: Array.from(categoryMap.values()),
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

  // Create categories from templates
  const categoryMap = new Map<string, string>(); // templateId -> actualId
  const newCategoryIds: string[] = [];
  
  const createCategories = (parentTemplateId?: string, parentActualId?: string) => {
    template.categoryTemplates
      .filter((cat) => cat.parentId === parentTemplateId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((catTemplate) => {
        const categoryId = createId();
        categoryMap.set(catTemplate.id, categoryId);
        newCategoryIds.push(categoryId);

        const category: Category = {
          id: categoryId,
          sessionId,
          name: catTemplate.name,
          sortOrder: catTemplate.sortOrder,
          parentCategoryId: parentActualId,
          displayType: catTemplate.displayType,
          weight: catTemplate.defaultWeight,
          formula: catTemplate.defaultFormula,
        };

        dispatch({ type: "category/add", payload: category });

        // Recursively create children
        createCategories(catTemplate.id, categoryId);
      });
  };

  createCategories();

  // Create rules from templates
  const newRuleIds: string[] = [];
  template.ruleTemplates
    .filter((rule) => rule.enabled)
    .forEach((ruleTemplate) => {
      const ruleId = createId();
      newRuleIds.push(ruleId);

      // Map category IDs in condition and action
      const condition = {
        ...ruleTemplate.condition,
        categoryId: ruleTemplate.condition.categoryId
          ? categoryMap.get(ruleTemplate.condition.categoryId)
          : ruleTemplate.condition.categoryId,
      };

      const action = {
        ...ruleTemplate.action,
        targetCategoryId: ruleTemplate.action.targetCategoryId
          ? categoryMap.get(ruleTemplate.action.targetCategoryId)
          : ruleTemplate.action.targetCategoryId,
      };

      const rule: ScoringRule = {
        id: ruleId,
        sessionId,
        name: ruleTemplate.name,
        condition,
        action,
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
  dispatch({
    type: "session/update",
    payload: {
      ...session,
      templateId: template.id,
      categoryIds: [...(session.categoryIds || []), ...newCategoryIds],
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
