#!/usr/bin/env node
// FuelPro Standalone Server - Bundles all web files into single executable
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".wasm": "application/wasm",
};

// Find the dist directory (bundled or adjacent)
function findDistDir() {
  // When bundled with pkg, __dirname is inside the snapshot
  // We need to check multiple locations
  const candidates = [
    path.join(__dirname, "dist"), // pkg snapshot
    path.join(__dirname, "..", "dist"), // sibling to exe
    path.join(process.cwd(), "dist"), // cwd
    path.join(path.dirname(process.execPath), "dist"), // same dir as exe
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) {
      console.log("Found dist at:", dir);
      return dir;
    }
  }
  throw new Error(
    "dist/index.html not found. Searched: " + candidates.join(", ")
  );
}

const DIST_DIR = findDistDir();

const server = http.createServer((req, res) => {
  let filePath = path.join(
    DIST_DIR,
    req.url === "/" ? "index.html" : decodeURIComponent(req.url)
  );
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback - serve index.html for all routes
      fs.readFile(path.join(DIST_DIR, "index.html"), (err2, data2) => {
        if (err2) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not Found: " + req.url);
        } else {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(data2);
        }
      });
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    }
  });
});

server.listen(0, "127.0.0.1", () => {
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}`;

  console.log("");
  console.log("╔══════════════════════════════════════════╗");
  console.log("║        FuelPro v1.0.0 - Starting       ║");
  console.log("╠══════════════════════════════════════════╣");
  console.log("║  Opening in your default browser...      ║");
  console.log("║                                          ║");
  console.log("║  Server: " + url.padEnd(35) + "║");
  console.log("║  Status: Online                          ║");
  console.log("║  Data:   Stored locally                  ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log("");

  const platform = os.platform();
  let cmd;
  if (platform === "win32") {
    cmd = `start "" "${url}"`;
  } else if (platform === "darwin") {
    cmd = `open "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }
  require("child_process").exec(cmd, err => {
    if (err) console.log("Please open this URL manually:", url);
  });

  console.log("Press Ctrl+C to stop the server");
  console.log("");
});

// Keep the process alive
process.on("SIGINT", () => {
  console.log("\nShutting down FuelPro...");
  server.close(() => process.exit(0));
});
