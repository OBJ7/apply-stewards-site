// Public eligibility is separate from human/source verification.
// A date-only deadline is inclusive through the Ghana/UTC day.
export const publicationEligibility = (record, now = new Date()) => {
  if (!record || record.status !== "published") return { eligible: false, reason: "not_published" };
  if (!["verified", "member_advertised"].includes(record.listingType)) return { eligible: false, reason: "unknown_listing_type" };
  const deadline = String(record.deadline || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    const parsed = new Date(`${deadline}T00:00:00Z`);
    if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== deadline) return { eligible: false, reason: "invalid_deadline" };
    if (now.getTime() >= parsed.getTime() + 86400000) return { eligible: false, reason: "expired" };
  } else if (deadline && !/^(rolling|not (stated|specified)(?:.*)?)$/i.test(deadline)) {
    return { eligible: false, reason: "deadline_needs_review" };
  }
  if (record.verificationMethod === "trusted_source_automation") {
    const checked = Date.parse(record.sourceCheckedAt || "");
    if (!Number.isFinite(checked) || checked > now.getTime() || now.getTime() - checked > 7 * 86400000) return { eligible: false, reason: "source_needs_recheck" };
  }
  return { eligible: true, reason: deadline ? "publication_eligible" : "deadline_unknown" };
};
export const canFeature = (record, now = new Date()) =>
  record?.listingType === "verified" && publicationEligibility(record, now).eligible;
