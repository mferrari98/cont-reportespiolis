const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const COMPOSE_FILE_PATH = path.resolve(__dirname, "../../docker-compose.yml");

function readComposeText() {
  return fs.readFileSync(COMPOSE_FILE_PATH, "utf8");
}

function readServiceBlock(serviceName) {
  const composeText = readComposeText();
  const servicesMatch = composeText.match(
    /(?:^|\n)services:\n([\s\S]*?)(?:\n[a-zA-Z_][\w-]*:\n|$)/m
  );

  assert.ok(servicesMatch, "docker-compose.yml must declare services");

  const servicesBlock = servicesMatch[1];
  const servicePattern = new RegExp(
    `^  ${serviceName}:\\n([\\s\\S]*?)(?=^  [a-zA-Z0-9_-]+:\\n|$)`,
    "m"
  );
  const serviceMatch = servicesBlock.match(servicePattern);

  assert.ok(serviceMatch, `service '${serviceName}' must exist`);
  return serviceMatch[1];
}

test("app service has no ports block", () => {
  const appBlock = readServiceBlock("app");

  assert.ok(
    !/^\s{4}ports:\n/m.test(appBlock),
    "app service must not expose ports"
  );
});

test("nginx service has 80:80 and depends_on app", () => {
  const nginxBlock = readServiceBlock("nginx");

  assert.match(
    nginxBlock,
    /^\s{4}ports:\n[\s\S]*?^\s{6}-\s*["']?80:80["']?\s*$/m,
    "nginx service must publish 80:80"
  );
  assert.match(
    nginxBlock,
    /^\s{4}depends_on:\n[\s\S]*?(?:^\s{6}-\s*app\s*$|^\s{6}app:\s*$)/m,
    "nginx service must depend on app"
  );
});

test("app mounts /mnt/compartido:ro and reportes_db volume path /app/src/basedatos", () => {
  const appBlock = readServiceBlock("app");

  assert.match(
    appBlock,
    /^\s{4}volumes:\n[\s\S]*?^\s{6}-\s*["']?\/mnt\/compartido:ro["']?\s*$/m,
    "app service must mount /mnt/compartido as read-only"
  );
  assert.match(
    appBlock,
    /^\s{4}volumes:\n[\s\S]*?^\s{6}-\s*["']?reportes_db:\/app\/src\/basedatos(?:[:\s"']|$)/m,
    "app service must mount reportes_db at /app/src/basedatos"
  );
});
