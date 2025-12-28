import { GameTemplate } from "../state/types";
import { migrateTemplate } from "./migrations";

const TEMPLATE_STORAGE_KEY = "universal-score-keeper-templates-v1";

export const loadTemplates = (): Record<string, GameTemplate> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, GameTemplate>;
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([id, template]) => [id, migrateTemplate(template)])
    );
  } catch {
    return {};
  }
};

export const saveTemplates = (templates: Record<string, GameTemplate>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
};

export const exportTemplate = (template: GameTemplate): string => {
  return JSON.stringify(template, null, 2);
};

export const importTemplate = (value: string): GameTemplate | null => {
  try {
    const parsed = JSON.parse(value) as GameTemplate;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.id || !parsed.name || !parsed.version) return null;
    return migrateTemplate(parsed);
  } catch {
    return null;
  }
};

export const validateTemplate = (template: GameTemplate): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!template.id) errors.push("Template must have an ID");
  if (!template.name || !template.name.trim()) errors.push("Template must have a name");
  if (!template.version) errors.push("Template must have a version");
  if (!template.gameType) errors.push("Template must have a game type");
  if (!template.defaultSettings) errors.push("Template must have default settings");

  // Validate category templates
  if (template.categoryTemplates) {
    template.categoryTemplates.forEach((cat, index) => {
      if (!cat.id) errors.push(`Category template ${index} missing ID`);
      if (!cat.name) errors.push(`Category template ${index} missing name`);
    });
  }

  // Validate rule templates
  if (template.ruleTemplates) {
    template.ruleTemplates.forEach((rule, index) => {
      if (!rule.id) errors.push(`Rule template ${index} missing ID`);
      if (!rule.name) errors.push(`Rule template ${index} missing name`);
      if (!rule.condition) errors.push(`Rule template ${index} missing condition`);
      if (!rule.action) errors.push(`Rule template ${index} missing action`);
    });
  }

  // Validate object definitions
  if (template.objectDefinitions) {
    template.objectDefinitions.forEach((objDef, index) => {
      if (!objDef.id) errors.push(`Object definition ${index} missing ID`);
      if (!objDef.name) errors.push(`Object definition ${index} missing name`);
      if (!objDef.type) errors.push(`Object definition ${index} missing type`);
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};
