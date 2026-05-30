const TRUSTED_SOURCES = [
  {
    id: "clerkie",
    label: "Clerkie Careers",
    organization: "Clerkie",
    feedUrl: "https://boards-api.greenhouse.io/v1/boards/clerkie/jobs?content=true",
    allowLocation: (location) => /\bremote\b/i.test(location)
  },
  {
    id: "jumia",
    label: "Jumia Careers",
    organization: "Jumia",
    feedUrl: "https://boards-api.greenhouse.io/v1/boards/jumia/jobs?content=true",
    allowLocation: (location) => /\b(ghana|remote)\b/i.test(location)
  },
  {
    id: "paystack",
    label: "Paystack Careers",
    organization: "Paystack",
    feedUrl: "https://boards-api.greenhouse.io/v1/boards/paystack/jobs?content=true",
    allowLocation: (location) => /\b(remote|africa|ghana)\b/i.test(location)
  }
];

const EARLY_CAREER_TITLE_RE =
  /\b(internship|intern|associate|junior|graduate|trainee|analyst|assistant|coordinator|apprentice|fellow)\b/i;
const EXCLUDED_TITLE_RE =
  /\b(senior|sr\.?|lead|director|principal|staff|head|vp|vice president|chief)\b/i;
const EXPLICIT_LOCATION_RESTRICTION_RE =
  /\b(authorized to work in the united states|authorized to work in the u\.s\.|must be based in the united states|must be based in the u\.s\.|u\.s\.-based only|united states only|within the us only)\b/i;

const htmlEntityMap = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " "
};

const roleThemeMatchers = [
  {
    expression: /\b(product|pm)\b/i,
    label: "Product"
  },
  {
    expression: /\b(gtm|growth|sales|marketing|business development|revenue)\b/i,
    label: "Growth"
  },
  {
    expression: /\b(data|analytics?)\b/i,
    label: "Data"
  },
  {
    expression: /\b(engineer|developer|software|backend|front[- ]?end|full[- ]?stack)\b/i,
    label: "Engineering"
  },
  {
    expression: /\b(operations|ops)\b/i,
    label: "Operations"
  }
];

const unique = (items) => [...new Set(items.filter(Boolean))];

const normalizeWhitespace = (value = "") =>
  String(value)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const decodeHtmlEntities = (value = "") =>
  String(value).replace(
    /&(amp|lt|gt|quot|#39|nbsp);/g,
    (match) => htmlEntityMap[match] || match
  );

const stripHtml = (value = "") =>
  normalizeWhitespace(
    decodeHtmlEntities(value)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<\/li>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<\/h[1-6]>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );

const extractTagText = (html = "", tagName) =>
  [...html.matchAll(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "gi"))]
    .map((match) => stripHtml(match[1]))
    .filter(Boolean);

const extractSections = (html = "") => {
  const decoded = decodeHtmlEntities(html);
  const matches = [
    ...decoded.matchAll(
      /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>([\s\S]*?)(?=<h[1-6][^>]*>|$)/gi
    )
  ];

  return matches.map((match) => ({
    heading: stripHtml(match[2]),
    content: match[3],
    bullets: extractTagText(match[3], "li"),
    paragraphs: extractTagText(match[3], "p")
  }));
};

const truncate = (value, maxLength) => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
};

const findSection = (sections, patterns) =>
  sections.find((section) =>
    patterns.some((pattern) => pattern.test(section.heading))
  );

const sanitizeSourceUrl = (value = "") => {
  const trimmed = String(value).trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://")) {
    return `https://${trimmed.slice("http://".length)}`;
  }

  return trimmed;
};

const inferCategory = (title, text) => {
  const haystack = `${title}\n${text}`;

  if (/\bintern(ship)?\b/i.test(haystack)) {
    return "Internship";
  }

  if (/\b(graduate|trainee)\b/i.test(haystack)) {
    return "Graduate Program";
  }

  if (/\bfellow(ship)?\b/i.test(haystack)) {
    return "Fellowship";
  }

  if (/\b(bootcamp|academy|training|course|program)\b/i.test(haystack)) {
    return "Skill Training";
  }

  return "Entry-Level Job";
};

const inferTheme = (title, text) => {
  const titleMatch = roleThemeMatchers.find(({ expression }) =>
    expression.test(title)
  );

  if (titleMatch) {
    return titleMatch.label;
  }

  return roleThemeMatchers.find(({ expression }) => expression.test(text))?.label || "";
};

const inferAudience = (title, category, location, text) => {
  const theme = inferTheme(title, text);
  const roleFocus = theme ? ` interested in ${theme.toLowerCase()} work` : "";
  const remoteHint = /\bremote\b/i.test(location)
    ? " and open to remote roles"
    : location
      ? ` and able to work in ${location}`
      : "";

  if (category === "Internship") {
    return `Students, recent graduates, and early-career applicants${roleFocus}${remoteHint}.`;
  }

  if (category === "Graduate Program") {
    return `Recent graduates and final-year students${roleFocus}${remoteHint}.`;
  }

  return `Early-career applicants and recent graduates${roleFocus}${remoteHint}.`;
};

const extractSummary = (title, html) => {
  const sections = extractSections(html);
  const preferredSection = findSection(sections, [
    /\babout the internship\b/i,
    /\babout the role\b/i,
    /\babout the opportunity\b/i,
    /\bthe role\b/i,
    /\bposition summary\b/i,
    /\bjob summary\b/i
  ]);

  const candidateParagraphs = preferredSection?.paragraphs?.length
    ? preferredSection.paragraphs
    : extractTagText(decodeHtmlEntities(html), "p");

  const relevant = candidateParagraphs
    .filter((paragraph) => paragraph.length > 35)
    .slice(0, 2)
    .join(" ");

  if (relevant) {
    return truncate(relevant, 320);
  }

  return truncate(
    `A live ${title} listing from an official careers page in APPLY! Stewards' trusted-source watchlist.`,
    320
  );
};

const extractResponsibilities = (html) => {
  const sections = extractSections(html);
  const preferredSection = findSection(sections, [
    /\bresponsibilit/i,
    /\bwhat you(?:'|’)ll do\b/i,
    /\bwhat you will do\b/i,
    /\bin this role\b/i,
    /\bday[- ]to[- ]day\b/i
  ]);

  const bullets = preferredSection?.bullets?.length
    ? preferredSection.bullets
    : extractTagText(decodeHtmlEntities(html), "li");

  return unique(
    bullets
      .map((item) => truncate(item, 120))
      .filter(
        (item) =>
          item.length > 18 &&
          !/\b(hours per week|part-time|full-time|reports? to)\b/i.test(item)
      )
  ).slice(0, 5);
};

const extractQualifications = (html) => {
  const sections = extractSections(html);
  const preferredSection = findSection(sections, [
    /\bqualification/i,
    /\brequirements?\b/i,
    /\beligibilit/i,
    /\bwhat you bring\b/i,
    /\bwho you are\b/i,
    /\bideal candidate\b/i,
    /\bwhat we(?:'|’)re looking for\b/i
  ]);

  const bullets = preferredSection?.bullets?.length
    ? preferredSection.bullets
    : [];

  return unique(
    bullets
      .map((item) => truncate(item, 120))
      .filter((item) => item.length > 12)
  ).slice(0, 5);
};

const buildWhyItFits = (source, title, category, location) => {
  const locationNote = /\bremote\b/i.test(location)
    ? " with a remote setup"
    : location
      ? ` in ${location}`
      : "";
  return `This ${category.toLowerCase()} is being pulled from ${source.label}, an official careers source in the APPLY! Stewards watchlist, and the title signals an early-career opening${locationNote}.`;
};

const buildSteps = (sourceUrl) => [
  "Open the official source and read the full advert carefully.",
  "Prepare the documents the listing asks for, especially your CV and any supporting information.",
  `Submit your application through the official link: ${sourceUrl}`
];

const buildTips = (category, location, qualifications) => {
  const tips = [
    "Tailor your CV to the responsibilities and keywords in the advert.",
    "Apply early because the source does not list a confirmed closing date.",
    /\bremote\b/i.test(location)
      ? "If the role is remote, show that you can communicate clearly and work independently."
      : "Double-check the location details before you start the application."
  ];

  if (category === "Internship") {
    tips.unshift("Highlight coursework, projects, volunteering, or campus work that proves you can contribute quickly.");
  }

  if (qualifications.length > 0) {
    tips.unshift("Match the strongest requirements from the advert in the top half of your CV.");
  }

  return unique(tips).slice(0, 4);
};

const buildTags = (category, location, title, source) => {
  const tags = [
    category,
    "Official Source",
    source.organization
  ];

  if (location) {
    tags.push(location);
  }

  const theme = inferTheme(title, "");

  if (theme) {
    tags.push(theme);
  }

  return unique(tags);
};

const scoreOpportunity = (opportunity) => {
  let score = 0;

  if (opportunity.category === "Internship") {
    score += 4;
  }

  if (opportunity.category === "Graduate Program") {
    score += 3;
  }

  if (/\bremote\b/i.test(opportunity.location)) {
    score += 2;
  }

  score += Date.parse(opportunity.sourceUpdatedAt || opportunity.createdAt || 0) / 1_000_000_000_000;

  return score;
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
};

const jobMatchesScope = (source, job) => {
  const title = normalizeWhitespace(job.title);
  const location = normalizeWhitespace(job.location?.name);
  const contentText = stripHtml(job.content || "");

  if (!title || !EARLY_CAREER_TITLE_RE.test(title) || EXCLUDED_TITLE_RE.test(title)) {
    return false;
  }

  if (!source.allowLocation(location)) {
    return false;
  }

  if (EXPLICIT_LOCATION_RESTRICTION_RE.test(contentText)) {
    return false;
  }

  return true;
};

const toTrustedOpportunity = (source, job, checkedAt) => {
  const title = normalizeWhitespace(job.title);
  const location = normalizeWhitespace(job.location?.name);
  const sourceUrl = sanitizeSourceUrl(job.absolute_url);
  const summary = extractSummary(title, job.content || "");
  const category = inferCategory(title, job.content || "");
  const qualifications = extractQualifications(job.content || "");
  const responsibilities = extractResponsibilities(job.content || "");

  return {
    id: `trusted-${source.id}-${job.id}`,
    title,
    organization: source.organization,
    listingType: "verified",
    category,
    audience: inferAudience(title, category, location, job.content || ""),
    location,
    deadline: "Not specified - apply ASAP",
    sourceUrl,
    summary,
    whyItFits: buildWhyItFits(source, title, category, location),
    verificationNotes: `Imported automatically from ${source.label} on ${checkedAt}.`,
    rawNotes: `Source feed: ${source.feedUrl}\nExternal ID: ${job.id}\nSource updated at: ${job.updated_at || "Not stated"}`,
    status: "published",
    steps: buildSteps(sourceUrl),
    tips: buildTips(category, location, qualifications),
    tags: buildTags(category, location, title, source),
    sourceLabel: source.label,
    sourceFeedUrl: source.feedUrl,
    sourceUpdatedAt: job.updated_at || "",
    sourceCheckedAt: checkedAt,
    sourceListingId: String(job.id),
    verificationMethod: "trusted_source_automation",
    responsibilities,
    qualifications,
    createdAt: checkedAt
  };
};

export const collectTrustedSourceCandidates = async () => {
  const checkedAt = new Date().toISOString();
  const results = await Promise.all(
    TRUSTED_SOURCES.map(async (source) => {
      try {
        const payload = await fetchJson(source.feedUrl);
        const jobs = Array.isArray(payload.jobs) ? payload.jobs : [];
        const matches = jobs
          .filter((job) => jobMatchesScope(source, job))
          .map((job) => toTrustedOpportunity(source, job, checkedAt));

        return {
          sourceId: source.id,
          sourceLabel: source.label,
          ok: true,
          fetchedCount: jobs.length,
          matchedCount: matches.length,
          opportunities: matches
        };
      } catch (error) {
        return {
          sourceId: source.id,
          sourceLabel: source.label,
          ok: false,
          fetchedCount: 0,
          matchedCount: 0,
          error: error.message,
          opportunities: []
        };
      }
    })
  );

  const opportunities = results
    .flatMap((result) => result.opportunities)
    .sort((left, right) => scoreOpportunity(right) - scoreOpportunity(left));

  return {
    checkedAt,
    sourceResults: results.map(({ opportunities: _opportunities, ...result }) => result),
    opportunities
  };
};

export const syncTrustedOpportunities = async (options = {}) => {
  const { featureTopResult = false } = options;
  const {
    getFeaturedOpportunity,
    getOpportunity,
    saveOpportunity,
    setFeaturedOpportunity
  } = await import("./opportunities.mjs");
  const collected = await collectTrustedSourceCandidates();
  const saved = [];

  for (const candidate of collected.opportunities) {
    const existing = await getOpportunity(candidate.id);
    const record = await saveOpportunity({
      ...existing,
      ...candidate,
      createdAt: existing?.createdAt || candidate.createdAt,
      publishedAt: existing?.publishedAt || candidate.createdAt,
      lastFeaturedAt: existing?.lastFeaturedAt || ""
    });

    saved.push(record);
  }

  const currentFeatured = await getFeaturedOpportunity();
  let featured = currentFeatured;
  const refreshedCurrent = saved.find(
    (record) => record.id === currentFeatured?.opportunityId
  );

  if (refreshedCurrent) {
    featured = await setFeaturedOpportunity(refreshedCurrent);
  } else if (saved.length > 0 && (featureTopResult || !currentFeatured?.opportunity)) {
    featured = await setFeaturedOpportunity(saved[0]);
  }

  return {
    ...collected,
    importedCount: saved.length,
    opportunities: saved,
    featured
  };
};
