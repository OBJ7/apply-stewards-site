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
const compactSpaces = (value = "") => cleanText(value).replace(/\s+/g, " ");

export const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean);
  }

  return cleanText(value)
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const unique = (items = []) => [...new Set(items.filter(Boolean))];

const trimTrailingPunctuation = (value = "") =>
  cleanText(value).replace(/[),.;]+$/g, "");

const extractLabelValue = (lines, labels) => {
  const pattern = new RegExp(`^(?:${labels.join("|")})\\s*[:\\-]\\s*(.+)$`, "i");
  const match = lines.map((line) => line.match(pattern)).find(Boolean);
  return match ? cleanText(match[1]) : "";
};

const dateFromParts = (year, monthIndex, day) => {
  const parsed = new Date(Date.UTC(Number(year), Number(monthIndex), Number(day)));

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
};

const monthMap = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11
};

export const normalizeExtractedDate = (value = "") => {
  const text = compactSpaces(value).replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, "$1");

  if (!text) {
    return "";
  }

  const slashDate = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2}|\d{2})\b/);

  if (slashDate) {
    const year = slashDate[3].length === 2 ? `20${slashDate[3]}` : slashDate[3];
    return dateFromParts(year, Number(slashDate[2]) - 1, slashDate[1]);
  }

  const dayMonthYear = text.match(/\b(\d{1,2})\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s*,?\s*(20\d{2})\b/i);

  if (dayMonthYear) {
    return dateFromParts(dayMonthYear[3], monthMap[dayMonthYear[2].toLowerCase()], dayMonthYear[1]);
  }

  const monthDayYear = text.match(/\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2}),?\s*(20\d{2})\b/i);

  if (monthDayYear) {
    return dateFromParts(monthDayYear[3], monthMap[monthDayYear[1].toLowerCase()], monthDayYear[2]);
  }

  return "";
};

const inferCategory = (text) => {
  const lower = text.toLowerCase();

  if (/\b(nss|national service)\b/.test(lower)) return "National Service";
  if (/\bscholarship|bursary|tuition\b/.test(lower)) return "Scholarship";
  if (/\bintern|internship\b/.test(lower)) return "Internship";
  if (/\bgraduate trainee|graduate program|graduate programme\b/.test(lower)) return "Graduate Program";
  if (/\bfellowship\b/.test(lower)) return "Fellowship";
  if (/\bbootcamp\b/.test(lower)) return "Bootcamp";
  if (/\btraining|workshop|course\b/.test(lower)) return "Skill Training";
  if (/\bevent|summit|webinar|conference\b/.test(lower)) return "Event";
  if (/\bjob|role|vacancy|hiring|officer|assistant|associate|entry[- ]level\b/.test(lower)) return "Entry-Level Job";

  return "Other";
};

const inferAudience = (text, category) => {
  const lower = text.toLowerCase();
  const audiences = [];

  if (category === "National Service" || /\b(nss|national service)\b/.test(lower)) {
    audiences.push("National Service personnel");
  }

  if (/\bstudent|undergraduate|tertiary\b/.test(lower)) {
    audiences.push("Students");
  }

  if (/\bfresh graduate|recent graduate|graduate\b/.test(lower)) {
    audiences.push("Recent graduates");
  }

  if (/\bentry[- ]level|early career|junior\b/.test(lower)) {
    audiences.push("Early-career applicants");
  }

  return unique(audiences).join(", ");
};

const inferLocation = (lines) => {
  const labelled = extractLabelValue(lines, ["location", "where", "place"]);

  if (labelled) {
    return labelled;
  }

  const locationLine = lines.find((line) =>
    /\b(accra|kumasi|tema|takoradi|cape coast|tamale|ghana|remote|hybrid|onsite|on-site)\b/i.test(line)
  );

  return compactSpaces(locationLine || "");
};

const extractUrls = (text) =>
  unique((text.match(/https?:\/\/[^\s)]+/gi) || []).map(trimTrailingPunctuation));

const extractEmails = (text) =>
  unique((text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || []).map((email) => email.toLowerCase()));

const chooseTitle = (lines, category) => {
  const keywordLine = lines.find((line) =>
    /\b(national service|nss|intern|internship|graduate trainee|entry[- ]level|assistant|officer|associate|scholarship|fellowship|hiring|vacancy|job)\b/i.test(line)
  );

  if (keywordLine) {
    return compactSpaces(keywordLine).slice(0, 110);
  }

  const firstUseful = lines.find((line) => line.length > 8 && !/^(deadline|location|apply|email|contact)\b/i.test(line));

  if (firstUseful) {
    return compactSpaces(firstUseful).slice(0, 110);
  }

  return `${category} opportunity`;
};

const chooseOrganization = (lines, title) => {
  const labelled = extractLabelValue(lines, ["organisation", "organization", "company", "institution", "employer"]);

  if (labelled) {
    return labelled;
  }

  const titleAtMatch = title.match(/\bat\s+(.+)$/i);

  if (titleAtMatch) {
    return trimTrailingPunctuation(titleAtMatch[1]).slice(0, 80);
  }

  const orgLine = lines.find((line) =>
    line !== title &&
    /\b(ltd|limited|group|company|bank|university|foundation|ministry|agency|ghana|hub|school|college|academy|ngo|consult|solutions|technologies)\b/i.test(line)
  );

  return compactSpaces(orgLine || "");
};

const chooseDeadline = (text, lines) => {
  const labelled = extractLabelValue(lines, [
    "deadline",
    "closing date",
    "application deadline",
    "apply by",
    "due date"
  ]);

  return normalizeExtractedDate(labelled) || normalizeExtractedDate(text);
};

export const extractOpportunityDraftFromText = (rawText = "") => {
  const text = cleanText(rawText).replace(/\r/g, "\n");
  const lines = text
    .split("\n")
    .map(compactSpaces)
    .filter(Boolean);
  const allText = lines.join("\n");
  const urls = extractUrls(allText);
  const emails = extractEmails(allText);
  const category = inferCategory(allText);
  const title = chooseTitle(lines, category);
  const organization = chooseOrganization(lines, title);
  const deadline = chooseDeadline(allText, lines);
  const audience = inferAudience(allText, category);
  const location = inferLocation(lines);
  const sourceUrl = urls[0] || "";
  const contactLine = lines.find((line) => /\b(apply|send|email|cv|resume|contact|submit)\b/i.test(line)) || "";
  const usefulSummaryLine = lines.find((line) =>
    line !== title &&
    line !== organization &&
    line !== contactLine &&
    line.length > 42 &&
    !line.includes("@") &&
    !line.includes("http") &&
    !/deadline|closing date/i.test(line)
  );
  const summary =
    usefulSummaryLine ||
    `${organization || "An organization"} is advertising ${title.toLowerCase()}${audience ? ` for ${audience.toLowerCase()}` : ""}.`;

  const steps = [];

  if (sourceUrl) {
    steps.push("Open the official source or application link.");
  }

  if (emails.length > 0) {
    steps.push(`Send the required documents to ${emails[0]}.`);
  }

  const contactLineRepeatsEmail =
    emails.length > 0 &&
    emails.some((email) => contactLine.toLowerCase().includes(email)) &&
    steps.some((step) => step.toLowerCase().includes(emails[0]));

  if (contactLine && !steps.includes(contactLine) && !contactLineRepeatsEmail) {
    steps.push(contactLine);
  }

  if (steps.length === 0) {
    steps.push("Confirm the source and application instructions before applying.");
  }

  const missing = [];
  if (!organization) missing.push("organization");
  if (!deadline) missing.push("deadline");
  if (!sourceUrl && emails.length === 0) missing.push("application link or email");

  return {
    title,
    organization,
    listingType: "verified",
    category,
    audience,
    location,
    deadline,
    sourceUrl,
    summary,
    whyItFits: audience
      ? `This may be relevant for ${audience.toLowerCase()} looking for ${category.toLowerCase()} opportunities.`
      : "",
    steps,
    tips: [
      "Verify the source before sending personal documents.",
      "Prepare your CV and supporting documents before the deadline.",
      "Apply early and keep a copy of your submission."
    ],
    tags: unique([
      category,
      category === "National Service" ? "NSS" : "",
      location
    ]),
    verificationNotes: missing.length
      ? `Extracted from screenshot or raw text. Please confirm: ${missing.join(", ")}.`
      : "Extracted from screenshot or raw text. Source details should still be confirmed before publishing.",
    rawNotes: text
  };
};

export const buildSourceOutreachMessage = (opportunity = {}) => {
  const title = cleanText(opportunity.title) || "your opportunity";
  const organization = cleanText(opportunity.organization);
  const intro = organization
    ? `Hello ${organization} team,`
    : "Hello,";

  return [
    intro,
    "",
    `I saw your post about ${title} and thought it may be useful for students, National Service personnel, recent graduates, or early-career applicants in the APPLY! Stewards community.`,
    "",
    "Would you be comfortable sharing the official application link or flyer through our submission page so we can review and list it properly?",
    "",
    "Submit here:",
    "https://applystewards.org/submit.html",
    "",
    "Thank you."
  ].join("\n");
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
  postStatus: cleanText(input.postStatus),
  plannedPostAt: cleanText(input.plannedPostAt),
  postedAt: cleanText(input.postedAt),
  reminderAt: cleanText(input.reminderAt),
  reminderPostedAt: cleanText(input.reminderPostedAt),
  postNotes: cleanText(input.postNotes),
  postedBy: cleanText(input.postedBy),
  imageKey: cleanText(input.imageKey),
  imageMimeType: cleanText(input.imageMimeType),
  imageOriginalName: cleanText(input.imageOriginalName),
  imageAltText: cleanText(input.imageAltText),
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
  lines.push(
    opportunity.sourceUrl
      ? `*Source:* ${opportunity.sourceUrl}`
      : "*Source:* Confirm the official source before posting."
  );

  if (opportunity.listingType === "member_advertised") {
    lines.push("");
    lines.push(
      "*Disclaimer:* This listing was shared by a community member or partner. Please do your own due diligence before applying."
    );
  }

  return lines.join("\n");
};

const applyFooter = [
  "",
  "Need help preparing your CV or cover letter for this? APPLY! Opportunity Help Desk is coming soon:",
  "https://applystewards.org/help-desk.html",
  "",
  "Join APPLY! Stewards:",
  "https://applystewards.org"
];

export const buildWhatsAppPost = (opportunity) =>
  [
    buildApplystyle(opportunity),
    ...applyFooter
  ].join("\n");

export const buildReminderPost = (opportunity) => {
  const lines = [
    "*DEADLINE REMINDER*",
    "",
    `*${opportunity.title}*`,
    opportunity.organization ? `${opportunity.organization}` : "",
    "",
    `*Deadline:* ${formatDeadline(opportunity.deadline)}`,
    opportunity.audience ? `*Who it fits:* ${opportunity.audience}` : "",
    "",
    "*Apply / source link:*",
    opportunity.sourceUrl,
    "",
    "If this fits you, do not wait until the final day. Open the source, confirm the requirements, and prepare your documents early.",
    "",
    "APPLY! Stewards"
  ];

  return lines.filter(Boolean).join("\n");
};

export const buildLinkedInPost = (opportunity) => {
  const tags = opportunity.tags?.length
    ? opportunity.tags.map((tag) => `#${String(tag).replace(/[^\w]/g, "")}`).filter((tag) => tag.length > 1)
    : [];

  const lines = [
    `${opportunity.title} - ${opportunity.organization}`,
    "",
    opportunity.summary,
    "",
    opportunity.audience ? `Who it fits: ${opportunity.audience}` : "",
    opportunity.location ? `Location: ${opportunity.location}` : "",
    `Deadline: ${formatDeadline(opportunity.deadline)}`,
    "",
    "Apply through the official source:",
    opportunity.sourceUrl,
    "",
    "APPLY! Stewards helps students and young graduates find clearer, more trustworthy opportunity information.",
    "",
    [...new Set(["#Ghana", "#Opportunities", "#CareerDevelopment", ...tags])].slice(0, 8).join(" ")
  ];

  return lines.filter(Boolean).join("\n");
};

export const buildDailyPostPack = (opportunities = []) => {
  const selected = opportunities.filter(Boolean);
  const lines = [
    "*APPLY! DAILY POST PACK*",
    "",
    `Prepared opportunities: ${selected.length}`,
    "Copy each item into the channel with its branded image.",
    ""
  ];

  selected.forEach((opportunity, index) => {
    lines.push(
      `*${index + 1}. ${opportunity.title}*`,
      `${opportunity.organization} | ${opportunity.category}`,
      `Deadline: ${formatDeadline(opportunity.deadline)}`,
      `Apply: ${opportunity.sourceUrl}`,
      ""
    );
  });

  lines.push("APPLY! Stewards");

  return lines.join("\n");
};
