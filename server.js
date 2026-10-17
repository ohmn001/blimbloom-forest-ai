// ============================================================================
// BlimBlom — Local Development Server (Zero Dependencies)
// Serves the public/ directory cleanly on port 3000 (or PORT env var).
// Also handles /public/... paths gracefully so no path ever 404s by accident.
// ============================================================================

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav"
};

const server = http.createServer((req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // Strip leading /public if someone navigates to /public/...
    if (pathname === "/public" || pathname === "/public/") {
      pathname = "/index.html";
    } else if (pathname.startsWith("/public/")) {
      pathname = pathname.slice("/public".length);
    }

    if (pathname === "/" || pathname === "") {
      pathname = "/index.html";
    }

    // Prevent directory traversal
    const safeRelPath = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "");
    let filePath = path.join(PUBLIC_DIR, safeRelPath);

    // If path is a directory, serve index.html inside it
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`404 Not Found: ${pathname}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache"
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`500 Internal Server Error: ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`BlimBlom local server running at http://localhost:${PORT}`);
});
