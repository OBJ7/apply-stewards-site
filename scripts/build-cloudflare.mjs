import { cp, mkdir, readdir, writeFile } from "node:fs/promises";
const output = new URL("../dist/public/", import.meta.url);
await mkdir(output, { recursive: true });
for (const file of await readdir(new URL("../", import.meta.url))) {
  if (file.endsWith(".html")) await cp(new URL(`../${file}`, import.meta.url), new URL(file, output));
}
for (const directory of ["assets", "shared"]) {
  await cp(new URL(`../${directory}/`, import.meta.url), new URL(`${directory}/`, output), { recursive: true, filter: (source) => !source.endsWith("runtime-context.mjs") });
}
await writeFile(new URL("_redirects", output), "https://www.applystewards.org/* https://applystewards.org/:splat 301\n");
await writeFile(new URL("_headers", output), "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/ops.html\n  X-Robots-Tag: noindex, nofollow\n/desk.html\n  X-Robots-Tag: noindex, nofollow\n/scout.html\n  X-Robots-Tag: noindex, nofollow\n");
console.log("Cloudflare static assets prepared in dist/public (source, tests and secrets excluded).");
