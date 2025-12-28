import { createId } from "../id";
import { GameTemplate } from "../../state/types";

export const createStarterTemplates = (): GameTemplate[] => {
  const now = Date.now();

  return [
    {
      id: createId(),
      name: "Simple Scoring",
      description: "A basic scoring system for any game. Just track points.",
      version: "1.0.0",
      gameType: "custom",
      icon: "📊",
      createdAt: now,
      updatedAt: now,
      defaultSettings: {
        roundsEnabled: false,
        scoreDirection: "higherWins",
        allowNegative: false,
        minPlayers: 2,
        maxPlayers: 8,
        defaultPlayerCount: 4,
      },
      categoryTemplates: [
        {
          id: createId(),
          name: "Points",
          sortOrder: 1,
          displayType: "sum",
          required: true,
        },
      ],
      ruleTemplates: [],
      variableDefinitions: [],
      mechanics: [],
    },
    {
      id: createId(),
      name: "Resource Management",
      description: "Track multiple resources and convert them to victory points.",
      version: "1.0.0",
      gameType: "board",
      icon: "🪵",
      createdAt: now,
      updatedAt: now,
      defaultSettings: {
        roundsEnabled: true,
        scoreDirection: "higherWins",
        allowNegative: false,
        minPlayers: 2,
        maxPlayers: 6,
        defaultPlayerCount: 4,
      },
      categoryTemplates: [
        {
          id: createId(),
          name: "Resources",
          sortOrder: 1,
          displayType: "sum",
          required: true,
          icon: "🪵",
        },
        {
          id: createId(),
          name: "Victory Points",
          sortOrder: 2,
          displayType: "formula",
          defaultFormula: "{Resources} * 0.5",
          required: true,
          icon: "⭐",
        },
      ],
      ruleTemplates: [],
      variableDefinitions: [
        {
          id: "wood",
          name: "Wood",
          type: "resource",
          defaultValue: 0,
          min: 0,
          icon: "🪵",
          category: "Resources",
        },
        {
          id: "stone",
          name: "Stone",
          type: "resource",
          defaultValue: 0,
          min: 0,
          icon: "🪨",
          category: "Resources",
        },
        {
          id: "gold",
          name: "Gold",
          type: "resource",
          defaultValue: 0,
          min: 0,
          icon: "🪙",
          category: "Resources",
        },
      ],
      mechanics: [
        {
          id: createId(),
          type: "resourceManagement",
          name: "Resource Management",
          config: {
            resourceTypes: ["Wood", "Stone", "Gold"],
          },
          enabled: true,
        },
      ],
    },
    {
      id: createId(),
      name: "Area Control",
      description: "Score points based on territory control and area dominance.",
      version: "1.0.0",
      gameType: "board",
      icon: "🗺️",
      createdAt: now,
      updatedAt: now,
      defaultSettings: {
        roundsEnabled: true,
        scoreDirection: "higherWins",
        allowNegative: false,
        minPlayers: 2,
        maxPlayers: 6,
        defaultPlayerCount: 4,
      },
      categoryTemplates: [
        {
          id: createId(),
          name: "Territories Controlled",
          sortOrder: 1,
          displayType: "sum",
          required: true,
          icon: "📍",
        },
        {
          id: createId(),
          name: "Area Control Points",
          sortOrder: 2,
          displayType: "formula",
          defaultFormula: "{Territories Controlled} * 2",
          required: true,
          icon: "🗺️",
        },
        {
          id: createId(),
          name: "Victory Points",
          sortOrder: 3,
          displayType: "formula",
          defaultFormula: "{Area Control Points} + {Bonus Points}",
          required: true,
          icon: "⭐",
        },
        {
          id: createId(),
          name: "Bonus Points",
          sortOrder: 4,
          displayType: "sum",
          required: false,
          icon: "🎁",
        },
      ],
      ruleTemplates: [],
      variableDefinitions: [
        {
          id: "territories",
          name: "Territories",
          type: "territory",
          defaultValue: 0,
          min: 0,
          icon: "📍",
          category: "Territories",
        },
      ],
      mechanics: [
        {
          id: createId(),
          type: "territoryControl",
          name: "Territory Control",
          config: {
            territoryCount: 10,
          },
          enabled: true,
        },
      ],
    },
  ];
};

export const initializeStarterTemplates = (existingTemplates: Record<string, GameTemplate>): Record<string, GameTemplate> => {
  const starters = createStarterTemplates();
  const result = { ...existingTemplates };
  
  // Only add starters if they don't already exist (by name)
  starters.forEach((starter) => {
    const exists = Object.values(result).some((t) => t.name === starter.name);
    if (!exists) {
      result[starter.id] = starter;
    }
  });
  
  return result;
};

