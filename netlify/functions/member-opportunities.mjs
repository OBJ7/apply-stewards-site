import { json } from "../lib/http.mjs";
import { listPublishedMemberOpportunities } from "../lib/opportunities.mjs";

export default async () => {
  const opportunities = await listPublishedMemberOpportunities();

  return json({
    opportunities: opportunities.slice(0, 6).map((opportunity) => ({
      id: opportunity.id,
      title: opportunity.title,
      organization: opportunity.organization,
      category: opportunity.category,
      audience: opportunity.audience,
      location: opportunity.location,
      deadline: opportunity.deadline,
      sourceUrl: opportunity.sourceUrl,
      summary: opportunity.summary,
      imageUrl: opportunity.imageKey
        ? `/.netlify/functions/opportunity-image?key=${encodeURIComponent(opportunity.imageKey)}`
        : "",
      imageAltText: opportunity.imageAltText,
      tags: opportunity.tags
    }))
  });
};
