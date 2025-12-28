import { GameObjectDefinition } from "../state/types";

export const COMMON_OBJECT_TYPES: Record<string, GameObjectDefinition[]> = {
  Resources: [
    { id: "wood", name: "Wood", type: "resource", defaultValue: 0, min: 0, icon: "🪵", category: "Resources" },
    { id: "stone", name: "Stone", type: "resource", defaultValue: 0, min: 0, icon: "🪨", category: "Resources" },
    { id: "gold", name: "Gold", type: "resource", defaultValue: 0, min: 0, icon: "🪙", category: "Resources" },
    { id: "food", name: "Food", type: "resource", defaultValue: 0, min: 0, icon: "🌾", category: "Resources" },
    { id: "energy", name: "Energy", type: "resource", defaultValue: 0, min: 0, icon: "⚡", category: "Resources" },
    { id: "brick", name: "Brick", type: "resource", defaultValue: 0, min: 0, icon: "🧱", category: "Resources" },
    { id: "sheep", name: "Sheep", type: "resource", defaultValue: 0, min: 0, icon: "🐑", category: "Resources" },
    { id: "wheat", name: "Wheat", type: "resource", defaultValue: 0, min: 0, icon: "🌾", category: "Resources" },
    { id: "ore", name: "Ore", type: "resource", defaultValue: 0, min: 0, icon: "⛏️", category: "Resources" },
  ],
  "Victory Points": [
    { id: "vp", name: "Victory Points", type: "number", defaultValue: 0, min: 0, icon: "⭐", category: "Victory Points" },
    { id: "vp_area", name: "Area Control VP", type: "number", defaultValue: 0, min: 0, icon: "🗺️", category: "Victory Points" },
    { id: "vp_set", name: "Set Collection VP", type: "number", defaultValue: 0, min: 0, icon: "🎴", category: "Victory Points" },
    { id: "vp_bonus", name: "Bonus VP", type: "number", defaultValue: 0, min: 0, icon: "🎁", category: "Victory Points" },
  ],
  Cards: [
    { id: "hand_size", name: "Hand Size", type: "number", defaultValue: 0, min: 0, icon: "🃏", category: "Cards" },
    { id: "cards_played", name: "Cards Played", type: "number", defaultValue: 0, min: 0, icon: "🎴", category: "Cards" },
    { id: "deck_size", name: "Deck Size", type: "number", defaultValue: 0, min: 0, icon: "📚", category: "Cards" },
    { id: "discard_size", name: "Discard Size", type: "number", defaultValue: 0, min: 0, icon: "🗑️", category: "Cards" },
  ],
  Dice: [
    { id: "d6_roll", name: "D6 Roll", type: "number", defaultValue: 0, min: 1, max: 6, icon: "🎲", category: "Dice" },
    { id: "d10_roll", name: "D10 Roll", type: "number", defaultValue: 0, min: 1, max: 10, icon: "🎲", category: "Dice" },
    { id: "d20_roll", name: "D20 Roll", type: "number", defaultValue: 0, min: 1, max: 20, icon: "🎲", category: "Dice" },
    { id: "dice_modifier", name: "Dice Modifier", type: "number", defaultValue: 0, icon: "➕", category: "Dice" },
  ],
  Tracks: [
    { id: "track_position", name: "Track Position", type: "number", defaultValue: 0, min: 0, icon: "📍", category: "Tracks" },
    { id: "progress", name: "Progress", type: "number", defaultValue: 0, min: 0, max: 100, icon: "📊", category: "Tracks" },
    { id: "status_level", name: "Status Level", type: "number", defaultValue: 0, min: 0, icon: "📈", category: "Tracks" },
  ],
  Tokens: [
    { id: "tokens", name: "Tokens", type: "number", defaultValue: 0, min: 0, icon: "🪙", category: "Tokens" },
    { id: "cubes", name: "Cubes", type: "number", defaultValue: 0, min: 0, icon: "🎲", category: "Tokens" },
    { id: "markers", name: "Markers", type: "number", defaultValue: 0, min: 0, icon: "📍", category: "Tokens" },
  ],
  Sets: [
    { 
      id: "wood_resources_set", 
      name: "Wood Resources", 
      type: "set", 
      setType: "identical",
      setElementTemplate: { id: "wood_element", name: "Wood", type: "resource", icon: "🪵", category: "Resources" },
      defaultValue: 0, 
      min: 0, 
      icon: "🪵", 
      category: "Sets",
      description: "A set containing identical wood resources"
    },
    { 
      id: "treasure_cards_set", 
      name: "Treasure Cards", 
      type: "set", 
      setType: "elements",
      setElements: [], // Will be populated by user when adding elements
      defaultValue: 0, 
      icon: "💎", 
      category: "Sets",
      description: "A set containing different treasure card types (gold, emerald, ruby, etc.)"
    },
  ],
  Time: [
    { id: "turns", name: "Turns", type: "number", defaultValue: 0, min: 0, icon: "🔄", category: "Time" },
    { id: "rounds", name: "Rounds", type: "number", defaultValue: 0, min: 0, icon: "⏱️", category: "Time" },
    { id: "phases", name: "Phases", type: "number", defaultValue: 0, min: 0, icon: "📋", category: "Time" },
  ],
  Status: [
    { id: "conditions", name: "Conditions", type: "number", defaultValue: 0, min: 0, icon: "📝", category: "Status" },
    { id: "effects", name: "Effects", type: "number", defaultValue: 0, icon: "✨", category: "Status" },
    { id: "modifiers", name: "Modifiers", type: "number", defaultValue: 0, icon: "🔧", category: "Status" },
  ],
};

export const getAllCommonObjects = (): GameObjectDefinition[] => {
  return Object.values(COMMON_OBJECT_TYPES).flat();
};

export const getObjectsByCategory = (category: string): GameObjectDefinition[] => {
  return COMMON_OBJECT_TYPES[category] || [];
};

export const getObjectById = (id: string): GameObjectDefinition | undefined => {
  return getAllCommonObjects().find((v) => v.id === id);
};
