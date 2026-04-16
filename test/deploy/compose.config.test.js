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

function getServiceKeyBlocks(serviceBlock) {
  const lines = serviceBlock.split(/\r?\n/);
  const nonEmptyLines = lines.filter((line) => line.trim() !== "");

  assert.ok(nonEmptyLines.length > 0, "service block must not be empty");

  const keyIndent = Math.min(
    ...nonEmptyLines.map((line) => line.match(/^ */)[0].length)
  );
  const keyLinePattern = new RegExp(`^ {${keyIndent}}([a-zA-Z_][\\w-]*):(.*)$`);

  const keyBlocks = new Map();
  let currentKey = null;
  let currentLines = [];

  function flushCurrentBlock() {
    if (!currentKey) {
      return;
    }
    keyBlocks.set(currentKey, currentLines.join("\n"));
  }

  for (const line of lines) {
    const keyMatch = line.match(keyLinePattern);

    if (keyMatch) {
      flushCurrentBlock();
      currentKey = keyMatch[1];
      currentLines = [line];
      continue;
    }

    if (currentKey) {
      currentLines.push(line);
    }
  }

  flushCurrentBlock();
  return keyBlocks;
}

function readServiceKeyBlock(serviceBlock, keyName) {
  return getServiceKeyBlocks(serviceBlock).get(keyName);
}

function readKeyInlineValue(keyBlock) {
  const firstLine = keyBlock.split(/\r?\n/, 1)[0];
  const inlineValue = firstLine.replace(/^[^:]+:\s*/, "").trim();
  return inlineValue;
}

function unquoteYamlScalar(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function readKeyScalarItems(keyBlock) {
  const items = [];
  const inlineValue = readKeyInlineValue(keyBlock);

  if (inlineValue !== "") {
    if (inlineValue.startsWith("[") && inlineValue.endsWith("]")) {
      const inlineItems = inlineValue
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item !== "")
        .map(unquoteYamlScalar);
      items.push(...inlineItems);
    } else {
      items.push(unquoteYamlScalar(inlineValue));
    }
  }

  const listItemMatches = keyBlock.matchAll(/^\s*-\s*(.+?)\s*$/gm);
  for (const listItemMatch of listItemMatches) {
    items.push(unquoteYamlScalar(listItemMatch[1]));
  }

  return items;
}

test("app service has no ports block", () => {
  const appBlock = readServiceBlock("app");

  assert.equal(
    readServiceKeyBlock(appBlock, "ports"),
    undefined,
    "app service must not expose ports"
  );
});

test("nginx service has 80:80 and depends_on app", () => {
  const nginxBlock = readServiceBlock("nginx");
  const nginxPortsBlock = readServiceKeyBlock(nginxBlock, "ports");
  const nginxDependsOnBlock = readServiceKeyBlock(nginxBlock, "depends_on");

  assert.ok(nginxPortsBlock, "nginx service must declare ports");
  assert.ok(nginxDependsOnBlock, "nginx service must declare depends_on");

  assert.ok(
    readKeyScalarItems(nginxPortsBlock).includes("80:80"),
    "nginx service must publish 80:80"
  );
  assert.match(
    nginxDependsOnBlock,
    /^\s*(?:-\s*app|app:)\s*$/m,
    "nginx service must depend on app"
  );
});

test("app mounts /mnt/compartido:ro and reportes_db volume path /app/src/basedatos", () => {
  const appBlock = readServiceBlock("app");
  const appVolumesBlock = readServiceKeyBlock(appBlock, "volumes");

  assert.ok(appVolumesBlock, "app service must declare volumes");

  const appVolumeItems = readKeyScalarItems(appVolumesBlock);

  assert.ok(
    appVolumeItems.includes("/mnt/compartido:ro"),
    "app service must mount /mnt/compartido as read-only"
  );

  assert.ok(
    appVolumeItems.some((item) => item.startsWith("reportes_db:/app/src/basedatos")),
    "app service must mount reportes_db at /app/src/basedatos"
  );
});
