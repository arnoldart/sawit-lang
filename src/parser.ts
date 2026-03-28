import { Token } from "./lexer";

export type Expr =
  | { type: "NUMBER"; value: number }
  | { type: "STRING"; value: string }
  | { type: "BOOLEAN"; value: boolean }
  | { type: "IDENT"; name: string }
  | { type: "UNARY"; op: "-" | "!"; right: Expr }
  | { type: "BINARY"; op: string; left: Expr; right: Expr }
  | { type: "CALL"; callee: Expr; args: Expr[] };

export type Stmt =
  | { type: "LET"; name: string; value: Expr }
  | { type: "ASSIGN"; name: string; value: Expr }
  | { type: "IF"; condition: Expr; body: Stmt[]; elseBody?: Stmt[] }
  | { type: "FUNCTION"; name: string; params: string[]; body: Stmt[] }
  | { type: "RETURN"; value?: Expr }
  | { type: "WHILE"; condition: Expr; body: Stmt[] }
  | { type: "FOR"; init?: Stmt; condition?: Expr; update?: Stmt; body: Stmt[] }
  | { type: "BREAK" }
  | { type: "CONTINUE" }
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

function peekNext(): Token | undefined {
  return tokens[current + 1];
}

function advance(): Token {
  const token = expectToken(current);
  current += 1;
  return token;
}

function match(type: Token["type"]): boolean {
  if (peek()?.type !== type) {
    return false;
  }

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
  return parseLogicalOr();
}

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

    if (!op || (op.type !== "EQEQ" && op.type !== "NOTEQ")) {
      break;
    }

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

    if (!op || !["LT", "GT", "LTE", "GTE"].includes(op.type)) {
      break;
    }

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

    if (!op || (op.type !== "PLUS" && op.type !== "MINUS")) {
      break;
    }

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
  let left = parseUnary();

  while (true) {
    const op = peek();

    if (!op || (op.type !== "STAR" && op.type !== "SLASH")) {
      break;
    }

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

  return parseCall();
}

function parseCall(): Expr {
  let expr = parsePrimary();

  while (peek()?.type === "LPAREN") {
    advance();

    const args: Expr[] = [];
    if (peek()?.type !== "RPAREN") {
      do {
        args.push(parseExpression());
      } while (match("COMMA"));
    }

    expectType("RPAREN", `Expected ')' after function arguments at token index ${current}`);

    expr = {
      type: "CALL",
      callee: expr,
      args,
    };
  }

  return expr;
}

function parsePrimary(): Expr {
  const token = advance();

  if (token.type === "NUMBER") {
    return { type: "NUMBER", value: token.value };
  }

  if (token.type === "STRING") {
    return { type: "STRING", value: token.value };
  }

  if (token.type === "TRUE") {
    return { type: "BOOLEAN", value: true };
  }

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

function parseAssignmentStatement(): Stmt {
  const nameToken = advance();

  if (nameToken.type !== "IDENT") {
    throw new Error(`Expected identifier in assignment at token index ${current - 1}`);
  }

  expectType("EQUAL", `Expected '=' in assignment at token index ${current}`);

  return {
    type: "ASSIGN",
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

function parseFunctionDeclaration(): Stmt {
  expectType("FUNCTION", `Expected 'function' at token index ${current}`);

  const nameToken = advance();
  if (nameToken.type !== "IDENT") {
    throw new Error(`Expected function name at token index ${current - 1}`);
  }

  expectType("LPAREN", `Expected '(' after function name at token index ${current}`);

  const params: string[] = [];
  if (peek()?.type !== "RPAREN") {
    do {
      const paramToken = advance();
      if (paramToken.type !== "IDENT") {
        throw new Error(`Expected parameter name at token index ${current - 1}`);
      }
      params.push(paramToken.value);
    } while (match("COMMA"));
  }

  expectType("RPAREN", `Expected ')' after parameters at token index ${current}`);

  return {
    type: "FUNCTION",
    name: nameToken.value,
    params,
    body: parseBlock(),
  };
}

function parseReturnStatement(): Stmt {
  expectType("RETURN", `Expected 'return' at token index ${current}`);

  if (!peek() || peek()?.type === "RBRACE") {
    return { type: "RETURN" };
  }

  return {
    type: "RETURN",
    value: parseExpression(),
  };
}

function parseWhileStatement(): Stmt {
  expectType("WHILE", `Expected 'while' at token index ${current}`);

  return {
    type: "WHILE",
    condition: parseExpression(),
    body: parseBlock(),
  };
}

function parseForClauseStatement(): Stmt {
  if (peek()?.type === "LET") {
    return parseLetStatement();
  }

  if (peek()?.type === "IDENT" && peekNext()?.type === "EQUAL") {
    return parseAssignmentStatement();
  }

  throw new Error(`Expected let or assignment in for clause at token index ${current}`);
}

function parseForStatement(): Stmt {
  expectType("FOR", `Expected 'for' at token index ${current}`);

  let init: Stmt | undefined;
  let condition: Expr | undefined;
  let update: Stmt | undefined;

  if (peek()?.type !== "SEMICOLON") {
    init = parseForClauseStatement();
  }
  expectType("SEMICOLON", `Expected ';' after for initializer at token index ${current}`);

  if (peek()?.type !== "SEMICOLON") {
    condition = parseExpression();
  }
  expectType("SEMICOLON", `Expected ';' after for condition at token index ${current}`);

  if (peek()?.type !== "LBRACE") {
    update = parseForClauseStatement();
  }

  return {
    type: "FOR",
    init,
    condition,
    update,
    body: parseBlock(),
  };
}

function parseBreakStatement(): Stmt {
  expectType("BREAK", `Expected 'break' at token index ${current}`);
  return { type: "BREAK" };
}

function parseContinueStatement(): Stmt {
  expectType("CONTINUE", `Expected 'continue' at token index ${current}`);
  return { type: "CONTINUE" };
}

function parseStatement(): Stmt {
  const token = expectToken(current);

  if (token.type === "LET") {
    return parseLetStatement();
  }

  if (token.type === "IF") {
    return parseIfStatement();
  }

  if (token.type === "FUNCTION") {
    return parseFunctionDeclaration();
  }

  if (token.type === "RETURN") {
    return parseReturnStatement();
  }

  if (token.type === "WHILE") {
    return parseWhileStatement();
  }

  if (token.type === "FOR") {
    return parseForStatement();
  }

  if (token.type === "BREAK") {
    return parseBreakStatement();
  }

  if (token.type === "CONTINUE") {
    return parseContinueStatement();
  }

  if (token.type === "IDENT" && token.value === "print") {
    return parsePrintStatement();
  }

  if (token.type === "IDENT" && peekNext()?.type === "EQUAL") {
    return parseAssignmentStatement();
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
