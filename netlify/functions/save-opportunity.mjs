import {
  normalizeOpportunityInput,
  validateOpportunityInput
} from "../../shared/opportunity-utils.mjs";
import { requireAdmin } from "../lib/admin-auth.mjs";
import { json, methodNotAllowed } from "../lib/http.mjs";
import { saveOpportunity, setFeaturedOpportunity } from "../lib/opportunities.mjs";

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

  const normalized = normalizeOpportunityInput(payload);
  const errors = validateOpportunityInput(normalized);

  if (errors.length > 0) {
    return json({ error: "Validation failed.", errors }, 400);
  }

  const opportunity = await saveOpportunity({
    id: crypto.randomUUID(),
    ...normalized,
    status:
      normalized.status === "draft" || normalized.status === "pending_review"
        ? normalized.status
        : "published",
    createdAt: new Date().toISOString()
  });

  const shouldFeatureNow = Boolean(
    payload.makeFeatured &&
      opportunity.status === "published" &&
      opportunity.listingType === "verified"
  );

  const featured = shouldFeatureNow
    ? await setFeaturedOpportunity(opportunity)
    : null;

  return json(
    {
      message: shouldFeatureNow
        ? "Opportunity saved and featured."
        : "Opportunity saved.",
      opportunity,
      featured
    },
    201
  );
};
