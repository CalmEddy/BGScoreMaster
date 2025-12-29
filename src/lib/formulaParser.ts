type FormulaContext = {
  categories: Record<string, number>;
  total?: number;
  round?: number;
};

// Token types for parsing
type Token = {
  type: "number" | "object" | "operator" | "function" | "paren" | "comma";
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

    // Objects (category references like {categoryId})
    if (char === "{") {
      let varName = "";
      i++; // Skip {
      while (i < formula.length && formula[i] !== "}") {
        varName += formula[i];
        i++;
      }
      if (i < formula.length) i++; // Skip }
      tokens.push({ type: "object", value: varName });
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
    if (token.type === "number" || token.type === "object") {
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

type StackValue = number | { type: "object"; name: string; value?: number };

// Evaluate postfix expression
function evaluatePostfix(
  postfix: Token[],
  context: FormulaContext,
  getCategoryValue: (categoryId: string) => number,
  getGameObjectValue?: (objectName: string) => number | undefined,
  extendedContext?: ExtendedFormulaContext
): number {
  void context;
  const stack: StackValue[] = [];

  for (const token of postfix) {
    if (token.type === "number") {
      stack.push(parseFloat(token.value));
    } else if (token.type === "object") {
      // For special functions, we might need the object name, not just the value
      // Store as object to preserve name for special functions
      stack.push({ type: "object", name: token.value, value: undefined });
    } else if (token.type === "operator") {
      if (stack.length < 2) {
        throw new Error(`Not enough operands for operator ${token.value}`);
      }
      const b = stack.pop()!;
      const a = stack.pop()!;
      
      // Resolve objects to numbers for operators
      const aNum = typeof a === "object" && a.type === "object"
        ? (getGameObjectValue?.(a.name) ?? getCategoryValue(a.name))
        : (typeof a === "number" ? a : 0);
      const bNum = typeof b === "object" && b.type === "object"
        ? (getGameObjectValue?.(b.name) ?? getCategoryValue(b.name))
        : (typeof b === "number" ? b : 0);

      switch (token.value) {
        case "+":
          stack.push(aNum + bNum);
          break;
        case "-":
          stack.push(aNum - bNum);
          break;
        case "*":
          stack.push(aNum * bNum);
          break;
        case "/":
          if (bNum === 0) throw new Error("Division by zero");
          stack.push(aNum / bNum);
          break;
        case "^":
          stack.push(Math.pow(aNum, bNum));
          break;
        default:
          throw new Error(`Unknown operator: ${token.value}`);
      }
    } else if (token.type === "function") {
      const funcName = token.value.toLowerCase();
      
      // Handle special functions
      if (funcName === "state" && extendedContext?.getObjectState) {
        if (stack.length === 0) {
          throw new Error("state() requires one argument");
        }
        const arg = stack.pop()!;
        let varName: string;
        if (typeof arg === "object" && arg.type === "object") {
          varName = arg.name;
        } else if (typeof arg === "number") {
          // If it's already a number, we can't get the object name
          throw new Error("state() requires an object reference as argument");
        } else {
          varName = String(arg);
        }
        const stateStr = extendedContext.getObjectState(varName);
        // Convert state string to number for comparison
        // Return numeric representation: inactive=0, active=1, owned=2, discarded=-1
        let stateValue = 0;
        if (stateStr === "active") stateValue = 1;
        else if (stateStr === "owned") stateValue = 2;
        else if (stateStr === "discarded") stateValue = -1;
        stack.push(stateValue);
      } else if (funcName === "owns" && extendedContext?.ownsObject) {
        if (stack.length < 1) {
          throw new Error("owns() requires at least one argument");
        }
        const secondArg = stack.length > 1 ? stack.pop()! : undefined;
        const firstArg = stack.pop()!;
        
        let varName: string;
        let playerId: string | undefined;
        
        if (secondArg !== undefined) {
          // Two arguments: owns(object, playerId)
          if (typeof firstArg === "object" && firstArg.type === "object") {
            varName = firstArg.name;
          } else {
            varName = String(firstArg);
          }
          playerId = typeof secondArg === "number" ? String(secondArg) : String(secondArg);
        } else {
          // One argument: owns(object) - uses current player context
          if (typeof firstArg === "object" && firstArg.type === "object") {
            varName = firstArg.name;
          } else {
            varName = String(firstArg);
          }
        }
        
        const owns = extendedContext.ownsObject(varName, playerId);
        stack.push(owns ? 1 : 0);
      } else if (funcName === "round" && extendedContext?.getRoundIndex) {
        const roundIndex = extendedContext.getRoundIndex();
        stack.push(roundIndex);
      } else if (funcName === "phase" && extendedContext?.getPhaseId) {
        const phaseId = extendedContext.getPhaseId();
        // Convert phase ID to number (0 if undefined)
        stack.push(phaseId ? 1 : 0);
      } else if (funcName === "if") {
        // Ternary operator: if(condition, trueValue, falseValue)
        if (stack.length < 3) {
          throw new Error("if() requires three arguments: condition, trueValue, falseValue");
        }
        const falseValue = Number(stack.pop()!);
        const trueValue = Number(stack.pop()!);
        const condition = Number(stack.pop()!);
        stack.push(condition ? trueValue : falseValue);
      } else {
        // Standard math functions - resolve object references first
        const func = mathFunctions[funcName];
        if (!func) {
          throw new Error(`Unknown function: ${token.value}`);
        }

        // Collect and resolve arguments
        const args: number[] = [];
        const tempStack: StackValue[] = [];
        
        // Pop arguments, resolving objects
        while (stack.length > 0) {
          const arg = stack.pop()!;
          if (typeof arg === "object" && arg.type === "object") {
            // Resolve object to its value
            let value: number | undefined;
            if (getGameObjectValue) {
              value = getGameObjectValue(arg.name);
            }
            if (value === undefined) {
              value = getCategoryValue(arg.name);
            }
            tempStack.push(value);
          } else {
            tempStack.push(arg);
          }
        }
        
        // Put resolved values back
        while (tempStack.length > 0) {
          stack.push(tempStack.pop()!);
        }
        
        // Now collect numeric arguments
        while (stack.length > 0) {
          const arg = stack.pop()!;
          if (typeof arg === "number") {
            args.unshift(arg);
          } else if (typeof arg === "object" && arg.type === "object") {
            // Should have been resolved above, but handle it
            let value: number | undefined;
            if (getGameObjectValue) {
              value = getGameObjectValue(arg.name);
            }
            if (value === undefined) {
              value = getCategoryValue(arg.name);
            }
            args.unshift(value);
          } else {
            // Put it back and stop
            stack.push(arg);
            break;
          }
        }

        // If no args, try to get at least one
        if (args.length === 0 && stack.length > 0) {
          const arg = stack.pop()!;
          if (typeof arg === "number") {
            args.push(arg);
          } else if (typeof arg === "object" && arg.type === "object") {
            let value: number | undefined;
            if (getGameObjectValue) {
              value = getGameObjectValue(arg.name);
            }
            if (value === undefined) {
              value = getCategoryValue(arg.name);
            }
            args.push(value);
          } else {
            stack.push(arg);
          }
        }

        if (args.length === 0) {
          throw new Error(`Function ${token.value} requires at least one argument`);
        }

        const result = func(...args);
        stack.push(result);
      }
    }
  }

  if (stack.length !== 1) {
    throw new Error("Invalid expression");
  }

  const result = stack[0];
  if (typeof result === "number") {
    return result;
  }
  if (typeof result === "object" && result.type === "object") {
    // Resolve object that wasn't used in any operation
    const value = getGameObjectValue?.(result.name) ?? getCategoryValue(result.name);
    return value;
  }
  return 0;
}

// Extended context for formula evaluation with special functions
export type ExtendedFormulaContext = FormulaContext & {
  getObjectState?: (objectName: string) => string;
  ownsObject?: (objectName: string, playerId?: string) => boolean;
  getRoundIndex?: () => number;
  getPhaseId?: () => string | undefined;
};

// Main formula evaluation function
export function evaluateFormula(
  formula: string,
  context: FormulaContext,
  getCategoryValue: (categoryId: string) => number,
  getGameObjectValue?: (objectName: string) => number | undefined,
  extendedContext?: ExtendedFormulaContext
): number {
  if (!formula || !formula.trim()) {
    throw new Error("Empty formula");
  }

  try {
    const tokens = tokenize(formula.trim());
    if (tokens.length === 0) {
      throw new Error("No tokens found");
    }

    // Handle unary minus and unary plus
    const processedTokens: Token[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === "operator") {
        const prev = i > 0 ? tokens[i - 1] : null;
        const isUnary = !prev || (prev.type !== "number" && prev.type !== "object" && prev.value !== ")");
        
        if (token.value === "-" && isUnary) {
          // Unary minus - convert to (0 - ...)
          processedTokens.push({ type: "number", value: "0" });
          processedTokens.push({ type: "operator", value: "-" });
          continue;
        } else if (token.value === "+" && isUnary) {
          // Unary plus - just skip it (since +value = value)
          continue;
        }
      }
      processedTokens.push(token);
    }

    const postfix = toPostfix(processedTokens);
    return evaluatePostfix(postfix, context, getCategoryValue, getGameObjectValue, extendedContext);
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

    // Check for valid object syntax
    for (const token of tokens) {
      if (token.type === "object" && !token.value) {
        return { valid: false, error: "Empty object reference" };
      }
      const funcName = token.value.toLowerCase();
      const isSpecialFunction = ["state", "owns", "round", "phase", "if"].includes(funcName);
      if (token.type === "function" && !mathFunctions[funcName] && !isSpecialFunction) {
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
export function getFormulaObjects(formula: string): string[] {
  const objects: Set<string> = new Set();
  try {
    const tokens = tokenize(formula.trim());
    for (const token of tokens) {
      if (token.type === "object") {
        objects.add(token.value);
      }
    }
  } catch {
    // Ignore parsing errors for object extraction
  }
  return Array.from(objects);
}
