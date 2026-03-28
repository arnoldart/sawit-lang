import { Expr, Stmt } from "./parser";

type FunctionValue = {
  type: "FUNCTION";
  name: string;
  params: string[];
  body: Stmt[];
  closure: Environment;
};

type Value = number | string | boolean | FunctionValue;

class Environment {
  private readonly values = new Map<string, Value>();

  constructor(private readonly parent?: Environment) {}

  define(name: string, value: Value) {
    this.values.set(name, value);
  }

  get(name: string): Value {
    if (this.values.has(name)) {
      return this.values.get(name)!;
    }

    if (this.parent) {
      return this.parent.get(name);
    }

    throw new Error(`Undefined variable: ${name}`);
  }

  assign(name: string, value: Value) {
    if (this.values.has(name)) {
      this.values.set(name, value);
      return;
    }

    if (this.parent) {
      this.parent.assign(name, value);
      return;
    }

    throw new Error(`Undefined variable: ${name}`);
  }
}

class ReturnSignal {
  constructor(readonly value: Value | undefined) {}
}

class BreakSignal {}

class ContinueSignal {}

function ensureNumber(value: Value, op: string): number {
  if (typeof value !== "number") {
    throw new Error(`Operator '${op}' only supports numbers`);
  }
  return value;
}

function ensureBoolean(value: Value, op: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Operator '${op}' only supports booleans`);
  }
  return value;
}

function ensureFunction(value: Value): FunctionValue {
  if (typeof value === "object" && value !== null && value.type === "FUNCTION") {
    return value;
  }

  throw new Error("Can only call functions");
}

function evalExpr(expr: Expr, env: Environment): Value {
  if (expr.type === "NUMBER") return expr.value;
  if (expr.type === "STRING") return expr.value;
  if (expr.type === "BOOLEAN") return expr.value;
  if (expr.type === "IDENT") return env.get(expr.name);

  if (expr.type === "UNARY") {
    const right = evalExpr(expr.right, env);

    if (expr.op === "-") {
      return -ensureNumber(right, "-");
    }

    if (expr.op === "!") {
      return !ensureBoolean(right, "!");
    }
  }

  if (expr.type === "BINARY") {
    const left = evalExpr(expr.left, env);
    const right = evalExpr(expr.right, env);

    if (expr.op === "==" || expr.op === "!=") {
      return expr.op === "==" ? left === right : left !== right;
    }

    if (expr.op === "&&") {
      return ensureBoolean(left, "&&") && ensureBoolean(right, "&&");
    }

    if (expr.op === "||") {
      return ensureBoolean(left, "||") || ensureBoolean(right, "||");
    }

    const leftNumber = ensureNumber(left, expr.op);
    const rightNumber = ensureNumber(right, expr.op);

    switch (expr.op) {
      case "+":
        return leftNumber + rightNumber;
      case "-":
        return leftNumber - rightNumber;
      case "*":
        return leftNumber * rightNumber;
      case "/":
        return leftNumber / rightNumber;
      case "<":
        return leftNumber < rightNumber;
      case ">":
        return leftNumber > rightNumber;
      case "<=":
        return leftNumber <= rightNumber;
      case ">=":
        return leftNumber >= rightNumber;
    }
  }

  if (expr.type === "CALL") {
    const callee = ensureFunction(evalExpr(expr.callee, env));
    const args = expr.args.map((arg) => evalExpr(arg, env));

    if (args.length !== callee.params.length) {
      throw new Error(`Function '${callee.name}' expects ${callee.params.length} argument(s), got ${args.length}`);
    }

    const callEnv = new Environment(callee.closure);

    for (let i = 0; i < callee.params.length; i += 1) {
      callEnv.define(callee.params[i], args[i]);
    }

    try {
      executeBlock(callee.body, callEnv);
      return false;
    } catch (signal) {
      if (signal instanceof ReturnSignal) {
        return signal.value ?? false;
      }

      throw signal;
    }
  }

  throw new Error("Unknown expression");
}

function executeBlock(stmts: Stmt[], env: Environment) {
  for (const stmt of stmts) {
    execute(stmt, env);
  }
}

function execute(stmt: Stmt, env: Environment) {
  if (stmt.type === "LET") {
    env.define(stmt.name, evalExpr(stmt.value, env));
    return;
  }

  if (stmt.type === "ASSIGN") {
    env.assign(stmt.name, evalExpr(stmt.value, env));
    return;
  }

  if (stmt.type === "FUNCTION") {
    env.define(stmt.name, {
      type: "FUNCTION",
      name: stmt.name,
      params: stmt.params,
      body: stmt.body,
      closure: env,
    });
    return;
  }

  if (stmt.type === "RETURN") {
    throw new ReturnSignal(stmt.value ? evalExpr(stmt.value, env) : undefined);
  }

  if (stmt.type === "BREAK") {
    throw new BreakSignal();
  }

  if (stmt.type === "CONTINUE") {
    throw new ContinueSignal();
  }

  if (stmt.type === "IF") {
    const condition = evalExpr(stmt.condition, env);

    if (typeof condition !== "boolean") {
      throw new Error("If condition must be boolean");
    }

    if (condition) {
      executeBlock(stmt.body, new Environment(env));
    } else if (stmt.elseBody) {
      executeBlock(stmt.elseBody, new Environment(env));
    }
    return;
  }

  if (stmt.type === "WHILE") {
    while (true) {
      const condition = evalExpr(stmt.condition, env);

      if (typeof condition !== "boolean") {
        throw new Error("While condition must be boolean");
      }

      if (!condition) {
        break;
      }

      try {
        executeBlock(stmt.body, new Environment(env));
      } catch (signal) {
        if (signal instanceof BreakSignal) {
          break;
        }
        if (signal instanceof ContinueSignal) {
          continue;
        }
        throw signal;
      }
    }
    return;
  }

  if (stmt.type === "FOR") {
    const loopEnv = new Environment(env);

    if (stmt.init) {
      execute(stmt.init, loopEnv);
    }

    while (true) {
      if (stmt.condition) {
        const condition = evalExpr(stmt.condition, loopEnv);

        if (typeof condition !== "boolean") {
          throw new Error("For condition must be boolean");
        }

        if (!condition) {
          break;
        }
      }

      try {
        executeBlock(stmt.body, new Environment(loopEnv));
      } catch (signal) {
        if (signal instanceof BreakSignal) {
          break;
        }
        if (!(signal instanceof ContinueSignal)) {
          throw signal;
        }
      }

      if (stmt.update) {
        execute(stmt.update, loopEnv);
      }
    }
    return;
  }

  if (stmt.type === "PRINT") {
    console.log(evalExpr(stmt.value, env));
  }
}

export function run(stmts: Stmt[]) {
  const globalEnv = new Environment();

  for (const stmt of stmts) {
    execute(stmt, globalEnv);
  }
}
