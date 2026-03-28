import fs from "fs";
import { tokenize } from "./lexer";
import { parse } from "./parser";
import { run } from "./interpreter";

const file = process.argv[2];

if (!file) {
    throw new Error("Missing input file. Usage: ts-node src/index.ts <file.sawit>");
}

if (!fs.existsSync(file)) {
    throw new Error(`Input file not found: ${file}`);
}

const code = fs.readFileSync(file, "utf-8");

const tokens = tokenize(code);
const ast = parse(tokens);

run(ast);
