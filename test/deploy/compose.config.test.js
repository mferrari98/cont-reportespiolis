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

test("app service is private and wired to external edge network", () => {
  const appBlock = readServiceBlock("app");
  const appNetworksBlock = readServiceKeyBlock(appBlock, "networks");

  assert.equal(
    readServiceKeyBlock(appBlock, "ports"),
    undefined,
    "app service must not expose ports"
  );

  assert.ok(appNetworksBlock, "app service must declare networks");
  assert.ok(
    readKeyScalarItems(appNetworksBlock).includes("edge_net"),
    "app service must attach to edge_net"
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
    "cont-reportespiolis",
    "app service must use expected container_name"
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

test("edge_net is declared as external network", () => {
  const networksBlock = readTopLevelKeyBlock("networks");
  const edgeNetMatch = networksBlock.match(
    /(?:^|\n)\s{2}edge_net:\n([\s\S]*?)(?=\n\s{2}[a-zA-Z0-9_-]+:\n|$)/
  );

  assert.ok(edgeNetMatch, "networks must declare edge_net");
  assert.match(
    edgeNetMatch[1],
    /^\s*external:\s*true\s*$/m,
    "edge_net must be an external network"
  );
});
