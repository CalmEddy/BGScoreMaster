import { useState } from "react";
import { createId } from "../lib/id";
import { AppAction, AppState, CategoryTemplate, GameTemplate, RuleTemplate, VariableDefinition } from "../state/types";
import CategoryBuilder from "../components/CategoryBuilder";
import VariableBuilder from "../components/VariableBuilder";
import RuleTemplateEditor from "../components/RuleTemplateEditor";
import CategoryTemplateEditor from "../components/CategoryTemplateEditor";
import PlayerCardDesigner from "../components/PlayerCardDesigner";

const TemplateBuilder = ({
  state,
  templateId,
  dispatch,
  onSave,
  onCancel,
}: {
  state: AppState;
  templateId?: string;
  dispatch: React.Dispatch<AppAction>;
  onSave: () => void;
  onCancel: () => void;
}) => {
  const existingTemplate = templateId ? state.templates[templateId] : undefined;

  const [step, setStep] = useState(0);
  const [name, setName] = useState(existingTemplate?.name || "");
  const [description, setDescription] = useState(existingTemplate?.description || "");
  const [author, setAuthor] = useState(existingTemplate?.author || "");
  const [gameType, setGameType] = useState<"board" | "card" | "dice" | "custom">(
    existingTemplate?.gameType || "board"
  );
  const [icon, setIcon] = useState(existingTemplate?.icon || "");
  const [roundsEnabled, setRoundsEnabled] = useState(existingTemplate?.defaultSettings.roundsEnabled ?? true);
  const [scoreDirection, setScoreDirection] = useState<"higherWins" | "lowerWins">(
    existingTemplate?.defaultSettings.scoreDirection || "higherWins"
  );
  const [allowNegative, setAllowNegative] = useState(existingTemplate?.defaultSettings.allowNegative ?? true);
  const [minPlayers, setMinPlayers] = useState<string>((existingTemplate?.defaultSettings.minPlayers || 2).toString());
  const [maxPlayers, setMaxPlayers] = useState<string>((existingTemplate?.defaultSettings.maxPlayers || 6).toString());
  const [defaultPlayerCount, setDefaultPlayerCount] = useState<string>(
    (existingTemplate?.defaultSettings.defaultPlayerCount || 4).toString()
  );
  const [categoryTemplates, setCategoryTemplates] = useState<CategoryTemplate[]>(
    existingTemplate?.categoryTemplates || []
  );
  const [ruleTemplates, setRuleTemplates] = useState<RuleTemplate[]>(existingTemplate?.ruleTemplates || []);
  const [variableDefinitions, setVariableDefinitions] = useState<VariableDefinition[]>(
    existingTemplate?.variableDefinitions || []
  );
  const [playerCardConfig, setPlayerCardConfig] = useState(
    existingTemplate?.playerCardConfig
  );
  const [editingRule, setEditingRule] = useState<RuleTemplate | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryTemplate | null>(null);

  const steps = [
    "Basic Info",
    "Settings",
    "Categories",
    "Variables",
    "Rules",
    "Player Card",
    "Preview",
  ];

  const handleSave = () => {
    if (!name.trim()) {
      alert("Please enter a template name");
      return;
    }

    const template: GameTemplate = {
      id: existingTemplate?.id || createId(),
      name: name.trim(),
      description: description.trim() || undefined,
      author: author.trim() || undefined,
      version: existingTemplate?.version || "1.0.0",
      gameType,
      icon: icon.trim() || undefined,
      createdAt: existingTemplate?.createdAt || Date.now(),
      updatedAt: Date.now(),
      defaultSettings: {
        roundsEnabled,
        scoreDirection,
        allowNegative,
        minPlayers: parseInt(minPlayers) || undefined,
        maxPlayers: parseInt(maxPlayers) || undefined,
        defaultPlayerCount: parseInt(defaultPlayerCount) || undefined,
      },
      categoryTemplates,
      ruleTemplates,
      variableDefinitions,
      mechanics: existingTemplate?.mechanics || [],
      playerCardConfig,
    };

    if (existingTemplate) {
      dispatch({ type: "template/update", payload: template });
    } else {
      dispatch({ type: "template/create", payload: template });
    }

    onSave();
  };

  const canProceed = () => {
    if (step === 0) return name.trim().length > 0;
    return true;
  };

  return (
    <div className="app">
      <div className="topbar">
        <button className="button ghost" onClick={onCancel}>
          Cancel
        </button>
        <h1>{existingTemplate ? "Edit Template" : "New Template"}</h1>
        <button className="button" onClick={handleSave} disabled={!canProceed()}>
          Save Template
        </button>
      </div>
      <div className="container stack">
        <div className="card">
          <div className="inline" style={{ justifyContent: "center", gap: "8px", flexWrap: "wrap" }}>
            {steps.map((stepName, index) => (
              <button
                key={index}
                className={`button ${step === index ? "" : "secondary"}`}
                onClick={() => setStep(index)}
                disabled={index > step && !canProceed()}
                style={{ fontSize: "0.875rem" }}
              >
                {index + 1}. {stepName}
              </button>
            ))}
          </div>
        </div>

        <div className="card stack">
          {step === 0 && (
            <div className="stack">
              <h2>Basic Information</h2>
              <div>
                <label className="label">Template Name *</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Catan Scoring System"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this scoring system..."
                />
              </div>
              <div>
                <label className="label">Author</label>
                <input
                  className="input"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Your name (optional)"
                />
              </div>
              <div>
                <label className="label">Game Type</label>
                <select className="input" value={gameType} onChange={(e) => setGameType(e.target.value as any)}>
                  <option value="board">Board Game</option>
                  <option value="card">Card Game</option>
                  <option value="dice">Dice Game</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="label">Icon (emoji)</label>
                <input
                  className="input"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="🎲 (optional)"
                  maxLength={2}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="stack">
              <h2>Default Settings</h2>
              <div>
                <label className="label">Score Direction</label>
                <select
                  className="input"
                  value={scoreDirection}
                  onChange={(e) => setScoreDirection(e.target.value as "higherWins" | "lowerWins")}
                >
                  <option value="higherWins">Higher wins</option>
                  <option value="lowerWins">Lower wins</option>
                </select>
              </div>
              <label className="inline">
                <input
                  type="checkbox"
                  checked={roundsEnabled}
                  onChange={(e) => setRoundsEnabled(e.target.checked)}
                />
                Rounds enabled by default
              </label>
              <label className="inline">
                <input
                  type="checkbox"
                  checked={allowNegative}
                  onChange={(e) => setAllowNegative(e.target.checked)}
                />
                Allow negative scores by default
              </label>
              <div className="inline">
                <div style={{ flex: 1 }}>
                  <label className="label">Min Players</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={minPlayers}
                    onChange={(e) => setMinPlayers(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label">Max Players</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(e.target.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label">Default Player Count</label>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    value={defaultPlayerCount}
                    onChange={(e) => setDefaultPlayerCount(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="stack">
              <h2>Categories</h2>
              <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                Define the category structure for this template. Categories will be created automatically when the template is used.
              </p>
              <CategoryBuilder
                categories={categoryTemplates}
                onChange={setCategoryTemplates}
                variables={variableDefinitions.map((v) => v.id)}
                onEdit={(category) => setEditingCategory(category)}
              />
            </div>
          )}

          {step === 3 && (
            <div className="stack">
              <h2>Variables</h2>
              <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                Define custom variables for this game (resources, tokens, etc.). Variables will be available in formulas and rules.
              </p>
              <VariableBuilder variables={variableDefinitions} onChange={setVariableDefinitions} />
            </div>
          )}

          {step === 4 && (
            <div className="stack">
              <h2>Rules</h2>
              <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                Define automatic scoring rules that will be applied when the template is used. Rules can reference categories and variables.
              </p>
              <div className="card stack">
                <div className="card-title">Rule Templates</div>
                {ruleTemplates.length === 0 ? (
                  <p>No rules defined yet. Rules are optional - you can add them later or in the session.</p>
                ) : (
                  <div className="list">
                    {ruleTemplates.map((rule) => (
                      <div key={rule.id} className="card inline" style={{ justifyContent: "space-between" }}>
                        <div>
                          <strong>{rule.name}</strong>
                          {rule.description && (
                            <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>{rule.description}</p>
                          )}
                          <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "4px" }}>
                            If {rule.condition.type} {rule.condition.operator} {rule.condition.value}, then {rule.action.type} {rule.action.value}
                          </div>
                          <label className="inline" style={{ marginTop: "8px" }}>
                            <input
                              type="checkbox"
                              checked={rule.enabled}
                              onChange={(e) => {
                                setRuleTemplates(
                                  ruleTemplates.map((r) =>
                                    r.id === rule.id ? { ...r, enabled: e.target.checked } : r
                                  )
                                );
                              }}
                            />
                            <span style={{ fontSize: "0.875rem" }}>Enabled</span>
                          </label>
                        </div>
                        <div className="inline">
                          <button
                            className="button secondary"
                            onClick={() => setEditingRule(rule)}
                          >
                            Edit
                          </button>
                          <button
                            className="button danger"
                            onClick={() => {
                              if (window.confirm("Remove this rule template?")) {
                                setRuleTemplates(ruleTemplates.filter((r) => r.id !== rule.id));
                              }
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  className="button secondary"
                  onClick={() => {
                    const newRule: RuleTemplate = {
                      id: createId(),
                      name: "New Rule",
                      condition: {
                        type: "total",
                        operator: ">=",
                        value: 10,
                      },
                      action: {
                        type: "add",
                        value: 5,
                      },
                      enabled: true,
                      required: false,
                    };
                    setRuleTemplates([...ruleTemplates, newRule]);
                  }}
                >
                  + Add Rule Template
                </button>
                <p style={{ fontSize: "0.75rem", color: "#9ca3af", fontStyle: "italic" }}>
                  Note: Full rule editing will be available in a future update. For now, you can add basic rules that will be configured in the session.
                </p>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="stack">
              <h2>Player Card</h2>
              <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                Configure the layout and functionality of player cards in sessions using this template.
              </p>
              <PlayerCardDesigner
                config={playerCardConfig}
                categories={categoryTemplates}
                variables={variableDefinitions}
                onChange={setPlayerCardConfig}
              />
            </div>
          )}

          {step === 6 && (
            <div className="stack">
              <h2>Preview</h2>
              <div className="card stack">
                <div className="inline" style={{ gap: "8px", marginBottom: "12px" }}>
                  {icon && <span style={{ fontSize: "2rem" }}>{icon}</span>}
                  <div>
                    <h3 style={{ margin: 0 }}>{name || "Untitled Template"}</h3>
                    {description && <p style={{ margin: "4px 0", color: "#6b7280" }}>{description}</p>}
                    <span className="badge">{gameType}</span>
                    {author && <span className="badge">by {author}</span>}
                  </div>
                </div>
                <div style={{ fontSize: "0.875rem" }}>
                  <p><strong>Settings:</strong> {scoreDirection}, Rounds: {roundsEnabled ? "Yes" : "No"}, Negatives: {allowNegative ? "Allowed" : "Not allowed"}</p>
                  <p><strong>Categories:</strong> {categoryTemplates.length}</p>
                  <p><strong>Rules:</strong> {ruleTemplates.length}</p>
                  <p><strong>Variables:</strong> {variableDefinitions.length}</p>
                  {playerCardConfig && (
                    <>
                      <p><strong>Player Card:</strong> Configured</p>
                      <p style={{ fontSize: "0.875rem", marginLeft: "16px" }}>
                        Add/Subtract: {playerCardConfig.addSubtractSection.enabled ? "Enabled" : "Disabled"} 
                        ({playerCardConfig.addSubtractSection.buttons.length} buttons)
                      </p>
                      <p style={{ fontSize: "0.875rem", marginLeft: "16px" }}>
                        Variables: {playerCardConfig.variablesSection.enabled ? "Enabled" : "Disabled"}
                        ({playerCardConfig.variablesSection.tableConfig.columns.length} columns)
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="inline" style={{ justifyContent: "space-between", marginTop: "16px" }}>
            <button className="button secondary" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
              Previous
            </button>
            <button
              className="button"
              onClick={() => setStep(Math.min(steps.length - 1, step + 1))}
              disabled={step === steps.length - 1 || !canProceed()}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {editingRule && (
        <RuleTemplateEditor
          rule={editingRule}
          categories={categoryTemplates}
          onSave={(updatedRule) => {
            setRuleTemplates(
              ruleTemplates.map((r) => (r.id === updatedRule.id ? updatedRule : r))
            );
            setEditingRule(null);
          }}
          onCancel={() => setEditingRule(null)}
        />
      )}

      {editingCategory && (
        <CategoryTemplateEditor
          category={editingCategory}
          allCategories={categoryTemplates}
          variables={variableDefinitions}
          onSave={(updatedCategory) => {
            setCategoryTemplates(
              categoryTemplates.map((c) => (c.id === updatedCategory.id ? updatedCategory : c))
            );
            setEditingCategory(null);
          }}
          onCancel={() => setEditingCategory(null)}
        />
      )}
    </div>
  );
};

export default TemplateBuilder;

