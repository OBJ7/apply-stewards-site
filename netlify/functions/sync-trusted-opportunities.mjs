import { requireAdmin } from "../lib/admin-auth.mjs";
import { json, methodNotAllowed } from "../lib/http.mjs";
import { syncTrustedOpportunities } from "../lib/trusted-sources.mjs";

export default async (request) => {
  if (request.method !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  const auth = requireAdmin(request);

  if (!auth.ok) {
    return auth.response;
  }

  let payload = {};

  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const result = await syncTrustedOpportunities({
    featureTopResult: Boolean(payload.featureTopResult)
  });

  return json({
    message:
      result.importedCount > 0
        ? "Trusted sources synced."
        : "Trusted sources checked, but nothing new matched the current APPLY! scope.",
    checkedAt: result.checkedAt,
    importedCount: result.importedCount,
    sourceResults: result.sourceResults,
    featuredOpportunityId: result.featured?.opportunityId || null
  });
};
