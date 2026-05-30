import { requireAdmin } from "../lib/admin-auth.mjs";
import { json, methodNotAllowed } from "../lib/http.mjs";
import { getOpportunity, saveOpportunity } from "../lib/opportunities.mjs";

const allowedPostStatuses = ["needs_review", "ready", "scheduled", "posted", "skipped"];

const cleanText = (value = "") => String(value ?? "").trim();

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

  const opportunityId = cleanText(payload.opportunityId);
  const postStatus = cleanText(payload.postStatus);

  if (!opportunityId) {
    return json({ error: "opportunityId is required." }, 400);
  }

  if (postStatus && !allowedPostStatuses.includes(postStatus)) {
    return json({ error: "Unsupported post status." }, 400);
  }

  const opportunity = await getOpportunity(opportunityId);

  if (!opportunity) {
    return json({ error: "Opportunity not found." }, 404);
  }

  const now = new Date().toISOString();
  const defaultStatus = opportunity.status === "published" ? "ready" : "needs_review";
  const nextStatus = postStatus || opportunity.postStatus || defaultStatus;
  const statusWasProvided = Boolean(postStatus);
  const postedAt =
    nextStatus === "posted"
      ? cleanText(payload.postedAt) || opportunity.postedAt || now
      : statusWasProvided
        ? ""
        : opportunity.postedAt || "";
  const skippedAt =
    nextStatus === "skipped"
      ? cleanText(payload.skippedAt) || opportunity.skippedAt || now
      : statusWasProvided
        ? ""
        : opportunity.skippedAt || "";

  const updated = await saveOpportunity({
    ...opportunity,
    postStatus: nextStatus,
    plannedPostAt: "plannedPostAt" in payload ? cleanText(payload.plannedPostAt) : opportunity.plannedPostAt || "",
    reminderAt: "reminderAt" in payload ? cleanText(payload.reminderAt) : opportunity.reminderAt || "",
    postNotes: "postNotes" in payload ? cleanText(payload.postNotes) : opportunity.postNotes || "",
    postedBy: "postedBy" in payload ? cleanText(payload.postedBy) : opportunity.postedBy || "",
    postedAt,
    skippedAt,
    reminderPostedAt:
      payload.markReminderPosted
        ? now
        : "reminderPostedAt" in payload
          ? cleanText(payload.reminderPostedAt)
          : opportunity.reminderPostedAt || ""
  });

  return json({
    message: "Publishing status updated.",
    opportunity: updated
  });
};
