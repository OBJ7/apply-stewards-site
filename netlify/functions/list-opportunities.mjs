import { requireAdmin } from "../lib/admin-auth.mjs";
import { json, methodNotAllowed } from "../lib/http.mjs";
import { listOpportunities, getFeaturedOpportunity } from "../lib/opportunities.mjs";

export default async (request) => {
  if (request.method !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  const auth = requireAdmin(request);

  if (!auth.ok) {
    return auth.response;
  }

  const [opportunities, featured] = await Promise.all([
    listOpportunities(),
    getFeaturedOpportunity()
  ]);

  return json({
    opportunities,
    featuredOpportunityId: featured?.opportunityId || null
  });
};
