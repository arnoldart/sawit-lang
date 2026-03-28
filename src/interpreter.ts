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

            case "==": return left === right ? 1 : 0;
            case "!=": return left !== right ? 1 : 0;
        }
    }

    return 0;
}

export function run(stmts: Stmt[]) {
    for (const stmt of stmts) {
        if (stmt.type === "LET") {
            env[stmt.name] = evalExpr(stmt.value);
        }

        if (stmt.type === "IF") {
            if (evalExpr(stmt.condition)) {
                for (const s of stmt.body) {
                    if (s.type === "PRINT") {
                        console.log(evalExpr(s.value));
                    }
                }
            } else if (stmt.elseBody) {
                for (const s of stmt.elseBody) {
                    if (s.type === "PRINT") {
                        console.log(evalExpr(s.value));
                    }
                }
            }
        }

        if (stmt.type === "PRINT") {
            console.log(evalExpr(stmt.value));
        }
    }
}
