const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const README_PATH = path.resolve(__dirname, "../../README.md");
const ENV_EXAMPLE_PATH = path.resolve(__dirname, "../../.env.example");

function readReadme() {
  return fs.readFileSync(README_PATH, "utf8");
}

function readEnvExample() {
  return fs.readFileSync(ENV_EXAMPLE_PATH, "utf8");
}

function getEnvKeys(content) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split("=", 1)[0]);
}

test("README includes docker compose up command for deployment", () => {
  const readme = readReadme();

  assert.match(
    readme,
    /docker compose up -d --build/,
    "README must include 'docker compose up -d --build'"
  );
});

test("README documents loopback handoff to external gateway", () => {
  const readme = readReadme();
  const normalized = readme.toLowerCase();

  assert.match(
    normalized,
    /127\.0\.0\.1:3001/,
    "README must mention local loopback handoff on 127.0.0.1:3001"
  );
  assert.match(
    normalized,
    /gateway externo/,
    "README must mention external gateway"
  );
});

test("README explains external gateway and private app service", () => {
  const readme = readReadme();
  const normalized = readme.toLowerCase();

  assert.match(
    normalized,
    /(gateway externo)|(gateway.*extern)/,
    "README must mention external gateway architecture"
  );
  assert.match(normalized, /\bapp\b/, "README must mention app service");
  assert.match(
    normalized,
    /\/reporte\/?/,
    "README must mention /reporte routing path"
  );
  assert.match(
    normalized,
    /(app.*(interna|privad))|((interna|privad).*app)/s,
    "README must state app is internal/private"
  );
});

test("README uses root .env path as canonical setup", () => {
  const readme = readReadme();

  assert.match(
    readme,
    /cp \.env\.example \.env/,
    "README must include root-level .env setup command"
  );
  assert.doesNotMatch(
    readme,
    /cont-reportespiolis\/\.env/,
    "README must avoid nested path style for .env"
  );
});

test(".env.example contains only allowlisted deploy variables", () => {
  const envExample = readEnvExample();
  const keys = getEnvKeys(envExample).sort();

  assert.deepEqual(
    keys,
    ["EMAIL_DIFUSION", "EMAIL_PASS", "EMAIL_USER"],
    ".env.example must contain exactly EMAIL_USER, EMAIL_PASS and EMAIL_DIFUSION"
  );
});
