import { useState } from "react";
import Modal from "./Modal";
import { CategoryTemplate, VariableDefinition } from "../state/types";
import FormulaEditor from "./FormulaEditor";

type CategoryTemplateEditorProps = {
  category: CategoryTemplate;
  allCategories: CategoryTemplate[];
  variables?: VariableDefinition[];
  onSave: (category: CategoryTemplate) => void;
  onCancel: () => void;
};

const CategoryTemplateEditor: React.FC<CategoryTemplateEditorProps> = ({
  category,
  allCategories,
  variables,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description || "");
  const [displayType, setDisplayType] = useState<"sum" | "formula" | "weighted">(
    category.displayType || "sum"
  );
  const [weight, setWeight] = useState((category.defaultWeight || 1).toString());
  const [formula, setFormula] = useState(category.defaultFormula || "");
  const [parentId, setParentId] = useState(category.parentId || "");
  const [required, setRequired] = useState(category.required);
  const [icon, setIcon] = useState(category.icon || "");

  const availableParents = allCategories.filter((c) => c.id !== category.id);

  const handleSave = () => {
    if (!name.trim()) {
      alert("Please enter a category name");
      return;
    }

    const updatedCategory: CategoryTemplate = {
      ...category,
      name: name.trim(),
      description: description.trim() || undefined,
      displayType,
      defaultWeight: displayType === "weighted" ? parseFloat(weight) || 1 : undefined,
      defaultFormula: displayType === "formula" ? formula.trim() || undefined : undefined,
      parentId: parentId || undefined,
      required,
      icon: icon.trim() || undefined,
    };

    onSave(updatedCategory);
  };

  return (
    <Modal title="Edit Category Template" onClose={onCancel}>
      <div className="stack">
        <div>
          <label className="label">Category Name *</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Victory Points"
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
        <div>
          <label className="label">Icon (emoji)</label>
          <input
            className="input"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="⭐ (optional)"
            maxLength={2}
          />
        </div>
        <div>
          <label className="label">Parent Category</label>
          <select
            className="input"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
          >
            <option value="">None (Top Level)</option>
            {availableParents.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Display Type</label>
          <select
            className="input"
            value={displayType}
            onChange={(e) => setDisplayType(e.target.value as "sum" | "formula" | "weighted")}
          >
            <option value="sum">Sum of Entries</option>
            <option value="weighted">Weighted Sum</option>
            <option value="formula">Formula</option>
          </select>
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
            />
          </div>
        )}
        {displayType === "formula" && (
          <div>
            <label className="label">Formula</label>
            <FormulaEditor
              formula={formula}
              onChange={setFormula}
              categories={allCategories.reduce((acc, cat) => {
                // Convert CategoryTemplate to Category-like object for FormulaEditor
                acc[cat.id] = {
                  id: cat.id,
                  sessionId: "",
                  name: cat.name,
                  sortOrder: cat.sortOrder,
                  displayType: cat.displayType,
                } as any;
                return acc;
              }, {} as Record<string, any>)}
              categoryId={category.id}
              variables={variables}
            />
          </div>
        )}
        <label className="inline">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} />
          Required (must be included when template is used)
        </label>
        <div className="inline" style={{ justifyContent: "flex-end", marginTop: "16px" }}>
          <button className="button secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="button" onClick={handleSave}>
            Save Category
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default CategoryTemplateEditor;

