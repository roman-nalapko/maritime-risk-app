import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");
const port = Number(process.env.PORT || 4173);
const url = `http://127.0.0.1:${port}`;
const shouldOpen = process.argv.includes("--open") && !process.argv.includes("--no-open");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json; charset=utf-8", ".svg": "image/svg+xml" };

function openBrowser(targetUrl) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", targetUrl] : [targetUrl];
  const opener = spawn(command, args, { detached: true, stdio: "ignore" });
  opener.once("error", () => {
    console.log(`Browser did not open automatically. Open ${targetUrl}`);
  });
  opener.unref();
}

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filename = path.resolve(root, relative);
  if (!filename.startsWith(`${root}${path.sep}`) && filename !== path.join(root, "index.html")) {
    response.writeHead(403).end("Forbidden"); return;
  }
  try {
    const info = await stat(filename);
    if (!info.isFile()) throw new Error("Not a file");
    response.writeHead(200, { "Content-Type": types[path.extname(filename)] || "application/octet-stream", "Cache-Control": "no-store" });
    createReadStream(filename).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`SeaRisk UA preview: ${url}`);
  if (shouldOpen) openBrowser(url);
});

