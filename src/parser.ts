import { Token } from "./lexer";

export type Expr =
  | { type: "NUMBER"; value: number }
  | { type: "STRING"; value: string }
  | { type: "IDENT"; name: string }
  | { type: "BINARY"; op: "+" | "<" | ">"; left: Expr; right: Expr };

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

function parsePrimary(): Expr {
  const token = advance();

  if (token.type === "NUMBER") {
    return { type: "NUMBER", value: token.value };
  }

  if (token.type === "STRING") {
    return { type: "STRING", value: token.value };
  }

  if (token.type === "IDENT") {
    return { type: "IDENT", name: token.value };
  }

  throw new Error("Unexpected token");
}

// function parseBinary(): Expr {
//   let left = parsePrimary();

//   while (true) {
//     const operator = peek();

//     if (!operator || (operator.type !== "PLUS" && operator.type !== "LT" && operator.type !== "GT")) {
//       break;
//     }

//     advance();
//     const right = parsePrimary();
//     const op = operator.type === "PLUS" ? "+" : operator.type === "LT" ? "<" : ">";

//     left = {
//       type: "BINARY",
//       op,
//       left,
//       right,
//     };
//   }

//   return left;
// }

function parseExpression(): Expr {
  return parseComparison();
}

function parseComparison(): Expr {
  let left = parseAddition();

  while (true) {
    const operator = peek();

    if (!operator || (operator.type !== "LT" && operator.type !== "GT")) {
      break;
    }

    advance();

    const right = parseAddition();

    const op = operator.type === "LT" ? "<" : ">";

    left = {
      type: "BINARY",
      op,
      left,
      right,
    };
  }

  return left;
}

function parseAddition(): Expr {
  let left = parsePrimary();

  while (peek()?.type === "PLUS") {
    advance();

    const right = parsePrimary();

    left = {
      type: "BINARY",
      op: "+",
      left,
      right,
    };
  }

  return left;
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
