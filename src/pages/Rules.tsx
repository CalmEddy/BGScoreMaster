import { useState } from "react";
import { createId } from "../lib/id";
import { AppAction, AppState, ScoringRule, Session } from "../state/types";
import { updateSession } from "../state/store";
import RuleBuilder from "../components/RuleBuilder";

const Rules = ({
  state,
  session,
  dispatch,
  onBack,
}: {
  state: AppState;
  session: Session;
  dispatch: React.Dispatch<AppAction>;
  onBack: () => void;
}) => {
  const rules = (session.ruleIds || [])
    .map((id) => state.rules[id])
    .filter((rule): rule is ScoringRule => rule !== undefined);

  const [editingRule, setEditingRule] = useState<ScoringRule | null>(null);
  const [creatingRule, setCreatingRule] = useState(false);

  const handleDelete = (rule: ScoringRule) => {
    if (!window.confirm(`Delete rule "${rule.name}"?`)) return;
    dispatch({ type: "rule/remove", payload: { sessionId: session.id, ruleId: rule.id } });
  };

  const handleToggle = (rule: ScoringRule) => {
    dispatch({
      type: "rule/update",
      payload: { ...rule, enabled: !rule.enabled },
    });
  };

  const handleSave = (rule: ScoringRule) => {
    if (editingRule) {
      dispatch({ type: "rule/update", payload: rule });
      setEditingRule(null);
    } else {
      dispatch({ type: "rule/add", payload: rule });
      setCreatingRule(false);
    }
  };

  return (
    <div className="app">
      <div className="topbar">
        <button className="button ghost" onClick={onBack}>
          Back
        </button>
        <h1>Scoring Rules</h1>
        <button className="button" onClick={() => setCreatingRule(true)}>
          + New Rule
        </button>
      </div>
      <div className="container stack">
        <div className="card stack">
          <div className="card-title">Automatic Scoring Rules</div>
          <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            Rules automatically apply scores when conditions are met. Rules are evaluated after each score entry.
          </p>
          {rules.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px" }}>
              <p style={{ marginBottom: "12px" }}>No rules yet.</p>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "16px" }}>
                Rules automatically apply scores when conditions are met.
              </p>
              <button className="button" onClick={() => setCreatingRule(true)}>
                Create Your First Rule
              </button>
            </div>
          ) : (
            <div className="list">
              {rules.map((rule) => (
                <div key={rule.id} className="card">
                  <div className="inline" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                      <div className="inline" style={{ gap: "8px", marginBottom: "8px" }}>
                        <strong>{rule.name}</strong>
                        <label className="inline">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={() => handleToggle(rule)}
                          />
                          <span style={{ fontSize: "0.875rem" }}>Enabled</span>
                        </label>
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "4px" }}>
                        <strong>If:</strong>{" "}
                        {rule.condition.type === "total" && "Total score"}
                        {rule.condition.type === "category" &&
                          `Category "${state.categories[rule.condition.categoryId || ""]?.name || "Unknown"}"`}
                        {rule.condition.type === "round" && "Round entries"}
                        {` ${rule.condition.operator} ${rule.condition.value}`}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                        <strong>Then:</strong>{" "}
                        {rule.action.type === "add" && `Add ${rule.action.value} points`}
                        {rule.action.type === "multiply" && `Multiply by ${rule.action.value}`}
                        {rule.action.type === "set" && `Set to ${rule.action.value} points`}
                        {rule.action.targetCategoryId &&
                          ` to "${state.categories[rule.action.targetCategoryId]?.name || "Unknown"}"`}
                      </div>
                    </div>
                    <div className="inline">
                      <button
                        className="button secondary"
                        onClick={() => setEditingRule(rule)}
                      >
                        Edit
                      </button>
                      <button className="button danger" onClick={() => handleDelete(rule)}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {(editingRule || creatingRule) && (
        <RuleBuilder
          rule={editingRule}
          state={state}
          session={session}
          onSave={handleSave}
          onCancel={() => {
            setEditingRule(null);
            setCreatingRule(false);
          }}
        />
      )}
    </div>
  );
};

export default Rules;

