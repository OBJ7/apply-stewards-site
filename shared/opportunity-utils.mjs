export const categoryOptions = [
  "Scholarship",
  "Internship",
  "Entry-Level Job",
  "Graduate Program",
  "National Service",
  "Skill Training",
  "Fellowship",
  "Event",
  "Bootcamp",
  "Other"
];

export const listingTypeOptions = [
  {
    value: "verified",
    label: "Verified by APPLY! Stewards"
  },
  {
    value: "member_advertised",
    label: "Member advertised"
  }
];

const cleanText = (value = "") => String(value ?? "").trim();

export const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean);
  }

  return cleanText(value)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
};

export const formatDeadline = (value) => {
  const deadline = cleanText(value);

  if (!deadline) {
    return "Rolling / not stated";
  }

  const parsed = new Date(deadline);

  if (Number.isNaN(parsed.getTime())) {
    return deadline;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(parsed);
};

export const normalizeOpportunityInput = (input = {}) => ({
  title: cleanText(input.title),
  organization: cleanText(input.organization),
  listingType: cleanText(input.listingType) || "verified",
  submittedByName: cleanText(input.submittedByName),
  submittedByEmail: cleanText(input.submittedByEmail),
  category: cleanText(input.category),
  audience: cleanText(input.audience),
  location: cleanText(input.location),
  deadline: cleanText(input.deadline),
  sourceUrl: cleanText(input.sourceUrl),
  summary: cleanText(input.summary),
  whyItFits: cleanText(input.whyItFits),
  verificationNotes: cleanText(input.verificationNotes),
  rawNotes: cleanText(input.rawNotes),
  status: cleanText(input.status) || "published",
  steps: normalizeList(input.steps),
  tips: normalizeList(input.tips),
  tags: normalizeList(input.tags)
});

export const validateOpportunityInput = (opportunity) => {
  const errors = [];

  if (!["verified", "member_advertised"].includes(opportunity.listingType)) {
    errors.push("Listing type must be verified or member advertised.");
  }

  if (!opportunity.title) {
    errors.push("Title is required.");
  }

  if (!opportunity.organization) {
    errors.push("Organization is required.");
  }

  if (!opportunity.category) {
    errors.push("Category is required.");
  }

  if (!opportunity.summary) {
    errors.push("A short summary is required.");
  }

  if (!opportunity.sourceUrl) {
    errors.push("Source URL is required.");
  }

  if (opportunity.sourceUrl) {
    try {
      new URL(opportunity.sourceUrl);
    } catch {
      errors.push("Source URL must be a valid URL.");
    }
  }

  if (opportunity.submittedByEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(opportunity.submittedByEmail)) {
    errors.push("Submitter email must be a valid email address.");
  }

  if (opportunity.steps.length === 0) {
    errors.push("Add at least one application step.");
  }

  if (opportunity.tips.length === 0) {
    errors.push("Add at least one practical tip.");
  }

  return errors;
};

export const buildApplystyle = (opportunity) => {
  const heading =
    opportunity.listingType === "member_advertised"
      ? "*MEMBER ADVERTISED OPPORTUNITY*"
      : "*APPLY! VERIFIED OPPORTUNITY*";

  const lines = [
    heading,
    "",
    `*Title:* ${opportunity.title}`,
    `*Organisation:* ${opportunity.organization}`,
    `*Category:* ${opportunity.category}`
  ];

  if (opportunity.audience) {
    lines.push(`*Who it fits:* ${opportunity.audience}`);
  }

  if (opportunity.location) {
    lines.push(`*Location:* ${opportunity.location}`);
  }

  lines.push(`*Deadline:* ${formatDeadline(opportunity.deadline)}`);
  lines.push("");
  lines.push("*What this is about*");
  lines.push(opportunity.summary);

  if (opportunity.whyItFits) {
    lines.push("");
    lines.push("*Why it may be worth your attention*");
    lines.push(opportunity.whyItFits);
  }

  lines.push("");
  lines.push("*How to apply*");

  opportunity.steps.forEach((step, index) => {
    lines.push(`${index + 1}. ${step}`);
  });

  lines.push("");
  lines.push("*Quick tips*");

  opportunity.tips.forEach((tip) => {
    lines.push(`- ${tip}`);
  });

  if (opportunity.tags.length > 0) {
    lines.push("");
    lines.push(`*Tags:* ${opportunity.tags.join(" | ")}`);
  }

  lines.push("");
  lines.push(`*Source:* ${opportunity.sourceUrl}`);

  if (opportunity.listingType === "member_advertised") {
    lines.push("");
    lines.push(
      "*Disclaimer:* This listing was shared by a community member or partner. Please do your own due diligence before applying."
    );
  }

  return lines.join("\n");
};
