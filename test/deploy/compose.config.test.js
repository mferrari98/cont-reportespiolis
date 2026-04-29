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
    /(?:^|\n)services:\n([\s\S]*?)(?:\n[a-zA-Z_][\w-]*:\n|$)/
  );

  assert.ok(servicesMatch, "docker-compose.yml must declare services");

  const servicesBlock = servicesMatch[1];
  const servicePattern = new RegExp(
    `^  ${serviceName}:\\n([\\s\\S]*?)(?=^  [a-zA-Z0-9_-]+:\\n|(?![\\s\\S]))`,
    "m"
  );
  const serviceMatch = servicesBlock.match(servicePattern);

  assert.ok(serviceMatch, `service '${serviceName}' must exist`);
  return serviceMatch[1];
}

function readTopLevelKeyBlock(keyName) {
  const composeText = readComposeText();
  const keyPattern = new RegExp(
    `(?:^|\\n)${keyName}:\\n([\\s\\S]*?)(?=\\n[a-zA-Z_][\\w-]*:\\n|$)`
  );
  const keyMatch = composeText.match(keyPattern);

  assert.ok(keyMatch, `docker-compose.yml must declare top-level key '${keyName}'`);
  return keyMatch[1];
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

test("compose declares only app service", () => {
  const composeText = readComposeText();
  const servicesMatch = composeText.match(
    /(?:^|\n)services:\n([\s\S]*?)(?:\n[a-zA-Z_][\w-]*:\n|$)/
  );

  assert.ok(servicesMatch, "docker-compose.yml must declare services");

  const serviceNames = [...servicesMatch[1].matchAll(/^  ([a-zA-Z0-9_-]+):$/gm)].map(
    (match) => match[1]
  );

  assert.deepEqual(serviceNames, ["app"], "services must include only app");
});

test("app service is private to the host loopback", () => {
  const appBlock = readServiceBlock("app");
  const appPortsBlock = readServiceKeyBlock(appBlock, "ports");

  assert.ok(appPortsBlock, "app service must declare ports");
  assert.deepEqual(
    readKeyScalarItems(appPortsBlock),
    ["127.0.0.1:3001:3000"],
    "app service must publish only on host loopback port 3001"
  );

  assert.equal(
    readServiceKeyBlock(appBlock, "networks"),
    undefined,
    "app service must not require a shared Docker network"
  );
});

test("app service uses expected runtime configuration", () => {
  const appBlock = readServiceBlock("app");
  const appBuildBlock = readServiceKeyBlock(appBlock, "build");
  const appEnvFileBlock = readServiceKeyBlock(appBlock, "env_file");

  assert.ok(appBuildBlock, "app service must declare build");
  assert.match(appBuildBlock, /^\s*dockerfile:\s*Dockerfile\s*$/m);

  const appContainerName = readServiceKeyBlock(appBlock, "container_name");
  assert.ok(appContainerName, "app service must declare container_name");
  assert.equal(
    readKeyInlineValue(appContainerName),
    "reportespiolis",
    "app service must use expected container_name"
  );

  const appImage = readServiceKeyBlock(appBlock, "image");
  assert.ok(appImage, "app service must declare image");
  assert.equal(
    readKeyInlineValue(appImage),
    "cont-reportespiolis",
    "app service must use expected image name"
  );

  assert.ok(appEnvFileBlock, "app service must declare env_file");
  assert.deepEqual(readKeyScalarItems(appEnvFileBlock), [".env"]);
});

test("app mounts /mnt/compartido with explicit readonly target and reportes_db volume path /app/src/basedatos", () => {
  const appBlock = readServiceBlock("app");
  const appVolumesBlock = readServiceKeyBlock(appBlock, "volumes");

  assert.ok(appVolumesBlock, "app service must declare volumes");

  const appVolumeItems = readKeyScalarItems(appVolumesBlock);

  assert.ok(
    appVolumeItems.includes("/mnt/compartido:/mnt/compartido:ro"),
    "app service must mount /mnt/compartido as read-only with explicit target"
  );

  assert.ok(
    appVolumeItems.some((item) => item.startsWith("reportes_db:/app/src/basedatos")),
    "app service must mount reportes_db at /app/src/basedatos"
  );
});

test("reportes_db is declared as a named volume", () => {
  const volumesBlock = readTopLevelKeyBlock("volumes");
  const reportesDbMatch = volumesBlock.match(
    /(?:^|\n)\s{2}reportes_db:\s*(?:\n|$)/
  );

  assert.ok(reportesDbMatch, "volumes must declare reportes_db");
});
