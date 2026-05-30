import { normalizeOpportunityInput } from "../../shared/opportunity-utils.mjs";
import { json, methodNotAllowed } from "../lib/http.mjs";
import { saveOpportunity } from "../lib/opportunities.mjs";

export default async (request) => {
  if (request.method !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const normalized = normalizeOpportunityInput({
    ...payload,
    listingType: "member_advertised",
    status: "pending_review"
  });

  const errors = [];

  if (!normalized.title) {
    errors.push("Title is required.");
  }

  if (!normalized.organization) {
    errors.push("Organization is required.");
  }

  if (!normalized.sourceUrl) {
    errors.push("Source URL is required.");
  }

  if (!normalized.summary) {
    errors.push("A short summary is required.");
  }

  if (normalized.sourceUrl) {
    try {
      new URL(normalized.sourceUrl);
    } catch {
      errors.push("Source URL must be a valid URL.");
    }
  }

  if (normalized.submittedByEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.submittedByEmail)) {
    errors.push("Submitter email must be a valid email address.");
  }

  if (errors.length > 0) {
    return json({ error: "Validation failed.", errors }, 400);
  }

  const opportunity = await saveOpportunity({
    id: crypto.randomUUID(),
    ...normalized,
    category: normalized.category || "Other",
    steps:
      normalized.steps.length > 0
        ? normalized.steps
        : ["Open the source link and review the listing carefully."],
    tips:
      normalized.tips.length > 0
        ? normalized.tips
        : ["Please verify all details independently before applying."],
    createdAt: new Date().toISOString()
  });

  return json(
    {
      message: "Member opportunity submitted for review.",
      opportunityId: opportunity.id
    },
    201
  );
};
