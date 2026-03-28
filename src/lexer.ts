export type Token =
  | { type: "LET" }
  | { type: "IF" }
  | { type: "ELSE" }
  | { type: "FUNCTION" }
  | { type: "RETURN" }
  | { type: "WHILE" }
  | { type: "FOR" }
  | { type: "BREAK" }
  | { type: "CONTINUE" }
  | { type: "TRUE" }
  | { type: "FALSE" }
  | { type: "IDENT"; value: string }
  | { type: "NUMBER"; value: number }
  | { type: "STRING"; value: string }
  | { type: "EQUAL" }
  | { type: "LT" }
  | { type: "GT" }
  | { type: "PLUS" }
  | { type: "MINUS" }
  | { type: "STAR" }
  | { type: "SLASH" }
  | { type: "BANG" }
  | { type: "ANDAND" }
  | { type: "OROR" }
  | { type: "COMMA" }
  | { type: "SEMICOLON" }
  | { type: "LPAREN" }
  | { type: "RPAREN" }
  | { type: "EQEQ" }
  | { type: "NOTEQ" }
  | { type: "LTE" }
  | { type: "GTE" }
  | { type: "LBRACE" }
  | { type: "RBRACE" };

export function tokenize(input: string): Token[] {
  const words =
    input.match(
      /"[^"]*"|\|\||&&|==|!=|<=|>=|[(),;{}+\-*/=!<>]|[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?/g
    ) ?? [];

  const tokens: Token[] = [];

  for (const w of words) {
    if (w === "let") tokens.push({ type: "LET" });
    else if (w === "if") tokens.push({ type: "IF" });
    else if (w === "else") tokens.push({ type: "ELSE" });
    else if (w === "function") tokens.push({ type: "FUNCTION" });
    else if (w === "return") tokens.push({ type: "RETURN" });
    else if (w === "while") tokens.push({ type: "WHILE" });
    else if (w === "for") tokens.push({ type: "FOR" });
    else if (w === "break") tokens.push({ type: "BREAK" });
    else if (w === "continue") tokens.push({ type: "CONTINUE" });
    else if (w === "true") tokens.push({ type: "TRUE" });
    else if (w === "false") tokens.push({ type: "FALSE" });
    else if (w === "=") tokens.push({ type: "EQUAL" });
    else if (w === "<") tokens.push({ type: "LT" });
    else if (w === ">") tokens.push({ type: "GT" });
    else if (w === "+") tokens.push({ type: "PLUS" });
    else if (w === "-") tokens.push({ type: "MINUS" });
    else if (w === "*") tokens.push({ type: "STAR" });
    else if (w === "/") tokens.push({ type: "SLASH" });
    else if (w === "!") tokens.push({ type: "BANG" });
    else if (w === "&&") tokens.push({ type: "ANDAND" });
    else if (w === "||") tokens.push({ type: "OROR" });
    else if (w === ",") tokens.push({ type: "COMMA" });
    else if (w === ";") tokens.push({ type: "SEMICOLON" });
    else if (w === "(") tokens.push({ type: "LPAREN" });
    else if (w === ")") tokens.push({ type: "RPAREN" });
    else if (w === "==") tokens.push({ type: "EQEQ" });
    else if (w === "!=") tokens.push({ type: "NOTEQ" });
    else if (w === "<=") tokens.push({ type: "LTE" });
    else if (w === ">=") tokens.push({ type: "GTE" });
    else if (w === "{") tokens.push({ type: "LBRACE" });
    else if (w === "}") tokens.push({ type: "RBRACE" });
    else if (!isNaN(Number(w))) tokens.push({ type: "NUMBER", value: Number(w) });
    else if (w.startsWith('"')) tokens.push({ type: "STRING", value: w.slice(1, -1) });
    else tokens.push({ type: "IDENT", value: w });
  }

  return tokens;
}
