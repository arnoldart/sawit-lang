import { Token } from "./lexer";

export type Expr =
  | { type: "NUMBER"; value: number }
  | { type: "STRING"; value: string }

  // ADDED: node AST untuk boolean
  | { type: "BOOLEAN"; value: boolean }

  | { type: "IDENT"; name: string }

  // ADDED: node AST untuk unary operator
  | { type: "UNARY"; op: "-" | "!"; right: Expr }

  | {
      type: "BINARY";
      op: string;
      left: Expr;
      right: Expr;
    };

export type Stmt =
  | { type: "LET"; name: string; value: Expr }
  | { type: "IF"; condition: Expr; body: Stmt[]; elseBody?: Stmt[] }
  | { type: "PRINT"; value: Expr };

let tokens: Token[] = [];
let current = 0;

function expectToken(index: number): Token {
  const token = tokens[index];
  if (!token) {
    throw new Error(`Unexpected end of input at token index ${index}`);
  }
  return token;
}

function peek(): Token | undefined {
  return tokens[current];
}

function advance(): Token {
  const token = expectToken(current);
  current += 1;
  return token;
}

function match(type: Token["type"]): boolean {
  if (peek()?.type !== type) return false;
  current += 1;
  return true;
}

function expectType(type: Token["type"], message: string): Token {
  const token = advance();
  if (token.type !== type) {
    throw new Error(message);
  }
  return token;
}

function parseExpression(): Expr {
  // ADDED: expression sekarang mulai dari logical OR
  return parseLogicalOr();
}

// ADDED: parser untuk ||
function parseLogicalOr(): Expr {
  let left = parseLogicalAnd();

  while (peek()?.type === "OROR") {
    advance();
    const right = parseLogicalAnd();

    left = {
      type: "BINARY",
      op: "||",
      left,
      right,
    };
  }

  return left;
}

// ADDED: parser untuk &&
function parseLogicalAnd(): Expr {
  let left = parseEquality();

  while (peek()?.type === "ANDAND") {
    advance();
    const right = parseEquality();

    left = {
      type: "BINARY",
      op: "&&",
      left,
      right,
    };
  }

  return left;
}

function parseEquality(): Expr {
  let left = parseComparison();

  while (true) {
    const op = peek();
    if (!op || (op.type !== "EQEQ" && op.type !== "NOTEQ")) break;

    advance();
    const right = parseComparison();

    left = {
      type: "BINARY",
      op: op.type === "EQEQ" ? "==" : "!=",
      left,
      right,
    };
  }

  return left;
}

function parseComparison(): Expr {
  let left = parseAddition();

  while (true) {
    const op = peek();
    if (!op || !["LT", "GT", "LTE", "GTE"].includes(op.type)) break;

    advance();
    const right = parseAddition();

    let operator = "<";
    if (op.type === "GT") operator = ">";
    if (op.type === "LTE") operator = "<=";
    if (op.type === "GTE") operator = ">=";

    left = {
      type: "BINARY",
      op: operator,
      left,
      right,
    };
  }

  return left;
}

function parseAddition(): Expr {
  let left = parseMultiplication();

  while (true) {
    const op = peek();
    if (!op || (op.type !== "PLUS" && op.type !== "MINUS")) break;

    advance();
    const right = parseMultiplication();

    left = {
      type: "BINARY",
      op: op.type === "PLUS" ? "+" : "-",
      left,
      right,
    };
  }

  return left;
}

function parseMultiplication(): Expr {
  // ADDED: multiplication sekarang mengambil dari parseUnary
  let left = parseUnary();

  while (true) {
    const op = peek();
    if (!op || (op.type !== "STAR" && op.type !== "SLASH")) break;

    advance();
    const right = parseUnary();

    left = {
      type: "BINARY",
      op: op.type === "STAR" ? "*" : "/",
      left,
      right,
    };
  }

  return left;
}

// ADDED: parser unary untuk -x dan !x
function parseUnary(): Expr {
  const token = peek();

  if (token?.type === "MINUS") {
    advance();
    return {
      type: "UNARY",
      op: "-",
      right: parseUnary(),
    };
  }

  if (token?.type === "BANG") {
    advance();
    return {
      type: "UNARY",
      op: "!",
      right: parseUnary(),
    };
  }

  return parsePrimary();
}

function parsePrimary(): Expr {
  const token = advance();

  if (token.type === "NUMBER") {
    return { type: "NUMBER", value: token.value };
  }

  if (token.type === "STRING") {
    return { type: "STRING", value: token.value };
  }

  // ADDED: parsing boolean literal
  if (token.type === "TRUE") {
    return { type: "BOOLEAN", value: true };
  }

  // ADDED: parsing boolean literal
  if (token.type === "FALSE") {
    return { type: "BOOLEAN", value: false };
  }

  if (token.type === "IDENT") {
    return { type: "IDENT", name: token.value };
  }

  if (token.type === "LPAREN") {
    const expr = parseExpression();
    expectType("RPAREN", "Expected ')'");
    return expr;
  }

  throw new Error(`Unexpected token at token index ${current - 1}`);
}

function parsePrintStatement(): Stmt {
  const printToken = advance();

  if (printToken.type !== "IDENT" || printToken.value !== "print") {
    throw new Error(`Expected print statement at token index ${current - 1}`);
  }

  return {
    type: "PRINT",
    value: parseExpression(),
  };
}

function parseBlock(): Stmt[] {
  expectType("LBRACE", `Expected '{' at token index ${current}`);

  const body: Stmt[] = [];

  while (peek() && peek()?.type !== "RBRACE") {
    body.push(parseStatement());
  }

  expectType("RBRACE", `Expected '}' at token index ${current}`);

  return body;
}

function parseLetStatement(): Stmt {
  expectType("LET", `Expected 'let' at token index ${current}`);

  const nameToken = advance();
  if (nameToken.type !== "IDENT") {
    throw new Error(`Expected identifier after let at token index ${current - 1}`);
  }

  expectType("EQUAL", `Expected '=' after identifier at token index ${current}`);

  return {
    type: "LET",
    name: nameToken.value,
    value: parseExpression(),
  };
}

function parseIfStatement(): Stmt {
  expectType("IF", `Expected 'if' at token index ${current}`);

  const condition = parseExpression();
  const body = parseBlock();
  let elseBody: Stmt[] | undefined;

  if (match("ELSE")) {
    elseBody = parseBlock();
  }

  return {
    type: "IF",
    condition,
    body,
    elseBody,
  };
}

function parseStatement(): Stmt {
  const token = expectToken(current);

  if (token.type === "LET") {
    return parseLetStatement();
  }

  if (token.type === "IF") {
    return parseIfStatement();
  }

  if (token.type === "IDENT" && token.value === "print") {
    return parsePrintStatement();
  }

  throw new Error(`Unknown statement at token index ${current}`);
}

export function parse(inputTokens: Token[]): Stmt[] {
  tokens = inputTokens;
  current = 0;

  const stmts: Stmt[] = [];

  while (current < tokens.length) {
    stmts.push(parseStatement());
  }

  return stmts;
}
