#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const ARGS = new Set(process.argv.slice(2));
const OUTPUT_JSON = ARGS.has("--json");

// Common folders/files to skip in JS/TS monorepos.
const IGNORE_DIRS = new Set([
  ".git",
  ".next",
  ".turbo",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "out",
  ".cache",
  "tmp",
  "temp",
]);

const IGNORE_FILES = [/\.min\./i, /\.map$/i, /package-lock\.json$/i, /pnpm-lock\.yaml$/i];

const CODE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".html",
  ".vue",
  ".svelte",
  ".py",
  ".java",
  ".kt",
  ".go",
  ".rs",
  ".cs",
  ".yml",
  ".yaml",
  ".sql",
  ".sh",
  ".ps1",
]);

async function exists(p) {
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}

function shouldIgnoreFile(filePath) {
  const base = path.basename(filePath);
  for (const pattern of IGNORE_FILES) {
    if (pattern.test(base)) {
      return true;
    }
  }
  return false;
}

function isTextCodeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS.has(ext);
}

function countLines(content) {
  const lines = content.split(/\r?\n/);
  let total = lines.length;
  let blank = 0;
  let comment = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      blank += 1;
      continue;
    }

    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("#") ||
      trimmed.startsWith("--")
    ) {
      comment += 1;
    }
  }

  const code = Math.max(total - blank - comment, 0);
  return { total, code, comment, blank };
}

async function walk(dirPath, collector) {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) {
        continue;
      }
      await walk(fullPath, collector);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (shouldIgnoreFile(fullPath) || !isTextCodeFile(fullPath)) {
      continue;
    }

    try {
      const content = await fs.promises.readFile(fullPath, "utf8");
      const metrics = countLines(content);
      collector.files += 1;
      collector.total += metrics.total;
      collector.code += metrics.code;
      collector.comment += metrics.comment;
      collector.blank += metrics.blank;
    } catch {
      // Skip files that cannot be read as UTF-8 text.
    }
  }
}

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

async function collectProjectMetrics(projectRoot) {
  const collector = { files: 0, total: 0, code: 0, comment: 0, blank: 0 };
  await walk(projectRoot, collector);
  return collector;
}

async function main() {
  const projects = await findProjects(ROOT);
  if (!projects.length) {
    console.error("No project folders matched pattern ^\\d+-\\d+(-t)?$.");
    process.exitCode = 1;
    return;
  }

  const results = [];
  let grand = { files: 0, total: 0, code: 0, comment: 0, blank: 0 };

  for (const project of projects) {
    const projectPath = path.join(ROOT, project);
    if (!(await exists(projectPath))) {
      continue;
    }

    const metrics = await collectProjectMetrics(projectPath);
    results.push({ project, ...metrics });
    grand.files += metrics.files;
    grand.total += metrics.total;
    grand.code += metrics.code;
    grand.comment += metrics.comment;
    grand.blank += metrics.blank;
  }

  if (OUTPUT_JSON) {
    console.log(
      JSON.stringify(
        {
          root: ROOT,
          projects: results,
          grandTotal: grand,
        },
        null,
        2
      )
    );
    return;
  }

  console.log("LOC Metrics by Project");
  console.log("=".repeat(90));
  console.log(
    [
      "Project".padEnd(8),
      "Files".padStart(8),
      "Total".padStart(10),
      "Code".padStart(10),
      "Comment".padStart(10),
      "Blank".padStart(10),
      "Code%".padStart(9),
    ].join(" ")
  );
  console.log("-".repeat(90));

  for (const item of results) {
    const codePct = item.total ? ((item.code / item.total) * 100).toFixed(1) : "0.0";
    console.log(
      [
        item.project.padEnd(8),
        formatNumber(item.files).padStart(8),
        formatNumber(item.total).padStart(10),
        formatNumber(item.code).padStart(10),
        formatNumber(item.comment).padStart(10),
        formatNumber(item.blank).padStart(10),
        `${codePct}%`.padStart(9),
      ].join(" ")
    );
  }

  console.log("-".repeat(90));
  const grandCodePct = grand.total ? ((grand.code / grand.total) * 100).toFixed(1) : "0.0";
  console.log(
    [
      "TOTAL".padEnd(8),
      formatNumber(grand.files).padStart(8),
      formatNumber(grand.total).padStart(10),
      formatNumber(grand.code).padStart(10),
      formatNumber(grand.comment).padStart(10),
      formatNumber(grand.blank).padStart(10),
      `${grandCodePct}%`.padStart(9),
    ].join(" ")
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
