import { requireAdmin } from "../lib/admin-auth.mjs";
import { json, methodNotAllowed } from "../lib/http.mjs";
import { getOpportunity, saveOpportunity } from "../lib/opportunities.mjs";

const allowedStatuses = ["draft", "pending_review", "published"];
const allowedListingTypes = ["verified", "member_advertised"];

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
  const nextStatus = String(payload.status ?? "").trim();
  const nextListingType = String(payload.listingType ?? "").trim();

  if (!opportunityId) {
    return json({ error: "opportunityId is required." }, 400);
  }

  const opportunity = await getOpportunity(opportunityId);

  if (!opportunity) {
    return json({ error: "Opportunity not found." }, 404);
  }

  const status = allowedStatuses.includes(nextStatus) ? nextStatus : opportunity.status;
  const listingType = allowedListingTypes.includes(nextListingType)
    ? nextListingType
    : opportunity.listingType;

  const updated = await saveOpportunity({
    ...opportunity,
    status,
    listingType
  });

  return json({
    message: "Opportunity updated.",
    opportunity: updated
  });
};
