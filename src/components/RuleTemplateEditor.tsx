import { useState } from "react";
import Modal from "./Modal";
import { RuleTemplate, CategoryTemplate } from "../state/types";

type RuleTemplateEditorProps = {
  rule: RuleTemplate;
  categories: CategoryTemplate[];
  onSave: (rule: RuleTemplate) => void;
  onCancel: () => void;
};

const RuleTemplateEditor: React.FC<RuleTemplateEditorProps> = ({
  rule,
  categories,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(rule.name);
  const [description, setDescription] = useState(rule.description || "");
  const [conditionType, setConditionType] = useState<"total" | "category" | "round">(
    rule.condition.type
  );
  const [conditionCategoryId, setConditionCategoryId] = useState(rule.condition.categoryId || "");
  const [operator, setOperator] = useState(rule.condition.operator);
  const [conditionValue, setConditionValue] = useState(rule.condition.value.toString());
  const [actionType, setActionType] = useState<"add" | "multiply" | "set">(rule.action.type);
  const [actionValue, setActionValue] = useState(rule.action.value.toString());
  const [targetCategoryId, setTargetCategoryId] = useState(rule.action.targetCategoryId || "");
  const [enabled, setEnabled] = useState(rule.enabled);
  const [required, setRequired] = useState(rule.required);

  const handleSave = () => {
    if (!name.trim()) {
      alert("Please enter a rule name");
      return;
    }

    const updatedRule: RuleTemplate = {
      ...rule,
      name: name.trim(),
      description: description.trim() || undefined,
      condition: {
        type: conditionType,
        operator,
        value: parseFloat(conditionValue) || 0,
        categoryId: conditionType === "category" ? conditionCategoryId : undefined,
        roundId: conditionType === "round" ? rule.condition.roundId : undefined,
      },
      action: {
        type: actionType,
        value: parseFloat(actionValue) || 0,
        targetCategoryId: targetCategoryId || undefined,
      },
      enabled,
      required,
    };

    onSave(updatedRule);
  };

  return (
    <Modal title="Edit Rule Template" onClose={onCancel}>
      <div className="stack">
        <div>
          <label className="label">Rule Name *</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Victory Point Bonus"
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>

        <div className="card-title">Condition</div>
        <div>
          <label className="label">Type</label>
          <select
            className="input"
            value={conditionType}
            onChange={(e) => setConditionType(e.target.value as "total" | "category" | "round")}
          >
            <option value="total">Player Total</option>
            <option value="category">Category Total</option>
            <option value="round">Round</option>
          </select>
        </div>
        {conditionType === "category" && (
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={conditionCategoryId}
              onChange={(e) => setConditionCategoryId(e.target.value)}
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="inline">
          <div style={{ flex: 1 }}>
            <label className="label">Operator</label>
            <select className="input" value={operator} onChange={(e) => setOperator(e.target.value as any)}>
              <option value=">=">&gt;= (Greater or Equal)</option>
              <option value="<=">&lt;= (Less or Equal)</option>
              <option value="==">== (Equal)</option>
              <option value="!=">!= (Not Equal)</option>
              <option value=">">&gt; (Greater Than)</option>
              <option value="<">&lt; (Less Than)</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Value</label>
            <input
              className="input"
              type="number"
              value={conditionValue}
              onChange={(e) => setConditionValue(e.target.value)}
            />
          </div>
        </div>

        <div className="card-title">Action</div>
        <div>
          <label className="label">Action Type</label>
          <select
            className="input"
            value={actionType}
            onChange={(e) => setActionType(e.target.value as "add" | "multiply" | "set")}
          >
            <option value="add">Add</option>
            <option value="multiply">Multiply by</option>
            <option value="set">Set to</option>
          </select>
        </div>
        <div className="inline">
          <div style={{ flex: 1 }}>
            <label className="label">Value</label>
            <input
              className="input"
              type="number"
              value={actionValue}
              onChange={(e) => setActionValue(e.target.value)}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Target Category (optional)</label>
            <select
              className="input"
              value={targetCategoryId}
              onChange={(e) => setTargetCategoryId(e.target.value)}
            >
              <option value="">Player Total</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="inline">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Enabled
        </label>
        <label className="inline">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
          Required (must be included when template is used)
        </label>

        <div className="inline" style={{ justifyContent: "flex-end", marginTop: "16px" }}>
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

export default RuleTemplateEditor;
