import { ensureFeaturedOpportunity } from "../lib/opportunities.mjs";
import { json } from "../lib/http.mjs";
import { syncTrustedOpportunities } from "../lib/trusted-sources.mjs";

export default async () => {
  let featured = await ensureFeaturedOpportunity();

  if (!featured) {
    await syncTrustedOpportunities();
    featured = await ensureFeaturedOpportunity();
  }

  return json({
    featuredOpportunity: featured?.opportunity || null,
    selectedAt: featured?.selectedAt || null
  });
};
