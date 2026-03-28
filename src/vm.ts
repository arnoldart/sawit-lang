import { Constant, FunctionChunk, Instruction, Program } from "./compiler";

type RuntimeFunction = {
  readonly type: "FUNCTION";
  readonly name: string;
  readonly params: readonly string[];
  readonly code: readonly Instruction[];
  readonly constants: readonly Constant[];
  readonly localCount: number;
  readonly closure: Scope;
};

type Value = number | string | boolean | RuntimeFunction;
type SlotValue = Value | undefined;

class Scope {
  private readonly values = new Map<string, Value>();

  constructor(private parent?: Scope) {}

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

  exit(): Scope {
    if (!this.parent) {
      throw new Error("Cannot pop global scope");
    }

    return this.parent;
  }
}

type Frame = {
  code: readonly Instruction[];
  constants: readonly Constant[];
  locals: SlotValue[];
  ip: number;
  scope: Scope;
};

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

function ensureFunction(value: Value): RuntimeFunction {
  if (typeof value === "object" && value !== null && value.type === "FUNCTION") {
    return value;
  }

  throw new Error("Can only call functions");
}

function materializeConstant(constant: Constant, scope: Scope): Value {
  if (typeof constant === "object" && constant !== null && "code" in constant) {
    const fn = constant as FunctionChunk;
    return {
      type: "FUNCTION",
      name: fn.name,
      params: fn.params,
      code: fn.code,
      constants: fn.constants,
      localCount: fn.localCount,
      closure: scope,
    };
  }

  return constant;
}

function pop(stack: Value[]): Value {
  const value = stack.pop();

  if (value === undefined) {
    throw new Error("VM stack underflow");
  }

  return value;
}

function readLocal(locals: SlotValue[], slot: number): Value {
  const value = locals[slot];

  if (value === undefined) {
    throw new Error(`Uninitialized local slot: ${slot}`);
  }

  return value;
}

export function execute(program: Program) {
  const stack: Value[] = [];
  const globalScope = new Scope();
  const frames: Frame[] = [
    {
      code: program.code,
      constants: program.constants,
      locals: new Array(program.localCount),
      ip: 0,
      scope: globalScope,
    },
  ];

  while (frames.length > 0) {
    const frame = frames[frames.length - 1];

    if (frame.ip >= frame.code.length) {
      frames.pop();
      continue;
    }

    const instruction = frame.code[frame.ip];
    frame.ip += 1;

    switch (instruction.op) {
      case "PUSH_CONST":
        stack.push(materializeConstant(frame.constants[instruction.index], frame.scope));
        break;
      case "GET_LOCAL":
        stack.push(readLocal(frame.locals, instruction.slot));
        break;
      case "DEFINE_LOCAL": {
        const value = pop(stack);
        frame.locals[instruction.slot] = value;
        frame.scope.define(instruction.name, value);
        break;
      }
      case "ASSIGN_LOCAL": {
        const value = pop(stack);
        frame.locals[instruction.slot] = value;
        frame.scope.assign(instruction.name, value);
        break;
      }
      case "GET_VAR":
        stack.push(frame.scope.get(instruction.name));
        break;
      case "DEFINE_VAR":
        frame.scope.define(instruction.name, pop(stack));
        break;
      case "ASSIGN_VAR":
        frame.scope.assign(instruction.name, pop(stack));
        break;
      case "NEGATE":
        stack.push(-ensureNumber(pop(stack), "-"));
        break;
      case "NOT":
        stack.push(!ensureBoolean(pop(stack), "!"));
        break;
      case "DUP": {
        const value = pop(stack);
        stack.push(value, value);
        break;
      }
      case "ADD": {
        const right = ensureNumber(pop(stack), "+");
        const left = ensureNumber(pop(stack), "+");
        stack.push(left + right);
        break;
      }
      case "SUB": {
        const right = ensureNumber(pop(stack), "-");
        const left = ensureNumber(pop(stack), "-");
        stack.push(left - right);
        break;
      }
      case "MUL": {
        const right = ensureNumber(pop(stack), "*");
        const left = ensureNumber(pop(stack), "*");
        stack.push(left * right);
        break;
      }
      case "DIV": {
        const right = ensureNumber(pop(stack), "/");
        const left = ensureNumber(pop(stack), "/");
        stack.push(left / right);
        break;
      }
      case "LT": {
        const right = ensureNumber(pop(stack), "<");
        const left = ensureNumber(pop(stack), "<");
        stack.push(left < right);
        break;
      }
      case "GT": {
        const right = ensureNumber(pop(stack), ">");
        const left = ensureNumber(pop(stack), ">");
        stack.push(left > right);
        break;
      }
      case "LTE": {
        const right = ensureNumber(pop(stack), "<=");
        const left = ensureNumber(pop(stack), "<=");
        stack.push(left <= right);
        break;
      }
      case "GTE": {
        const right = ensureNumber(pop(stack), ">=");
        const left = ensureNumber(pop(stack), ">=");
        stack.push(left >= right);
        break;
      }
      case "EQ": {
        const right = pop(stack);
        const left = pop(stack);
        stack.push(left === right);
        break;
      }
      case "NEQ": {
        const right = pop(stack);
        const left = pop(stack);
        stack.push(left !== right);
        break;
      }
      case "JUMP":
        frame.ip = instruction.target;
        break;
      case "JUMP_IF_FALSE": {
        const condition = pop(stack);

        if (typeof condition !== "boolean") {
          throw new Error("Condition must be boolean");
        }

        if (!condition) {
          frame.ip = instruction.target;
        }
        break;
      }
      case "POP":
        pop(stack);
        break;
      case "PUSH_SCOPE":
        frame.scope = new Scope(frame.scope);
        break;
      case "POP_SCOPE": {
        frame.scope = frame.scope.exit();
        break;
      }
      case "CALL": {
        const args = stack.splice(stack.length - instruction.argCount, instruction.argCount);
        const callee = ensureFunction(pop(stack));

        if (args.length !== instruction.argCount) {
          throw new Error("VM argument stack mismatch");
        }

        if (callee.params.length !== args.length) {
          throw new Error(
            `Function '${callee.name}' expects ${callee.params.length} argument(s), got ${args.length}`
          );
        }

        const scope = new Scope(callee.closure);

        frames.push({
          code: callee.code,
          constants: callee.constants,
          locals: new Array(callee.localCount),
          ip: 0,
          scope,
        });

        for (let i = 0; i < args.length; i += 1) {
          frames[frames.length - 1].locals[i] = args[i];
          scope.define(callee.params[i], args[i]);
        }
        break;
      }
      case "PRINT":
        console.log(pop(stack));
        break;
      case "RETURN": {
        const returnValue = stack.length > 0 ? pop(stack) : false;
        frames.pop();

        if (frames.length > 0) {
          stack.push(returnValue);
        }
        break;
      }
    }
  }
}
