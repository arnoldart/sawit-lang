import { Stmt, Expr } from "./parser";

// ADDED: runtime value sekarang mendukung boolean
type Value = number | string | boolean;

const env: Record<string, Value> = {};

// ADDED: helper validasi angka
function ensureNumber(value: Value, op: string): number {
  if (typeof value !== "number") {
    throw new Error(`Operator '${op}' only supports numbers`);
  }
  return value;
}

// ADDED: helper validasi boolean
function ensureBoolean(value: Value, op: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Operator '${op}' only supports booleans`);
  }
  return value;
}

function evalExpr(expr: Expr): Value {
  if (expr.type === "NUMBER") return expr.value;
  if (expr.type === "STRING") return expr.value;

  // ADDED: evaluasi boolean literal
  if (expr.type === "BOOLEAN") return expr.value;

  if (expr.type === "IDENT") {
    // ADDED: error jika variabel belum didefinisikan
    if (!(expr.name in env)) {
      throw new Error(`Undefined variable: ${expr.name}`);
    }

    return env[expr.name];
  }

  // ADDED: evaluasi unary operator
  if (expr.type === "UNARY") {
    const right = evalExpr(expr.right);

    if (expr.op === "-") {
      return -ensureNumber(right, "-");
    }

    if (expr.op === "!") {
      return !ensureBoolean(right, "!");
    }
  }

  if (expr.type === "BINARY") {
    const left = evalExpr(expr.left);
    const right = evalExpr(expr.right);

    if (expr.op === "==" || expr.op === "!=") {
      return expr.op === "==" ? left === right : left !== right;
    }

    // ADDED: evaluasi logical operator
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

  throw new Error("Unknown expression");
}

function execute(stmt: Stmt) {
  if (stmt.type === "LET") {
    env[stmt.name] = evalExpr(stmt.value);
    return;
  }

  if (stmt.type === "IF") {
    const condition = evalExpr(stmt.condition);

    // ADDED: if harus boolean
    if (typeof condition !== "boolean") {
      throw new Error("If condition must be boolean");
    }

    if (condition) {
      for (const s of stmt.body) execute(s);
    } else if (stmt.elseBody) {
      for (const s of stmt.elseBody) execute(s);
    }
    return;
  }

  if (stmt.type === "PRINT") {
    console.log(evalExpr(stmt.value));
  }
}

export function run(stmts: Stmt[]) {
  for (const stmt of stmts) {
    execute(stmt);
  }
}
