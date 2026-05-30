import { getStore } from "@netlify/blobs";
import { buildApplystyle } from "../../shared/opportunity-utils.mjs";

const store = getStore("apply-opportunities");
const opportunityPrefix = "opportunities/";
const featuredKey = "featured/current";

const opportunityKey = (id) => `${opportunityPrefix}${id}.json`;

const toTimestamp = (value) => {
  const parsed = new Date(value ?? 0).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const sortByNewest = (items) =>
  [...items].sort((left, right) => {
    const rightTime = toTimestamp(right.updatedAt || right.createdAt);
    const leftTime = toTimestamp(left.updatedAt || left.createdAt);
    return rightTime - leftTime;
  });

const sortByFeaturedPriority = (items) =>
  [...items].sort((left, right) => {
    const leftLastFeatured = left.lastFeaturedAt ? toTimestamp(left.lastFeaturedAt) : -1;
    const rightLastFeatured = right.lastFeaturedAt ? toTimestamp(right.lastFeaturedAt) : -1;

    if (leftLastFeatured !== rightLastFeatured) {
      return leftLastFeatured - rightLastFeatured;
    }

    return toTimestamp(left.createdAt) - toTimestamp(right.createdAt);
  });

const publicOpportunityShape = (opportunity) => ({
  id: opportunity.id,
  title: opportunity.title,
  organization: opportunity.organization,
  listingType: opportunity.listingType,
  category: opportunity.category,
  audience: opportunity.audience,
  location: opportunity.location,
  deadline: opportunity.deadline,
  sourceUrl: opportunity.sourceUrl,
  summary: opportunity.summary,
  whyItFits: opportunity.whyItFits,
  steps: opportunity.steps,
  tips: opportunity.tips,
  tags: opportunity.tags,
  status: opportunity.status,
  createdAt: opportunity.createdAt,
  updatedAt: opportunity.updatedAt,
  publishedAt: opportunity.publishedAt,
  lastFeaturedAt: opportunity.lastFeaturedAt,
  applystyle: opportunity.applystyle,
  sourceLabel: opportunity.sourceLabel,
  sourceUpdatedAt: opportunity.sourceUpdatedAt,
  sourceCheckedAt: opportunity.sourceCheckedAt,
  verificationMethod: opportunity.verificationMethod
});

export const saveOpportunity = async (opportunity) => {
  const updatedAt = new Date().toISOString();
  const publishedAt =
    opportunity.status === "published"
      ? opportunity.publishedAt || updatedAt
      : opportunity.publishedAt || "";

  const record = {
    ...opportunity,
    updatedAt,
    publishedAt,
    applystyle: buildApplystyle(opportunity)
  };

  if (!record.createdAt) {
    record.createdAt = updatedAt;
  }

  await store.setJSON(opportunityKey(record.id), record, {
    metadata: {
      status: record.status,
      listingType: record.listingType,
      category: record.category,
      publishedAt: record.publishedAt || ""
    }
  });

  return record;
};

export const getOpportunity = async (id) => {
  if (!id) {
    return null;
  }

  return store.get(opportunityKey(id), { type: "json" });
};

export const listOpportunities = async () => {
  const { blobs } = await store.list({ prefix: opportunityPrefix });

  const records = await Promise.all(
    blobs.map(({ key }) => store.get(key, { type: "json" }))
  );

  return sortByNewest(records.filter(Boolean));
};

export const listPublishedOpportunities = async () => {
  const records = await listOpportunities();
  return records.filter((record) => record.status === "published");
};

export const listPublishedVerifiedOpportunities = async () => {
  const records = await listPublishedOpportunities();
  return records.filter((record) => record.listingType === "verified");
};

export const listPublishedMemberOpportunities = async () => {
  const records = await listPublishedOpportunities();
  return records.filter((record) => record.listingType === "member_advertised");
};

export const setFeaturedOpportunity = async (opportunity) => {
  const selectedAt = new Date().toISOString();
  const updatedOpportunity = await saveOpportunity({
    ...opportunity,
    lastFeaturedAt: selectedAt
  });

  const featuredRecord = {
    selectedAt,
    opportunityId: updatedOpportunity.id,
    opportunity: publicOpportunityShape(updatedOpportunity)
  };

  await store.setJSON(featuredKey, featuredRecord);

  return featuredRecord;
};

export const getFeaturedOpportunity = async () =>
  store.get(featuredKey, { type: "json" });

export const ensureFeaturedOpportunity = async () => {
  const current = await getFeaturedOpportunity();

  if (current?.opportunity) {
    return current;
  }

  const published = await listPublishedVerifiedOpportunities();

  if (published.length === 0) {
    return null;
  }

  return setFeaturedOpportunity(sortByFeaturedPriority(published)[0]);
};

export const rotateFeaturedOpportunity = async () => {
  const published = await listPublishedVerifiedOpportunities();

  if (published.length === 0) {
    return null;
  }

  const current = await getFeaturedOpportunity();
  const sorted = sortByFeaturedPriority(published);
  const next =
    sorted.find((record) => record.id !== current?.opportunityId) || sorted[0];

  return setFeaturedOpportunity(next);
};
