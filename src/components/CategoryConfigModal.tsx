import { useState, useMemo } from "react";
import Modal from "./Modal";
import FormulaEditor from "./FormulaEditor";
import { CategoryTemplate, AppState } from "../state/types";
import { getSessionTemplateCategories } from "../lib/templateApplication";

const CategoryConfigModal = ({
  category,
  state,
  sessionId,
  onClose,
  onSave,
}: {
  category: CategoryTemplate;
  state: AppState;
  sessionId: string;
  onClose: () => void;
  onSave: (category: CategoryTemplate) => void;
}) => {
  const [displayType, setDisplayType] = useState<"sum" | "formula" | "weighted">(
    category.displayType ?? "sum"
  );
  const [weight, setWeight] = useState<string>(
    (category.defaultWeight ?? 1.0).toString()
  );
  const [formula, setFormula] = useState(category.defaultFormula ?? "");

  const handleSave = () => {
    const updated: CategoryTemplate = {
      ...category,
      displayType,
      defaultWeight: displayType === "weighted" ? parseFloat(weight) || 1.0 : undefined,
      defaultFormula: displayType === "formula" ? formula.trim() || undefined : undefined,
    };
    onSave(updated);
    onClose();
  };

  // Always get fresh template from state - don't cache it
  const session = state.sessions[sessionId];
  const template = useMemo(() => {
    return session?.templateId ? state.templates[session.templateId] : undefined;
  }, [session?.templateId, state.templates]);
  
  const templateCategories = useMemo(() => {
    if (!session) return [];
    return getSessionTemplateCategories(state, session);
  }, [state.templates, session?.templateId, session?.categoryTemplateIds]);

  const weightValue = parseFloat(weight);
  const isValidWeight = !isNaN(weightValue) && weightValue > 0;

  return (
    <Modal title={`Configure ${category.name}`} onClose={onClose}>
      <div className="stack">
        <div>
          <label className="label">Display Type</label>
          <select
            className="input"
            value={displayType}
            onChange={(e) => setDisplayType(e.target.value as "sum" | "formula" | "weighted")}
          >
            <option value="sum">Simple Sum</option>
            <option value="weighted">Weighted</option>
            <option value="formula">Formula</option>
          </select>
          <small style={{ color: "#6b7280", marginTop: "4px", display: "block" }}>
            {displayType === "sum" &&
              "Category total is the sum of all entries in this category."}
            {displayType === "weighted" &&
              "Category total is multiplied by the weight value."}
            {displayType === "formula" &&
              "Category total is calculated using a custom formula."}
          </small>
        </div>

        {displayType === "weighted" && (
          <div>
            <label className="label">Weight</label>
            <input
              className="input"
              type="number"
              step="0.1"
              min="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="1.0"
            />
            <small style={{ color: "#6b7280", marginTop: "4px", display: "block" }}>
              Multiply category total by this value (e.g., 2.0 = double, 0.5 = half)
            </small>
            {!isValidWeight && (
              <p style={{ color: "#e11d48", marginTop: "4px", fontSize: "0.875rem" }}>
                Weight must be a positive number
              </p>
            )}
          </div>
        )}

        {displayType === "formula" && (
          <div>
            <label className="label">Formula</label>
            <FormulaEditor
              formula={formula}
              onChange={setFormula}
              categories={templateCategories.reduce((acc, cat) => {
                acc[cat.id] = { id: cat.id, name: cat.name, displayType: cat.displayType };
                return acc;
              }, {} as Record<string, { id: string; name: string; displayType: string }>)}
              categoryId={category.id}
              objects={template?.objectDefinitions || []}
            />
          </div>
        )}

        <div className="inline" style={{ justifyContent: "flex-end", marginTop: "8px" }}>
          <button className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button"
            onClick={handleSave}
            disabled={displayType === "weighted" && !isValidWeight}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CategoryConfigModal;
