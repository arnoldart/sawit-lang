require("ts-node/register");

const { readdirSync, readFileSync } = require("fs");
const path = require("path");

const rootDir = process.cwd();
const testsDir = path.join(rootDir, "tests");

const expectedFailures = new Set([
  "parse_error_missing_paren.sawit",
]);

const testFiles = readdirSync(testsDir)
  .filter((name) => name.endsWith(".sawit"))
  .sort((a, b) => a.localeCompare(b));

function loadRuntime() {
  const modulePaths = [
    path.join(rootDir, "src", "lexer.ts"),
    path.join(rootDir, "src", "parser.ts"),
    path.join(rootDir, "src", "interpreter.ts"),
  ];

  for (const modulePath of modulePaths) {
    delete require.cache[require.resolve(modulePath)];
  }

  return {
    ...require(modulePaths[0]),
    ...require(modulePaths[1]),
    ...require(modulePaths[2]),
  };
}

let failed = false;

for (const file of testFiles) {
  const fullPath = path.join(testsDir, file);
  const code = readFileSync(fullPath, "utf8");
  const shouldFail = expectedFailures.has(file);

  const logs = [];
  const originalLog = console.log;
  let runtimeError = null;

  console.log = (...args) => {
    logs.push(args.join(" "));
  };

  try {
    const { tokenize, parse, run } = loadRuntime();
    const tokens = tokenize(code);
    const ast = parse(tokens);
    run(ast);
  } catch (error) {
    runtimeError = error;
  } finally {
    console.log = originalLog;
  }

  const passed = shouldFail ? runtimeError !== null : runtimeError === null;

  console.log(`=== ${file} ===`);
  console.log(`status: ${passed ? "PASS" : "FAIL"}`);

  if (logs.length > 0) {
    console.log(logs.join("\n"));
  }

  if (runtimeError) {
    console.log(runtimeError instanceof Error ? runtimeError.message : String(runtimeError));
  }

  if (!passed) {
    failed = true;
  }

  console.log("");
}

if (failed) {
  process.exit(1);
}
