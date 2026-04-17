const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const NGINX_CONF_PATH = path.resolve(__dirname, "../../deploy/nginx/nginx.conf");
const COMPOSE_PATH = path.resolve(__dirname, "../../docker-compose.yml");

function readComposeText() {
  return fs.readFileSync(COMPOSE_PATH, "utf8");
}

test("local nginx artifact is removed from deploy tree", () => {
  assert.equal(
    fs.existsSync(NGINX_CONF_PATH),
    false,
    "deploy/nginx/nginx.conf must not exist in app-only deploy"
  );
});

test("compose has no local nginx service references", () => {
  const composeText = readComposeText();

  assert.doesNotMatch(
    composeText,
    /^\s{2}nginx:\s*$/m,
    "docker-compose.yml must not declare nginx service"
  );

  assert.doesNotMatch(
    composeText,
    /deploy\/nginx\/nginx\.conf/,
    "docker-compose.yml must not mount local nginx config"
  );
});
