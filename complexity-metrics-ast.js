#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOT = process.cwd();
const ARGS = new Set(process.argv.slice(2));
const OUTPUT_JSON = ARGS.has("--json");
const PROJECT_FILTERS = process.argv
  .slice(2)
  .filter((arg) => arg.startsWith("--project="))
  .map((arg) => arg.slice("--project=".length))
  .filter(Boolean);
const GLOB_PATTERNS = ["**/*.{js,jsx,ts,tsx,mjs,cjs}"];
const IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/.turbo/**",
  "**/coverage/**",
  "**/out/**",
  "**/.cache/**",
  "**/tmp/**",
  "**/temp/**",
];

function isProjectFolderName(name) {
  return /^\d+-\d+(-t)?$/i.test(name);
}

async function findProjects(root) {
  const entries = await fs.promises.readdir(root, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && isProjectFolderName(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function formatNumber(value) {
  return value.toLocaleString("en-US");
}

async function runEslintForProject(projectPath) {
  try {
    const { ESLint } = require("eslint");
    const tsParserPath = require.resolve("@typescript-eslint/parser", { paths: [ROOT] });
    const sonarjs = require(require.resolve("eslint-plugin-sonarjs", { paths: [ROOT] }));

    const eslint = new ESLint({
      cwd: projectPath,
      useEslintrc: false,
      errorOnUnmatchedPattern: false,
      resolvePluginsRelativeTo: ROOT,
      plugins: {
        sonarjs,
      },
      overrideConfig: {
        parser: tsParserPath,
        parserOptions: {
          ecmaVersion: "latest",
          sourceType: "module",
        },
        plugins: ["sonarjs"],
        rules: {
          complexity: ["warn", 0],
          "sonarjs/cognitive-complexity": ["warn", 0],
        },
        ignorePatterns: IGNORE_PATTERNS,
      },
    });

    const report = await eslint.lintFiles(GLOB_PATTERNS);
    let cyclomaticCount = 0;
    let cyclomaticTotal = 0;
    let cognitiveCount = 0;
    let cognitiveTotal = 0;
    const filesWithSignals = new Set();

    for (const fileEntry of report) {
      const filePath = fileEntry.filePath || "";
      const messages = Array.isArray(fileEntry.messages) ? fileEntry.messages : [];

      for (const msg of messages) {
        if (msg.ruleId === "complexity") {
          const m = (msg.message || "").match(/complexity of\s+(\d+)/i);
          if (m) {
            cyclomaticCount += 1;
            cyclomaticTotal += Number(m[1]);
            if (filePath) {
              filesWithSignals.add(filePath);
            }
          }
        }
        if (msg.ruleId === "sonarjs/cognitive-complexity") {
          const fromM = (msg.message || "").match(/Cognitive Complexity from\s+(\d+)/i);
          const genericM = (msg.message || "").match(/Cognitive Complexity[^\d]*(\d+)/i);
          const score = fromM ? Number(fromM[1]) : genericM ? Number(genericM[1]) : null;
          if (score !== null) {
            cognitiveCount += 1;
            cognitiveTotal += score;
            if (filePath) {
              filesWithSignals.add(filePath);
            }
          }
        }
      }
    }

    return {
      ok: true,
      complexityFiles: filesWithSignals.size,
      cyclomatic: cyclomaticTotal,
      cyclomaticFunctionCount: cyclomaticCount,
      cognitive: cognitiveTotal,
      cognitiveFunctionCount: cognitiveCount,
      eslintExitCode: 0,
    };
  } catch (error) {
    return {
      ok: false,
      error:
        (error && error.message) ||
        "AST mode requires local dev dependencies at workspace root: npm i -D eslint@8.57.1 @typescript-eslint/parser@7.18.0 eslint-plugin-sonarjs@2.0.4 typescript@5",
    };
  }
}

async function main() {
  let projects = await findProjects(ROOT);
  if (PROJECT_FILTERS.length > 0) {
    const filterSet = new Set(PROJECT_FILTERS);
    projects = projects.filter((name) => filterSet.has(name));
  }

  if (!projects.length) {
    console.error("No project folders matched pattern ^\\d+-\\d+(-t)?$.");
    process.exitCode = 1;
    return;
  }

  const results = [];
  for (const project of projects) {
    const projectPath = path.join(ROOT, project);
    const result = await runEslintForProject(projectPath);

    if (!result.ok) {
      results.push({
        project,
        complexityFiles: 0,
        cyclomatic: 0,
        cyclomaticFunctionCount: 0,
        cyclomaticPerFunction: 0,
        cognitive: 0,
        cognitiveFunctionCount: 0,
        cognitivePerFunction: 0,
        status: "error",
        error: result.error,
      });
      continue;
    }

    results.push({
      project,
      complexityFiles: result.complexityFiles,
      cyclomatic: result.cyclomatic,
      cyclomaticFunctionCount: result.cyclomaticFunctionCount,
      cyclomaticPerFunction: result.cyclomaticFunctionCount
        ? result.cyclomatic / result.cyclomaticFunctionCount
        : 0,
      cognitive: result.cognitive,
      cognitiveFunctionCount: result.cognitiveFunctionCount,
      cognitivePerFunction: result.cognitiveFunctionCount
        ? result.cognitive / result.cognitiveFunctionCount
        : 0,
      status: "ok",
      eslintExitCode: result.eslintExitCode,
    });
  }

  if (OUTPUT_JSON) {
    console.log(
      JSON.stringify(
        {
          root: ROOT,
          engine: "eslint-ast",
          generatedAt: new Date().toISOString(),
          host: os.hostname(),
          projects: results,
        },
        null,
        2
      )
    );
    return;
  }

  console.log("Complexity Metrics by Project (AST / ESLint)");
  console.log("=".repeat(112));
  console.log(
    [
      "Project".padEnd(8),
      "Status".padEnd(7),
      "CxFiles".padStart(8),
      "Cyclo".padStart(8),
      "CycloFn".padStart(8),
      "Cyclo/Fn".padStart(9),
      "Cog".padStart(8),
      "CogFn".padStart(7),
      "Cog/Fn".padStart(8),
    ].join(" ")
  );
  console.log("-".repeat(112));

  for (const item of results) {
    console.log(
      [
        item.project.padEnd(8),
        item.status.padEnd(7),
        formatNumber(item.complexityFiles).padStart(8),
        formatNumber(item.cyclomatic).padStart(8),
        formatNumber(item.cyclomaticFunctionCount).padStart(8),
        item.cyclomaticPerFunction.toFixed(2).padStart(9),
        formatNumber(item.cognitive).padStart(8),
        formatNumber(item.cognitiveFunctionCount).padStart(7),
        item.cognitivePerFunction.toFixed(2).padStart(8),
      ].join(" ")
    );
  }

  const failed = results.filter((r) => r.status === "error");
  if (failed.length > 0) {
    console.log("\nErrors:");
    for (const item of failed) {
      const msg = (item.error || "unknown error").split(/\r?\n/)[0];
      console.log(`- ${item.project}: ${msg}`);
    }
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
