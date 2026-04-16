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

test("README includes docker compose up command for deployment", () => {
  const readme = readReadme();

  assert.match(
    readme,
    /docker compose up -d --build/,
    "README must include 'docker compose up -d --build'"
  );
});

test("README states only nginx exposes host ports and app remains private", () => {
  const readme = readReadme();

  assert.match(
    readme,
    /solo nginx expone puertos al host.*app.*privad[ao]/is,
    "README must explain nginx is the only public entrypoint and app is private"
  );
});

test(".env.example contains only required email variables for deploy", () => {
  const envExample = readEnvExample();

  assert.match(envExample, /^EMAIL_USER=/m, ".env.example must define EMAIL_USER");
  assert.match(envExample, /^EMAIL_PASS=/m, ".env.example must define EMAIL_PASS");
  assert.match(
    envExample,
    /^EMAIL_DIFUSION=/m,
    ".env.example must define EMAIL_DIFUSION"
  );
});

test(".env.example does not include SMB credentials", () => {
  const envExample = readEnvExample();

  assert.doesNotMatch(
    envExample,
    /^SMB_USER=/m,
    ".env.example must not include SMB_USER"
  );
  assert.doesNotMatch(
    envExample,
    /^SMB_PASS=/m,
    ".env.example must not include SMB_PASS"
  );
});
