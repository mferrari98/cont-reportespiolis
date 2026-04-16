const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const NGINX_CONF_PATH = path.resolve(__dirname, "../../deploy/nginx/nginx.conf");

function readNginxConfigText() {
  return fs.readFileSync(NGINX_CONF_PATH, "utf8");
}

function extractBlock(configText, blockStartRegex, blockDescription) {
  const blockStartMatch = blockStartRegex.exec(configText);

  assert.ok(blockStartMatch, `nginx.conf must define ${blockDescription}`);

  const blockStartIndex = blockStartMatch.index;
  const firstBraceIndex = configText.indexOf("{", blockStartIndex);
  assert.notStrictEqual(
    firstBraceIndex,
    -1,
    `nginx.conf ${blockDescription} must open with '{'`
  );

  let depth = 0;
  for (let i = firstBraceIndex; i < configText.length; i += 1) {
    const char = configText[i];

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return configText.slice(blockStartIndex, i + 1);
      }
    }
  }

  assert.fail(`nginx.conf ${blockDescription} block must be balanced`);
}

test("nginx config defines app_backend upstream with app:3000", () => {
  const nginxConfigText = readNginxConfigText();
  const upstreamBlock = extractBlock(
    nginxConfigText,
    /upstream\s+app_backend\s*\{/,
    "upstream app_backend block"
  );

  assert.match(
    upstreamBlock,
    /server\s+app:3000;/,
    "nginx.conf must define upstream app_backend with server app:3000"
  );
});

test("nginx config proxies to app_backend and forwards required headers", () => {
  const nginxConfigText = readNginxConfigText();
  const serverBlock = extractBlock(nginxConfigText, /server\s*\{/, "server block");
  const rootLocationBlock = extractBlock(
    serverBlock,
    /location\s+\/\s*\{/,
    "location / block"
  );

  assert.match(
    rootLocationBlock,
    /proxy_pass\s+http:\/\/app_backend;/,
    "nginx.conf must proxy requests to http://app_backend"
  );

  assert.match(
    rootLocationBlock,
    /proxy_set_header\s+Host\s+\$host;/,
    "nginx.conf must set Host header"
  );
  assert.match(
    rootLocationBlock,
    /proxy_set_header\s+X-Forwarded-For\s+\$proxy_add_x_forwarded_for;/,
    "nginx.conf must set X-Forwarded-For header"
  );
  assert.match(
    rootLocationBlock,
    /proxy_set_header\s+X-Forwarded-Proto\s+\$scheme;/,
    "nginx.conf must set X-Forwarded-Proto header"
  );
  assert.match(
    rootLocationBlock,
    /proxy_http_version\s+1\.1;/,
    "nginx.conf must use HTTP/1.1 for proxied requests"
  );
  assert.match(
    rootLocationBlock,
    /proxy_connect_timeout\s+10s;/,
    "nginx.conf must define proxy connect timeout"
  );
  assert.match(
    rootLocationBlock,
    /proxy_send_timeout\s+60s;/,
    "nginx.conf must define proxy send timeout"
  );
  assert.match(
    rootLocationBlock,
    /proxy_read_timeout\s+60s;/,
    "nginx.conf must define proxy read timeout"
  );
});
