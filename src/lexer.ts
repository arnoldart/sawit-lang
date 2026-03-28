export type Token =
  | { type: "LET" }
  | { type: "IF" }
  | { type: "ELSE" }

  // ADDED: token untuk boolean literal
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

  // ADDED: token untuk unary operator !
  | { type: "BANG" }

  // ADDED: token untuk logical operator
  | { type: "ANDAND" }
  | { type: "OROR" }

  | { type: "LPAREN" }
  | { type: "RPAREN" }
  | { type: "EQEQ" }
  | { type: "NOTEQ" }
  | { type: "LTE" }
  | { type: "GTE" }
  | { type: "LBRACE" }
  | { type: "RBRACE" };

export function tokenize(input: string): Token[] {
  // ADDED: regex diperluas supaya bisa membaca ||, &&, !, true, false
  const words =
    input.match(
      /"[^"]*"|\|\||&&|==|!=|<=|>=|[(){}+\-*/=!<>]|[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?/g
    ) ?? [];

  const tokens: Token[] = [];

  for (const w of words) {
    if (w === "let") tokens.push({ type: "LET" });
    else if (w === "if") tokens.push({ type: "IF" });
    else if (w === "else") tokens.push({ type: "ELSE" });

    // ADDED: boolean literal
    else if (w === "true") tokens.push({ type: "TRUE" });
    else if (w === "false") tokens.push({ type: "FALSE" });

    else if (w === "=") tokens.push({ type: "EQUAL" });
    else if (w === "<") tokens.push({ type: "LT" });
    else if (w === ">") tokens.push({ type: "GT" });
    else if (w === "+") tokens.push({ type: "PLUS" });
    else if (w === "-") tokens.push({ type: "MINUS" });
    else if (w === "*") tokens.push({ type: "STAR" });
    else if (w === "/") tokens.push({ type: "SLASH" });

    // ADDED: unary !
    else if (w === "!") tokens.push({ type: "BANG" });

    // ADDED: logical operators
    else if (w === "&&") tokens.push({ type: "ANDAND" });
    else if (w === "||") tokens.push({ type: "OROR" });

    else if (w === "(") tokens.push({ type: "LPAREN" });
    else if (w === ")") tokens.push({ type: "RPAREN" });
    else if (w === "==") tokens.push({ type: "EQEQ" });
    else if (w === "!=") tokens.push({ type: "NOTEQ" });
    else if (w === "<=") tokens.push({ type: "LTE" });
    else if (w === ">=") tokens.push({ type: "GTE" });
    else if (w === "{") tokens.push({ type: "LBRACE" });
    else if (w === "}") tokens.push({ type: "RBRACE" });
    else if (!isNaN(Number(w))) tokens.push({ type: "NUMBER", value: Number(w) });
    else if (w.startsWith('"')) tokens.push({ type: "STRING", value: w.replace(/"/g, "") });
    else tokens.push({ type: "IDENT", value: w });
  }

  return tokens;
}
