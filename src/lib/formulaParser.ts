import { AppState } from "../state/types";

type FormulaContext = {
  categories: Record<string, number>;
  total?: number;
  round?: number;
};

// Token types for parsing
type Token = {
  type: "number" | "variable" | "operator" | "function" | "paren" | "comma";
  value: string;
};

// Safe math functions
const mathFunctions: Record<string, (...args: number[]) => number> = {
  max: (...args) => Math.max(...args),
  min: (...args) => Math.min(...args),
  sum: (...args) => args.reduce((a, b) => a + b, 0),
  avg: (...args) => {
    if (args.length === 0) return 0;
    return args.reduce((a, b) => a + b, 0) / args.length;
  },
  round: (value, decimals = 0) => Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals),
  abs: (value) => Math.abs(value),
  floor: (value) => Math.floor(value),
  ceil: (value) => Math.ceil(value),
};

// Tokenize formula string
function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < formula.length) {
    const char = formula[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Numbers
    if (/[0-9.]/.test(char)) {
      let num = "";
      while (i < formula.length && /[0-9.]/.test(formula[i])) {
        num += formula[i];
        i++;
      }
      tokens.push({ type: "number", value: num });
      continue;
    }

    // Variables (category references like {categoryId})
    if (char === "{") {
      let varName = "";
      i++; // Skip {
      while (i < formula.length && formula[i] !== "}") {
        varName += formula[i];
        i++;
      }
      if (i < formula.length) i++; // Skip }
      tokens.push({ type: "variable", value: varName });
      continue;
    }

    // Operators
    if (["+", "-", "*", "/", "^"].includes(char)) {
      tokens.push({ type: "operator", value: char });
      i++;
      continue;
    }

    // Parentheses
    if (char === "(" || char === ")") {
      tokens.push({ type: "paren", value: char });
      i++;
      continue;
    }

    // Commas
    if (char === ",") {
      tokens.push({ type: "comma", value: char });
      i++;
      continue;
    }

    // Functions (letters)
    if (/[a-zA-Z]/.test(char)) {
      let funcName = "";
      while (i < formula.length && /[a-zA-Z0-9_]/.test(formula[i])) {
        funcName += formula[i];
        i++;
      }
      tokens.push({ type: "function", value: funcName });
      continue;
    }

    // Unknown character
    throw new Error(`Unexpected character: ${char}`);
  }

  return tokens;
}

// Convert infix to postfix (RPN) using Shunting Yard algorithm
function toPostfix(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const operators: Token[] = [];

  const precedence: Record<string, number> = {
    "+": 1,
    "-": 1,
    "*": 2,
    "/": 2,
    "^": 3,
  };

  for (const token of tokens) {
    if (token.type === "number" || token.type === "variable") {
      output.push(token);
    } else if (token.type === "function") {
      operators.push(token);
    } else if (token.type === "operator") {
      while (
        operators.length > 0 &&
        operators[operators.length - 1].type === "operator" &&
        precedence[operators[operators.length - 1].value] >= precedence[token.value]
      ) {
        output.push(operators.pop()!);
      }
      operators.push(token);
    } else if (token.type === "paren" && token.value === "(") {
      operators.push(token);
    } else if (token.type === "paren" && token.value === ")") {
      while (operators.length > 0 && operators[operators.length - 1].value !== "(") {
        output.push(operators.pop()!);
      }
      operators.pop(); // Remove (
      if (operators.length > 0 && operators[operators.length - 1].type === "function") {
        output.push(operators.pop()!);
      }
    } else if (token.type === "comma") {
      while (operators.length > 0 && operators[operators.length - 1].value !== "(") {
        output.push(operators.pop()!);
      }
    }
  }

  while (operators.length > 0) {
    output.push(operators.pop()!);
  }

  return output;
}

// Evaluate postfix expression
function evaluatePostfix(
  postfix: Token[],
  context: FormulaContext,
  getCategoryValue: (categoryId: string) => number,
  getVariableValue?: (variableName: string) => number | undefined
): number {
  const stack: number[] = [];

  for (const token of postfix) {
    if (token.type === "number") {
      stack.push(parseFloat(token.value));
    } else if (token.type === "variable") {
      // Try variable first, then category
      let value: number | undefined;
      if (getVariableValue) {
        value = getVariableValue(token.value);
      }
      if (value === undefined) {
        value = getCategoryValue(token.value);
      }
      stack.push(value);
    } else if (token.type === "operator") {
      if (stack.length < 2) {
        throw new Error(`Not enough operands for operator ${token.value}`);
      }
      const b = stack.pop()!;
      const a = stack.pop()!;

      switch (token.value) {
        case "+":
          stack.push(a + b);
          break;
        case "-":
          stack.push(a - b);
          break;
        case "*":
          stack.push(a * b);
          break;
        case "/":
          if (b === 0) throw new Error("Division by zero");
          stack.push(a / b);
          break;
        case "^":
          stack.push(Math.pow(a, b));
          break;
        default:
          throw new Error(`Unknown operator: ${token.value}`);
      }
    } else if (token.type === "function") {
      const func = mathFunctions[token.value.toLowerCase()];
      if (!func) {
        throw new Error(`Unknown function: ${token.value}`);
      }

      // For now, functions take all available values on stack as arguments
      // This works for functions like max(a, b) when parsed correctly
      // In a full implementation, we'd track function argument counts
      const args: number[] = [];
      while (stack.length > 0) {
        args.unshift(stack.pop()!);
      }

      // If no args, try to get at least one
      if (args.length === 0 && stack.length > 0) {
        args.push(stack.pop()!);
      }

      if (args.length === 0) {
        throw new Error(`Function ${token.value} requires at least one argument`);
      }

      const result = func(...args);
      stack.push(result);
    }
  }

  if (stack.length !== 1) {
    throw new Error("Invalid expression");
  }

  return stack[0];
}

// Main formula evaluation function
export function evaluateFormula(
  formula: string,
  context: FormulaContext,
  getCategoryValue: (categoryId: string) => number,
  getVariableValue?: (variableName: string) => number | undefined
): number {
  if (!formula || !formula.trim()) {
    throw new Error("Empty formula");
  }

  try {
    const tokens = tokenize(formula.trim());
    if (tokens.length === 0) {
      throw new Error("No tokens found");
    }

    // Handle unary minus
    const processedTokens: Token[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === "operator" && token.value === "-") {
        const prev = i > 0 ? tokens[i - 1] : null;
        if (!prev || (prev.type !== "number" && prev.type !== "variable" && prev.value !== ")")) {
          // Unary minus - convert to (0 - ...)
          processedTokens.push({ type: "number", value: "0" });
          processedTokens.push({ type: "operator", value: "-" });
          continue;
        }
      }
      processedTokens.push(token);
    }

    const postfix = toPostfix(processedTokens);
    return evaluatePostfix(postfix, context, getCategoryValue, getVariableValue);
  } catch (error) {
    throw new Error(`Formula error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Validate formula syntax
export function validateFormula(formula: string): { valid: boolean; error?: string } {
  if (!formula || !formula.trim()) {
    return { valid: false, error: "Formula cannot be empty" };
  }

  try {
    // Try to tokenize
    const tokens = tokenize(formula.trim());
    if (tokens.length === 0) {
      return { valid: false, error: "No valid tokens found" };
    }

    // Check for balanced parentheses
    let parenCount = 0;
    for (const token of tokens) {
      if (token.type === "paren") {
        if (token.value === "(") parenCount++;
        else parenCount--;
        if (parenCount < 0) {
          return { valid: false, error: "Unmatched closing parenthesis" };
        }
      }
    }
    if (parenCount !== 0) {
      return { valid: false, error: "Unmatched opening parenthesis" };
    }

    // Check for valid variable syntax
    for (const token of tokens) {
      if (token.type === "variable" && !token.value) {
        return { valid: false, error: "Empty variable reference" };
      }
      if (token.type === "function" && !mathFunctions[token.value.toLowerCase()]) {
        return { valid: false, error: `Unknown function: ${token.value}` };
      }
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid formula syntax",
    };
  }
}

// Get list of category IDs referenced in formula
export function getFormulaVariables(formula: string): string[] {
  const variables: Set<string> = new Set();
  try {
    const tokens = tokenize(formula.trim());
    for (const token of tokens) {
      if (token.type === "variable") {
        variables.add(token.value);
      }
    }
  } catch {
    // Ignore parsing errors for variable extraction
  }
  return Array.from(variables);
}

