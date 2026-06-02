import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const host = "127.0.0.1";
const startPort = Number(process.env.PORT || 4300);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function safePath(urlPath) {
  const cleanPath = normalize(decodeURIComponent(urlPath.split("?")[0]))
    .replace(/^[/\\]+/, "")
    .replace(/^(\.\.[/\\])+/, "");
  if (cleanPath === "/" || cleanPath === ".") return join(root, "index.html");
  return join(root, cleanPath);
}

function createServer() {
  return http.createServer(async (request, response) => {
    try {
      const filePath = safePath(request.url || "/");
      const body = await readFile(filePath);
      response.writeHead(200, {
        "Content-Type": types[extname(filePath)] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      response.end(body);
    } catch {
      const body = await readFile(join(root, "index.html"));
      response.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(body);
    }
  });
}

function listen(port, attemptsLeft = 10) {
  const server = createServer();

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      server.close();
      listen(port + 1, attemptsLeft - 1);
      return;
    }
    throw error;
  });

  server.listen(port, host, () => {
    console.log(`Return Guardian running at http://${host}:${port}/`);
  });
}

listen(startPort);
