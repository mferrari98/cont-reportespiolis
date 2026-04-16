const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const NGINX_CONF_PATH = path.resolve(__dirname, "../../deploy/nginx/nginx.conf");

function readNginxConfigText() {
  return fs.readFileSync(NGINX_CONF_PATH, "utf8");
}

test("nginx config defines app_backend upstream with app:3000", () => {
  const nginxConfigText = readNginxConfigText();

  assert.match(
    nginxConfigText,
    /upstream\s+app_backend\s*\{[\s\S]*?server\s+app:3000;[\s\S]*?\}/,
    "nginx.conf must define upstream app_backend with server app:3000"
  );
});

test("nginx config proxies to app_backend and forwards required headers", () => {
  const nginxConfigText = readNginxConfigText();

  assert.match(
    nginxConfigText,
    /proxy_pass\s+http:\/\/app_backend;/,
    "nginx.conf must proxy requests to http://app_backend"
  );

  assert.match(
    nginxConfigText,
    /proxy_set_header\s+Host\s+\$host;/,
    "nginx.conf must set Host header"
  );
  assert.match(
    nginxConfigText,
    /proxy_set_header\s+X-Forwarded-For\s+\$proxy_add_x_forwarded_for;/,
    "nginx.conf must set X-Forwarded-For header"
  );
  assert.match(
    nginxConfigText,
    /proxy_set_header\s+X-Forwarded-Proto\s+\$scheme;/,
    "nginx.conf must set X-Forwarded-Proto header"
  );
});
