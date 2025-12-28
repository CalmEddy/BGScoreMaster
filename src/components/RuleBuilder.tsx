import { useState, useEffect } from "react";
import { createId } from "../lib/id";
import Modal from "./Modal";
import { AppState, ScoringRule, Session } from "../state/types";
import { testRule } from "../lib/ruleEngine";

const RuleBuilder = ({
  rule,
  state,
  session,
  onSave,
  onCancel,
}: {
  rule?: ScoringRule | null;
  state: AppState;
  session: Session;
  onSave: (rule: ScoringRule) => void;
  onCancel: () => void;
}) => {
  const [name, setName] = useState(rule?.name || "");
  const [conditionType, setConditionType] = useState<"total" | "category" | "round">(
    rule?.condition.type || "total"
  );
  const [conditionOperator, setConditionOperator] = useState<">=" | "<=" | "==" | "!=" | ">" | "<">(
    rule?.condition.operator || ">="
  );
  const [conditionValue, setConditionValue] = useState<string>(
    (rule?.condition.value || 0).toString()
  );
  const [conditionCategoryId, setConditionCategoryId] = useState<string | undefined>(
    rule?.condition.categoryId
  );
  const [conditionRoundId, setConditionRoundId] = useState<string | undefined>(
    rule?.condition.roundId
  );
  const [actionType, setActionType] = useState<"add" | "multiply" | "set">(
    rule?.action.type || "add"
  );
  const [actionValue, setActionValue] = useState<string>((rule?.action.value || 0).toString());
  const [actionCategoryId, setActionCategoryId] = useState<string | undefined>(
    rule?.action.targetCategoryId
  );
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);

  const categories = Object.values(state.categories).filter((c) => c.sessionId === session.id);
  const rounds = Object.values(state.rounds).filter((r) => r.sessionId === session.id);

  const handleSave = () => {
    const numConditionValue = parseFloat(conditionValue);
    const numActionValue = parseFloat(actionValue);

    if (!name.trim()) {
      alert("Please enter a rule name");
      return;
    }

    if (isNaN(numConditionValue)) {
      alert("Condition value must be a number");
      return;
    }

    if (isNaN(numActionValue)) {
      alert("Action value must be a number");
      return;
    }

    if (conditionType === "category" && !conditionCategoryId) {
      alert("Please select a category for the condition");
      return;
    }

    if (conditionType === "round" && !conditionRoundId) {
      alert("Please select a round for the condition");
      return;
    }

    const newRule: ScoringRule = {
      id: rule?.id || createId(),
      sessionId: session.id,
      name: name.trim(),
      condition: {
        type: conditionType,
        operator: conditionOperator,
        value: numConditionValue,
        categoryId: conditionType === "category" ? conditionCategoryId : undefined,
        roundId: conditionType === "round" ? conditionRoundId : undefined,
      },
      action: {
        type: actionType,
        value: numActionValue,
        targetCategoryId: actionCategoryId,
      },
      enabled,
    };

    onSave(newRule);
  };

  // Test rule with first player
  const [testResult, setTestResult] = useState<{ wouldTrigger: boolean; entry?: any } | null>(
    null
  );
  const firstPlayerId = session.playerIds[0];

  const handleTest = () => {
    if (!firstPlayerId) {
      alert("No players in session");
      return;
    }

    const numConditionValue = parseFloat(conditionValue);
    const numActionValue = parseFloat(actionValue);

    if (isNaN(numConditionValue) || isNaN(numActionValue)) {
      return;
    }

    const testRuleData: ScoringRule = {
      id: createId(),
      sessionId: session.id,
      name: name.trim() || "Test Rule",
      condition: {
        type: conditionType,
        operator: conditionOperator,
        value: numConditionValue,
        categoryId: conditionType === "category" ? conditionCategoryId : undefined,
        roundId: conditionType === "round" ? conditionRoundId : undefined,
      },
      action: {
        type: actionType,
        value: numActionValue,
        targetCategoryId: actionCategoryId,
      },
      enabled: true,
    };

    const result = testRule(testRuleData, state, session.id, firstPlayerId);
    setTestResult(result);
  };

  return (
    <Modal title={rule ? "Edit Rule" : "New Rule"} onClose={onCancel}>
      <div className="stack">
        <div>
          <label className="label">Rule Name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Bonus for 10+ territories"
          />
        </div>

        <div>
          <label className="label">Condition</label>
          <div className="stack" style={{ gap: "8px" }}>
            <select
              className="input"
              value={conditionType}
              onChange={(e) => setConditionType(e.target.value as "total" | "category" | "round")}
            >
              <option value="total">Total Score</option>
              <option value="category">Category Total</option>
              <option value="round">Round Entries</option>
            </select>

            {conditionType === "category" && (
              <select
                className="input"
                value={conditionCategoryId || ""}
                onChange={(e) => setConditionCategoryId(e.target.value || undefined)}
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}

            {conditionType === "round" && (
              <select
                className="input"
                value={conditionRoundId || ""}
                onChange={(e) => setConditionRoundId(e.target.value || undefined)}
              >
                <option value="">Select round</option>
                {rounds.map((round) => (
                  <option key={round.id} value={round.id}>
                    {round.label}
                  </option>
                ))}
              </select>
            )}

            <div className="inline">
              <select
                className="input"
                value={conditionOperator}
                onChange={(e) =>
                  setConditionOperator(e.target.value as ">=" | "<=" | "==" | "!=" | ">" | "<")
                }
              >
                <option value=">=">≥ (greater than or equal)</option>
                <option value="<=">≤ (less than or equal)</option>
                <option value="==">= (equal)</option>
                <option value="!=">≠ (not equal)</option>
                <option value=">">&gt; (greater than)</option>
                <option value="<">&lt; (less than)</option>
              </select>
              <input
                className="input"
                type="number"
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                placeholder="Value"
                style={{ width: "120px" }}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="label">Action</label>
          <div className="stack" style={{ gap: "8px" }}>
            <select
              className="input"
              value={actionType}
              onChange={(e) => setActionType(e.target.value as "add" | "multiply" | "set")}
            >
              <option value="add">Add Points</option>
              <option value="multiply">Multiply</option>
              <option value="set">Set To</option>
            </select>

            <div className="inline">
              <input
                className="input"
                type="number"
                value={actionValue}
                onChange={(e) => setActionValue(e.target.value)}
                placeholder="Value"
                style={{ flex: 1 }}
              />
              <select
                className="input"
                value={actionCategoryId || ""}
                onChange={(e) => setActionCategoryId(e.target.value || undefined)}
                style={{ width: "200px" }}
              >
                <option value="">Apply to total</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <label className="inline">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          <span>Rule enabled</span>
        </label>

        {firstPlayerId && (
          <div>
            <button className="button secondary" onClick={handleTest}>
              Test Rule
            </button>
            {testResult && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "8px",
                  background: testResult.wouldTrigger ? "#dcfce7" : "#fef3c7",
                  borderRadius: "4px",
                  fontSize: "0.875rem",
                }}
              >
                {testResult.wouldTrigger ? (
                  <div>
                    ✓ Rule would trigger
                    {testResult.entry && (
                      <div style={{ marginTop: "4px" }}>
                        Would add entry: {testResult.entry.value > 0 ? "+" : ""}
                        {testResult.entry.value} points
                      </div>
                    )}
                  </div>
                ) : (
                  <div>✗ Rule would not trigger with current scores</div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="inline" style={{ justifyContent: "flex-end", marginTop: "8px" }}>
          <button className="button secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="button" onClick={handleSave}>
            Save Rule
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RuleBuilder;

