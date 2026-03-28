export type Token =
    | { type: "LET" }
    | { type: "IF" }
    | { type: "ELSE" }
    | { type: "IDENT"; value: string }
    | { type: "NUMBER"; value: number }
    | { type: "STRING"; value: string }
    | { type: "EQUAL" }
    | { type: "LT" }
    | { type: "GT" }
    | { type: "PLUS" }
    | { type: "LBRACE" }
    | { type: "RBRACE" };

export function tokenize(input: string): Token[] {
    const words = input.match(/"[^"]*"|[{}]|[^\s{}]+/g) ?? [];

    const tokens: Token[] = [];

    for (const w of words) {
        if (w === "let") tokens.push({ type: "LET" });
        else if (w === "if") tokens.push({ type: "IF" });
        else if (w === "else") tokens.push({ type: "ELSE" });
        else if (w === "=") tokens.push({ type: "EQUAL" });
        else if (w === "<") tokens.push({ type: "LT" });
        else if (w === ">") tokens.push({ type: "GT" });
        else if (w === "+") tokens.push({ type: "PLUS" });
        else if (w === "{") tokens.push({ type: "LBRACE" });
        else if (w === "}") tokens.push({ type: "RBRACE" });
        else if (!isNaN(Number(w)))
            tokens.push({ type: "NUMBER", value: Number(w) });
        else if (w.startsWith('"'))
            tokens.push({ type: "STRING", value: w.replace(/"/g, "") });
        else tokens.push({ type: "IDENT", value: w });
    }

    return tokens;
}
