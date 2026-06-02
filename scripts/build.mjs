import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp("index.html", "dist/index.html");
await cp("manifest.webmanifest", "dist/manifest.webmanifest");
await cp("src", "dist/src", { recursive: true });
await cp("docs", "dist/docs", { recursive: true });
await cp("README.md", "dist/README.md");
await cp("LICENSE", "dist/LICENSE");

console.log("Static build written to dist/");
