import { json } from "../lib/http.mjs";
import { rotateFeaturedOpportunity } from "../lib/opportunities.mjs";
import { syncTrustedOpportunities } from "../lib/trusted-sources.mjs";

export const config = {
  schedule: "0 6 * * *"
};

export default async () => {
  const syncResult = await syncTrustedOpportunities();
  const featured = await rotateFeaturedOpportunity();

  return json({
    message: featured
      ? "Opportunity of the day rotated."
      : "No published verified opportunities available to rotate.",
    featured,
    syncResult: {
      checkedAt: syncResult.checkedAt,
      importedCount: syncResult.importedCount,
      sourceResults: syncResult.sourceResults
    }
  });
};
