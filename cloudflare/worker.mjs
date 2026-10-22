import { withRuntimeEnv } from "../shared/runtime-context.mjs";
import { requireAdmin } from "../netlify/lib/admin-auth.mjs";
import { json } from "../netlify/lib/http.mjs";
import { ensureFeaturedOpportunity, rotateFeaturedOpportunity } from "../netlify/lib/opportunities.mjs";
import list from "../netlify/functions/list-opportunities.mjs";
import members from "../netlify/functions/member-opportunities.mjs";
import image from "../netlify/functions/opportunity-image.mjs";
import save from "../netlify/functions/save-opportunity.mjs";
import submit from "../netlify/functions/submit-member-opportunity.mjs";
import status from "../netlify/functions/update-opportunity-status.mjs";
import publishing from "../netlify/functions/update-publishing-status.mjs";
import feature from "../netlify/functions/set-featured-opportunity.mjs";
import sync from "../netlify/functions/sync-trusted-opportunities.mjs";

const handlers = {
  "list-opportunities": list,
  "member-opportunities": members,
  "opportunity-image": image,
  "save-opportunity": save,
  "submit-member-opportunity": submit,
  "update-opportunity-status": status,
  "update-publishing-status": publishing,
  "set-featured-opportunity": feature,
  "sync-trusted-opportunities": sync,
  "opportunity-of-day": async (request) => {
    if (request.method !== "GET") return json({ error: "Use GET." }, 405);
    // Reads never launch feed imports. That work belongs to protected ops.
    const featured = await ensureFeaturedOpportunity();
    return json({ featuredOpportunity: featured?.opportunity || null, selectedAt: featured?.selectedAt || null });
  },
  "rotate-opportunity-of-day": async (request) => {
    if (request.method !== "POST") return json({ error: "Use POST." }, 405);
    const auth = requireAdmin(request);
    return auth.ok ? json({ featured: await rotateFeaturedOpportunity() }) : auth.response;
  }
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const prefix = "/.netlify/functions/";
    if (url.pathname === "/") {
      url.pathname = "/index.html";
      return env.ASSETS.fetch(new Request(url, request));
    }
    if (!url.pathname.startsWith(prefix)) return env.ASSETS.fetch(request);
    const name = url.pathname.slice(prefix.length);
    if (name === "recovery-status") return json({ historicalData: env.HISTORICAL_DATA_STATUS || "pending", storageReady: Boolean(env.DB) });
    const handler = handlers[name];
    if (!handler) return json({ error: "Endpoint not found." }, 404);
    if (!env.DB) return json({ error: "Opportunity services are being restored. Please use the APPLY! WhatsApp channel for current listings." }, 503);
    if (request.method === "POST") {
      if (Number(request.headers.get("content-length") || 0) > 3 * 1024 * 1024) return json({ error: "Request is too large." }, 413);
      const origin = request.headers.get("origin");
      if (origin && origin !== url.origin) return json({ error: "Cross-origin writes are not allowed." }, 403);
    }
    return withRuntimeEnv(env, async () => {
      try {
        const response = await handler(request);
        if (response.ok && ["opportunity-of-day", "member-opportunities"].includes(name)) {
          return json({ ...await response.json(), historicalData: env.HISTORICAL_DATA_STATUS || "pending" });
        }
        return response;
      }
      catch { return json({ error: "Opportunity services are temporarily unavailable. Please try again later." }, 503); }
    });
  },
  async scheduled(_event, env, ctx) {
    if (!env.DB) return;
    // Daily rotation is retained; official-feed imports remain an explicit
    // protected action until source completeness and recovered data are checked.
    ctx.waitUntil(withRuntimeEnv(env, () => rotateFeaturedOpportunity()));
  }
};
