import { Expr, Stmt } from "./parser";

export type FunctionChunk = {
  readonly name: string;
  readonly params: readonly string[];
  readonly code: readonly Instruction[];
  readonly constants: readonly Constant[];
  readonly localCount: number;
};

export type Constant = number | string | boolean | FunctionChunk;

export type Instruction =
  | { op: "PUSH_CONST"; index: number }
  | { op: "GET_LOCAL"; slot: number }
  | { op: "DEFINE_LOCAL"; slot: number; name: string }
  | { op: "ASSIGN_LOCAL"; slot: number; name: string }
  | { op: "GET_VAR"; name: string }
  | { op: "DEFINE_VAR"; name: string }
  | { op: "ASSIGN_VAR"; name: string }
  | { op: "NEGATE" }
  | { op: "NOT" }
  | { op: "DUP" }
  | { op: "ADD" }
  | { op: "SUB" }
  | { op: "MUL" }
  | { op: "DIV" }
  | { op: "LT" }
  | { op: "GT" }
  | { op: "LTE" }
  | { op: "GTE" }
  | { op: "EQ" }
  | { op: "NEQ" }
  | { op: "JUMP"; target: number }
  | { op: "JUMP_IF_FALSE"; target: number }
  | { op: "POP" }
  | { op: "PUSH_SCOPE" }
  | { op: "POP_SCOPE" }
  | { op: "CALL"; argCount: number }
  | { op: "PRINT" }
  | { op: "RETURN" };

export type Program = {
  readonly code: readonly Instruction[];
  readonly constants: readonly Constant[];
  readonly localCount: number;
};

type LoopContext = {
  readonly continueTarget: number;
  readonly breakJumps: number[];
  readonly continueJumps: number[];
  readonly scopeDepth: number;
};

class Compiler {
  private readonly constants: Constant[] = [];
  private readonly code: Instruction[] = [];
  private readonly loops: LoopContext[] = [];
  private readonly localScopes: Map<string, number>[] = [new Map()];
  private scopeDepth = 0;
  private nextSlot = 0;

  constructor(params: readonly string[] = []) {
    for (const param of params) {
      this.declareLocal(param);
    }
  }

  compileProgram(statements: readonly Stmt[]): Program {
    for (const statement of statements) {
      this.compileStatement(statement);
    }

    this.emit({ op: "RETURN" });

    return {
      code: this.code,
      constants: this.constants,
      localCount: this.nextSlot,
    };
  }

  private compileBlock(statements: readonly Stmt[]) {
    this.beginScope();
    this.emit({ op: "PUSH_SCOPE" });
    this.scopeDepth += 1;

    for (const statement of statements) {
      this.compileStatement(statement);
    }

    this.emit({ op: "POP_SCOPE" });
    this.scopeDepth -= 1;
    this.endScope();
  }

  private compileStatement(statement: Stmt) {
    switch (statement.type) {
      case "LET":
        this.compileExpr(statement.value);
        if (this.isInsideFunctionBody()) {
          const slot = this.declareLocal(statement.name);
          this.emit({ op: "DEFINE_LOCAL", slot, name: statement.name });
        } else {
          this.emit({ op: "DEFINE_VAR", name: statement.name });
        }
        return;
      case "ASSIGN":
        this.compileExpr(statement.value);
        this.emitAssignment(statement.name);
        return;
      case "FUNCTION": {
        const chunkCompiler = new Compiler(statement.params);
        const functionProgram = chunkCompiler.compileProgram(statement.body);
        const functionChunk: FunctionChunk = {
          name: statement.name,
          params: statement.params,
          code: functionProgram.code,
          constants: functionProgram.constants,
          localCount: functionProgram.localCount,
        };

        this.emitConstant(functionChunk);
        if (this.isInsideFunctionBody()) {
          const slot = this.declareLocal(statement.name);
          this.emit({ op: "DEFINE_LOCAL", slot, name: statement.name });
        } else {
          this.emit({ op: "DEFINE_VAR", name: statement.name });
        }
        return;
      }
      case "RETURN":
        if (statement.value) {
          this.compileExpr(statement.value);
        } else {
          this.emitConstant(false);
        }
        this.emitScopeUnwind(0);
        this.emit({ op: "RETURN" });
        return;
      case "BREAK": {
        const loop = this.currentLoop();
        this.emitScopeUnwind(loop.scopeDepth);
        loop.breakJumps.push(this.emitJump("JUMP"));
        return;
      }
      case "CONTINUE": {
        const loop = this.currentLoop();
        this.emitScopeUnwind(loop.scopeDepth);
        loop.continueJumps.push(this.emitJump("JUMP"));
        return;
      }
      case "IF": {
        this.compileExpr(statement.condition);
        const elseJump = this.emitJump("JUMP_IF_FALSE");
        this.compileBlock(statement.body);

        if (statement.elseBody) {
          const endJump = this.emitJump("JUMP");
          this.patchJump(elseJump, this.code.length);
          this.compileBlock(statement.elseBody);
          this.patchJump(endJump, this.code.length);
          return;
        }

        this.patchJump(elseJump, this.code.length);
        return;
      }
      case "WHILE": {
        const conditionStart = this.code.length;
        this.compileExpr(statement.condition);
        const exitJump = this.emitJump("JUMP_IF_FALSE");
        const loop: LoopContext = {
          continueTarget: conditionStart,
          breakJumps: [],
          continueJumps: [],
          scopeDepth: this.scopeDepth,
        };

        this.loops.push(loop);
        this.compileBlock(statement.body);
        this.emit({ op: "JUMP", target: conditionStart });
        this.patchJump(exitJump, this.code.length);
        this.patchLoopJumps(loop, this.code.length);
        this.loops.pop();
        return;
      }
      case "FOR": {
        this.beginScope();
        this.emit({ op: "PUSH_SCOPE" });
        this.scopeDepth += 1;

        if (statement.init) {
          this.compileStatement(statement.init);
        }

        const conditionStart = this.code.length;
        let exitJump: number | undefined;

        if (statement.condition) {
          this.compileExpr(statement.condition);
          exitJump = this.emitJump("JUMP_IF_FALSE");
        }

        const updateStartPlaceholder = -1;
        const loop: LoopContext = {
          continueTarget: updateStartPlaceholder,
          breakJumps: [],
          continueJumps: [],
          scopeDepth: this.scopeDepth,
        };

        this.loops.push(loop);
        this.compileBlock(statement.body);
        const updateStart = this.code.length;
        (loop as { continueTarget: number }).continueTarget = updateStart;

        if (statement.update) {
          this.compileStatement(statement.update);
        }

        this.emit({ op: "JUMP", target: conditionStart });

        const loopEnd = this.code.length;
        if (exitJump !== undefined) {
          this.patchJump(exitJump, loopEnd);
        }

        this.patchLoopJumps(loop, loopEnd);
        this.loops.pop();
        this.emit({ op: "POP_SCOPE" });
        this.scopeDepth -= 1;
        this.endScope();
        return;
      }
      case "PRINT":
        this.compileExpr(statement.value);
        this.emit({ op: "PRINT" });
        return;
    }
  }

  private compileExpr(expr: Expr) {
    switch (expr.type) {
      case "NUMBER":
      case "STRING":
      case "BOOLEAN":
        this.emitConstant(expr.value);
        return;
      case "IDENT":
        this.emitVariableRead(expr.name);
        return;
      case "UNARY":
        this.compileExpr(expr.right);
        this.emit({ op: expr.op === "-" ? "NEGATE" : "NOT" });
        return;
      case "CALL":
        this.compileExpr(expr.callee);
        for (const arg of expr.args) {
          this.compileExpr(arg);
        }
        this.emit({ op: "CALL", argCount: expr.args.length });
        return;
      case "BINARY":
        if (expr.op === "&&") {
          this.compileExpr(expr.left);
          this.emit({ op: "DUP" });
          const endJump = this.emitJump("JUMP_IF_FALSE");
          this.emit({ op: "POP" });
          this.compileExpr(expr.right);
          this.patchJump(endJump, this.code.length);
          return;
        }

        if (expr.op === "||") {
          this.compileExpr(expr.left);
          this.emit({ op: "DUP" });
          const falseJump = this.emitJump("JUMP_IF_FALSE");
          const endJump = this.emitJump("JUMP");
          this.patchJump(falseJump, this.code.length);
          this.emit({ op: "POP" });
          this.compileExpr(expr.right);
          this.patchJump(endJump, this.code.length);
          return;
        }

        this.compileExpr(expr.left);
        this.compileExpr(expr.right);

        switch (expr.op) {
          case "+":
            this.emit({ op: "ADD" });
            return;
          case "-":
            this.emit({ op: "SUB" });
            return;
          case "*":
            this.emit({ op: "MUL" });
            return;
          case "/":
            this.emit({ op: "DIV" });
            return;
          case "<":
            this.emit({ op: "LT" });
            return;
          case ">":
            this.emit({ op: "GT" });
            return;
          case "<=":
            this.emit({ op: "LTE" });
            return;
          case ">=":
            this.emit({ op: "GTE" });
            return;
          case "==":
            this.emit({ op: "EQ" });
            return;
          case "!=":
            this.emit({ op: "NEQ" });
            return;
        }
    }
  }

  private currentLoop(): LoopContext {
    const loop = this.loops[this.loops.length - 1];

    if (!loop) {
      throw new Error("Loop control used outside of a loop");
    }

    return loop;
  }

  private emit(instruction: Instruction): number {
    this.code.push(instruction);
    return this.code.length - 1;
  }

  private emitConstant(value: Constant) {
    const index = this.constants.push(value) - 1;
    this.emit({ op: "PUSH_CONST", index });
  }

  private emitVariableRead(name: string) {
    const slot = this.resolveLocal(name);

    if (slot !== undefined) {
      this.emit({ op: "GET_LOCAL", slot });
      return;
    }

    this.emit({ op: "GET_VAR", name });
  }

  private emitAssignment(name: string) {
    const slot = this.resolveLocal(name);

    if (slot !== undefined) {
      this.emit({ op: "ASSIGN_LOCAL", slot, name });
      return;
    }

    this.emit({ op: "ASSIGN_VAR", name });
  }

  private emitScopeUnwind(targetDepth: number) {
    for (let depth = this.scopeDepth; depth > targetDepth; depth -= 1) {
      this.emit({ op: "POP_SCOPE" });
    }
  }

  private emitJump(op: "JUMP" | "JUMP_IF_FALSE"): number {
    return this.emit({ op, target: -1 });
  }

  private patchJump(index: number, target: number) {
    const instruction = this.code[index];

    if (instruction.op !== "JUMP" && instruction.op !== "JUMP_IF_FALSE") {
      throw new Error(`Cannot patch non-jump instruction at ${index}`);
    }

    this.code[index] = { ...instruction, target };
  }

  private patchLoopJumps(loop: LoopContext, loopEnd: number) {
    for (const index of loop.breakJumps) {
      this.patchJump(index, loopEnd);
    }

    for (const index of loop.continueJumps) {
      this.patchJump(index, loop.continueTarget);
    }
  }

  private beginScope() {
    this.localScopes.push(new Map());
  }

  private endScope() {
    if (this.localScopes.length === 1) {
      throw new Error("Cannot exit root compiler scope");
    }

    this.localScopes.pop();
  }

  private declareLocal(name: string): number {
    const scope = this.localScopes[this.localScopes.length - 1];
    const slot = this.nextSlot;
    this.nextSlot += 1;
    scope.set(name, slot);
    return slot;
  }

  private resolveLocal(name: string): number | undefined {
    for (let i = this.localScopes.length - 1; i >= 0; i -= 1) {
      const slot = this.localScopes[i].get(name);
      if (slot !== undefined) {
        return slot;
      }
    }

    return undefined;
  }

  private isInsideFunctionBody(): boolean {
    return this.localScopes.length > 1 || this.nextSlot > 0;
  }
}

export function compile(statements: readonly Stmt[]): Program {
  return new Compiler().compileProgram(statements);
}
