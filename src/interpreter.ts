import { compile } from "./compiler";
import { Stmt } from "./parser";
import { execute } from "./vm";

export function run(stmts: Stmt[]) {
  execute(compile(stmts));
}
