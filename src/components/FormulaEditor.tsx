import { useState, useEffect } from "react";
import { validateFormula, getFormulaVariables } from "../lib/formulaParser";
import { Category, VariableDefinition } from "../state/types";

const FormulaEditor = ({
  formula,
  onChange,
  categories,
  categoryId,
  variables,
}: {
  formula: string;
  onChange: (formula: string) => void;
  categories: Record<string, Category>;
  categoryId?: string; // Current category ID to exclude from suggestions
  variables?: VariableDefinition[]; // Template variables
}) => {
  const [value, setValue] = useState(formula);
  const [validation, setValidation] = useState<{ valid: boolean; error?: string }>({
    valid: true,
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);

  useEffect(() => {
    setValue(formula);
  }, [formula]);

  useEffect(() => {
    const result = validateFormula(value);
    setValidation(result);
    if (result.valid) {
      onChange(value);
    }
  }, [value, onChange]);

  const availableCategories = Object.values(categories).filter(
    (cat) => cat.id !== categoryId
  );

  const availableVariables = variables || [];

  const suggestions = [
    ...availableCategories.map((cat) => `{${cat.name}}`),
    ...availableVariables.map((v) => `{${v.name}}`),
    ...["max(", "min(", "sum(", "avg(", "round(", "abs(", "floor(", "ceil("],
    ...["+", "-", "*", "/", "(", ")"],
  ];

  const handleInput = (newValue: string) => {
    setValue(newValue);
    setShowSuggestions(false);
  };

  const insertSuggestion = (suggestion: string) => {
    const activeElement = document.activeElement;
    const cursorPos = (activeElement instanceof HTMLTextAreaElement) ? activeElement.selectionStart || value.length : value.length;
    const before = value.slice(0, cursorPos);
    const after = value.slice(cursorPos);
    const newValue = before + suggestion + after;
    handleInput(newValue);
    // Set cursor position after inserted text
    setTimeout(() => {
      const textarea = document.activeElement;
      if (textarea instanceof HTMLTextAreaElement && typeof textarea.setSelectionRange === 'function') {
        const newPos = cursorPos + suggestion.length;
        textarea.setSelectionRange(newPos, newPos);
        textarea.focus();
      }
    }, 0);
  };

  const formulaVars = getFormulaVariables(value);
  const referencedCategories = formulaVars
    .map((nameOrId) => {
      // Try to find by name first (user-friendly), then by ID (backward compatibility)
      return Object.values(categories).find(
        (cat) => cat.name.toLowerCase() === nameOrId.toLowerCase() || cat.id === nameOrId
      );
    })
    .filter(Boolean) as Category[];
  
  const referencedVariables = formulaVars
    .map((name) => availableVariables.find((v) => v.name.toLowerCase() === name.toLowerCase() || v.id === name))
    .filter(Boolean) as VariableDefinition[];

  return (
    <div className="formula-editor">
      <textarea
        className="input"
        rows={4}
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => {
          // Delay to allow clicking suggestions
          setTimeout(() => setShowSuggestions(false), 200);
        }}
        placeholder='e.g., {victoryPoints} + {bonusPoints} * 2'
        style={{
          fontFamily: "monospace",
          fontSize: "0.9rem",
          borderColor: validation.valid ? undefined : "#e11d48",
        }}
      />
      {!validation.valid && (
        <p style={{ color: "#e11d48", fontSize: "0.875rem", marginTop: "4px" }}>
          {validation.error}
        </p>
      )}
      {validation.valid && value && (
        <div style={{ marginTop: "8px", fontSize: "0.875rem", color: "#16a34a" }}>
          ✓ Formula is valid
        </div>
      )}

      {showSuggestions && (
        <div className="formula-suggestions">
          <div className="formula-suggestions-header">Quick insert:</div>
          <div className="formula-suggestions-list">
            {suggestions.slice(0, 10).map((suggestion, index) => (
              <button
                key={index}
                className="formula-suggestion"
                onClick={() => insertSuggestion(suggestion)}
                onMouseEnter={() => setSuggestionIndex(index)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {(referencedCategories.length > 0 || referencedVariables.length > 0) && (
        <div style={{ marginTop: "12px", fontSize: "0.875rem" }}>
          {referencedCategories.length > 0 && (
            <div>
              <strong>Referenced categories:</strong>
              <ul style={{ margin: "4px 0", paddingLeft: "20px" }}>
                {referencedCategories.map((cat) => (
                  <li key={cat.id}>{cat.name}</li>
                ))}
              </ul>
            </div>
          )}
          {referencedVariables.length > 0 && (
            <div style={{ marginTop: "8px" }}>
              <strong>Referenced variables:</strong>
              <ul style={{ margin: "4px 0", paddingLeft: "20px" }}>
                {referencedVariables.map((v) => (
                  <li key={v.id}>
                    {v.icon && <span style={{ marginRight: "4px" }}>{v.icon}</span>}
                    {v.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: "12px", fontSize: "0.875rem", color: "#6b7280" }}>
        <strong>Available functions:</strong> max(), min(), sum(), avg(), round(), abs(), floor(), ceil()
        <br />
        <strong>Special functions:</strong> state({`{variableName}`}), owns({`{variableName}`}, playerId?), round(), phase(), if(condition, trueValue, falseValue)
        <br />
        <strong>Operators:</strong> +, -, *, /, ^ (power)
        <br />
        <strong>Variables:</strong> Use <code>{`{categoryName}`}</code> for categories or <code>{`{variableName}`}</code> for template variables
        {availableVariables.length > 0 && (
          <>
            <br />
            <strong>Available variables:</strong> {availableVariables.map((v) => v.name).join(", ")}
          </>
        )}
      </div>
    </div>
  );
};

export default FormulaEditor;

