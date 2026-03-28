import { Stmt, Expr } from "./parser";

type Value = number | string;

const env: Record<string, Value> = {};

function evalExpr(expr: Expr): Value {
    if (expr.type === "NUMBER") return expr.value;
    if (expr.type === "STRING") return expr.value;
    if (expr.type === "IDENT") return env[expr.name] ?? 0;
    if (expr.type === "BINARY") {
        const left = evalExpr(expr.left);
        const right = evalExpr(expr.right);

        if (expr.op === "==" || expr.op === "!=") {
            return expr.op === "==" ? (left === right ? 1 : 0) : (left !== right ? 1 : 0);
        }

        if (typeof left !== "number" || typeof right !== "number") {
            throw new Error(`Operator '${expr.op}' only supports numbers`);
        }

        switch (expr.op) {
            case "+": return left + right;
            case "-": return left - right;
            case "*": return left * right;
            case "/": return left / right;

            case "<": return left < right ? 1 : 0;
            case ">": return left > right ? 1 : 0;
            case "<=": return left <= right ? 1 : 0;
            case ">=": return left >= right ? 1 : 0;
        }
    }

    return 0;
}

function execute(stmt: Stmt) {
    if (stmt.type === "LET") {
        env[stmt.name] = evalExpr(stmt.value);
        return;
    }

    if (stmt.type === "IF") {
        if (evalExpr(stmt.condition)) {
            for (const s of stmt.body) {
                execute(s);
            }
        } else if (stmt.elseBody) {
            for (const s of stmt.elseBody) {
                execute(s);
            }
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
