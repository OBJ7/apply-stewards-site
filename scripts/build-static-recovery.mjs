import "./build-cloudflare.mjs";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
const target = new URL("../dist/static-recovery/", import.meta.url);
await cp(new URL("../dist/public/", import.meta.url), target, { recursive: true });
await mkdir(new URL("recovery/", target), { recursive: true });
for (const [name, payload] of Object.entries({
  "opportunity-of-day": { featuredOpportunity: null, selectedAt: null, historicalData: "pending" },
  "member-opportunities": { opportunities: [], historicalData: "pending" }
})) await writeFile(new URL(`recovery/${name}.json`, target), JSON.stringify(payload));
const script = await readFile(new URL("assets/site.js", target), "utf8");
await writeFile(new URL("assets/site.js", target), script
  .replace("Historical listings have not yet been recovered. New submissions can be shared for review using the form below.", "Historical listings are being restored and online submissions are temporarily paused. Visit the APPLY! WhatsApp channel for current posts.")
  .replaceAll("/.netlify/functions/opportunity-of-day", "/recovery/opportunity-of-day.json")
  .replaceAll("/.netlify/functions/member-opportunities", "/recovery/member-opportunities.json"));
const page = new URL("submit.html", target);
const html = await readFile(page, "utf8");
await writeFile(page, html.replace('<form id="member-submit-form" class="grid">',
  '<p role="status" style="padding:18px;border:1px solid #ddd;border-radius:12px">Online submissions are temporarily paused while opportunity services are restored. Please contact <a href="mailto:hello@applystewards.org">hello@applystewards.org</a> or visit the APPLY! WhatsApp channel.</p><form id="member-submit-form" class="grid"><fieldset disabled style="display:contents">')
  .replace("</form>", "</fieldset></form>"));
console.log("Static recovery prepared with explicit archive and submission notices.");
