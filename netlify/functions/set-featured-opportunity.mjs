import { requireAdmin } from "../lib/admin-auth.mjs";
import { json, methodNotAllowed } from "../lib/http.mjs";
import { getOpportunity, setFeaturedOpportunity } from "../lib/opportunities.mjs";

export default async (request) => {
  if (request.method !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  const auth = requireAdmin(request);

  if (!auth.ok) {
    return auth.response;
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const opportunityId = String(payload.opportunityId ?? "").trim();

  if (!opportunityId) {
    return json({ error: "opportunityId is required." }, 400);
  }

  const opportunity = await getOpportunity(opportunityId);

  if (!opportunity) {
    return json({ error: "Opportunity not found." }, 404);
  }

  if (opportunity.status !== "published" || opportunity.listingType !== "verified") {
    return json(
      { error: "Only published verified opportunities can be featured." },
      400
    );
  }

  const featured = await setFeaturedOpportunity(opportunity);

  return json({
    message: "Featured opportunity updated.",
    featured
  });
};
