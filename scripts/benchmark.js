require("ts-node/register");

const { performance } = require("perf_hooks");
const { tokenize } = require("../src/lexer.ts");
const { parse } = require("../src/parser.ts");
const { runLegacy } = require("../src/legacy-interpreter.ts");
const { run } = require("../src/interpreter.ts");
const { compile } = require("../src/compiler.ts");
const { execute } = require("../src/vm.ts");

const benchmarkSource = `
function accumulate(limit, seed) {
  let total = seed

  for let i = 0; i < limit; i = i + 1 {
    total = total + i
  }

  return total
}

function drive(rounds) {
  let sum = 0

  for let outer = 0; outer < rounds; outer = outer + 1 {
    sum = sum + accumulate(300, outer)
  }

  return sum
}

let result = 0

for let batch = 0; batch < 200; batch = batch + 1 {
  result = result + drive(150)
}
`;

function withMutedConsole(fn) {
  const originalLog = console.log;
  console.log = () => {};

  try {
    return fn();
  } finally {
    console.log = originalLog;
  }
}

function timeIt(label, iterations, fn) {
  for (let i = 0; i < 5; i += 1) {
    fn();
  }

  const start = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    fn();
  }
  const totalMs = performance.now() - start;

  return {
    label,
    iterations,
    totalMs,
    avgMs: totalMs / iterations,
  };
}

function printSection(title, rows) {
  console.log(`\n${title}`);
  for (const row of rows) {
    console.log(
      `${row.label.padEnd(26)} total=${row.totalMs.toFixed(2).padStart(9)} ms  avg=${row.avgMs
        .toFixed(4)
        .padStart(9)} ms`
    );
  }
}

const tokens = tokenize(benchmarkSource);
const ast = parse(tokens);
const program = compile(ast);

const parseIterations = 200;
const runIterations = 20;

const parseRows = [
  timeIt("tokenize + parse", parseIterations, () => {
    const freshTokens = tokenize(benchmarkSource);
    parse(freshTokens);
  }),
];

const runtimeRows = withMutedConsole(() => [
  timeIt("legacy run(ast)", runIterations, () => {
    runLegacy(ast);
  }),
  timeIt("vm run(ast)", runIterations, () => {
    run(ast);
  }),
  timeIt("vm execute(compiled)", runIterations, () => {
    execute(program);
  }),
]);

const baseline = runtimeRows[0].totalMs;

console.log("Sawit runtime benchmark");
console.log("workload: nested loops + function calls");
console.log(`parse iterations: ${parseIterations}`);
console.log(`runtime iterations: ${runIterations}`);

printSection("Frontend", parseRows);
printSection("Runtime", runtimeRows);

for (const row of runtimeRows.slice(1)) {
  console.log(
    `${row.label.padEnd(26)} speedup=${(baseline / row.totalMs).toFixed(2)}x vs legacy`
  );
}
