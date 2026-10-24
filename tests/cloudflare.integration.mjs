import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";

test("Cloudflare runtime: D1 persistence, workflows, images, isolation and static assets", async () => {
  const mf = new Miniflare(convertV4MiniflareOptions({
    name: "apply-stewards-test",
    modules: true,
    scriptPath: fileURLToPath(new URL("../dist/worker/worker.js", import.meta.url)),
    compatibilityDate: "2026-10-01",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: ["DB"],
    bindings: { APPLY_ADMIN_TOKEN: "fictional-local-test", HISTORICAL_DATA_STATUS: "pending" },
    assets: {
      directory: fileURLToPath(new URL("../dist/public", import.meta.url)),
      binding: "ASSETS",
      routerConfig: { has_user_worker: true },
      run_worker_first: ["/", "/.netlify/functions/*"],
      assetConfig: { html_handling: "none", not_found_handling: "none" }
    }
  }));
  const call = (name, body, admin = false, extra = {}) => mf.dispatchFetch(`https://apply.test/.netlify/functions/${name}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(admin ? { "x-apply-admin-token": "fictional-local-test" } : {}), ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  try {
    const db = await mf.getD1Database("DB");
    const schema = (await readFile(new URL("../cloudflare/schema.sql", import.meta.url), "utf8")).replace(/--[^\n]*/g, "");
    for (const statement of schema.split(";").filter(s => s.trim())) await db.prepare(statement).run();
    for (const page of ["/", "/opportunities.html", "/submit.html", "/partners.html", "/help-desk.html", "/ops.html", "/desk.html", "/scout.html", "/planner.html"]) {
      const response = await mf.dispatchFetch(`https://apply.test${page}`);
      assert.equal(response.status, 200, `${page}: ${(await response.clone().text()).slice(0, 1600)}`);
      assert.match(await response.text(), /APPLY/);
    }
    for (const path of ["/assets/logo.png", "/assets/favicon.png", "/assets/site.js", "/shared/opportunity-utils.mjs"]) {
      assert.equal((await mf.dispatchFetch(`https://apply.test${path}`)).status, 200, path);
    }
    assert.equal((await mf.dispatchFetch("https://apply.test/netlify/lib/admin-auth.mjs")).status, 404);
    assert.equal((await call("list-opportunities")).status, 401);
    assert.equal((await call("rotate-opportunity-of-day")).status, 405);
    assert.equal((await call("rotate-opportunity-of-day", {})).status, 401);
    assert.equal((await call("save-opportunity", {}, true, { origin: "https://hostile.test" })).status, 403);
    assert.equal((await call("opportunity-of-day")).status, 200);
    const fixture = {
      title: "Fictional local fellowship", organization: "Example", category: "Fellowship",
      summary: "Local migration test only", sourceUrl: "https://example.org/apply", deadline: "2999-01-01",
      listingType: "verified", status: "published", steps: ["Read source"], tips: ["Check eligibility"]
    };
    const saved = await call("save-opportunity", { ...fixture, makeFeatured: true }, true);
    assert.equal(saved.status, 201);
    const { opportunity } = await saved.json();
    assert.equal((await (await call("opportunity-of-day")).json()).featuredOpportunity.id, opportunity.id);
    // Full 2 MiB image crosses four D1 chunks; every byte must survive.
    const image = Buffer.alloc(2 * 1024 * 1024, 117);
    const submitted = await call("submit-member-opportunity", {
      ...fixture, submittedByEmail: "private@example.org", imageName: "fixture.png",
      imageDataUrl: `data:image/png;base64,${image.toString("base64")}`
    });
    assert.equal(submitted.status, 201, await submitted.clone().text());
    const { opportunityId } = await submitted.json();
    const pending = (await (await call("list-opportunities", undefined, true)).json()).opportunities.find(record => record.id === opportunityId);
    assert.equal(pending.status, "pending_review");
    assert.equal(pending.listingType, "member_advertised");
    assert.deepEqual((await (await call("member-opportunities")).json()).opportunities, []);
    assert.equal((await call("update-opportunity-status", { opportunityId, status: "published" })).status, 401);
    assert.equal((await call("update-opportunity-status", { opportunityId, status: "published" }, true)).status, 200);
    const memberPayload = await (await call("member-opportunities")).json();
    assert.equal(memberPayload.historicalData, "pending");
    assert.equal(memberPayload.opportunities.length, 1);
    assert.equal(JSON.stringify(memberPayload).includes("private@example.org"), false);
    const imageResponse = await mf.dispatchFetch(`https://apply.test${memberPayload.opportunities[0].imageUrl}`);
    assert.equal(imageResponse.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await imageResponse.arrayBuffer()), image);
    assert.equal((await call("update-publishing-status", { opportunityId: opportunity.id, postStatus: "posted" }, true)).status, 200);
    assert.equal((await call("rotate-opportunity-of-day", {}, true)).status, 200);
    await call("update-opportunity-status", { opportunityId: opportunity.id, status: "draft" }, true);
    assert.equal((await (await call("opportunity-of-day")).json()).featuredOpportunity, null);
    // More than 50 records must not exhaust Workers Free's per-request queries.
    await db.batch(Array.from({ length: 65 }, (_, i) => db.prepare("INSERT INTO objects(store,key,value) VALUES(?,?,?)")
      .bind("apply-opportunities", `opportunities/fixture-${i}.json`, JSON.stringify({ ...fixture, id: `fixture-${i}`, listingType: "member_advertised" }))));
    assert.equal((await call("list-opportunities", undefined, true)).status, 200);
  } finally { await mf.dispose(); }
});
