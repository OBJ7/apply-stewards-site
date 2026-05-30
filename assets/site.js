const featuredRoot = document.querySelector("[data-featured-opportunity]");
const memberRoot = document.querySelector("[data-member-opportunities]");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDeadline = (value) => {
  if (!value) {
    return "Rolling / not stated";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(parsed);
};

const listMarkup = (items, ordered = false) => {
  if (!Array.isArray(items) || items.length === 0) {
    return "";
  }

  const tag = ordered ? "ol" : "ul";

  return `
    <${tag} class="featured-list">
      ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </${tag}>
  `;
};

const renderEmptyFeatured = () => {
  if (!featuredRoot) {
    return;
  }

  featuredRoot.innerHTML = `
    <div class="featured-shell empty">
      <div class="featured-copy">
        <span class="featured-status">Coming soon</span>
        <h3>The daily featured opportunity will appear here.</h3>
        <p class="featured-summary">Once a verified listing is published or a trusted official source matches APPLY!'s scope, this section will show a structured daily highlight automatically.</p>
      </div>
      <div class="featured-side">
        <div class="featured-mini-card">
          <div class="featured-mini-title">What changes now</div>
          <p>Instead of repeating the same formatting work in WhatsApp and on the website, one saved opportunity can power both.</p>
        </div>
      </div>
    </div>
  `;
};

const renderFeatured = (opportunity, selectedAt) => {
  if (!featuredRoot) {
    return;
  }

  const sourceCardCopy =
    opportunity.verificationMethod === "trusted_source_automation" && opportunity.sourceLabel
      ? `Pulled from ${escapeHtml(opportunity.sourceLabel)} in APPLY!'s trusted-source watchlist. Always open the original listing before you apply.`
      : "Always review the original listing before you submit anything.";

  const tags =
    Array.isArray(opportunity.tags) && opportunity.tags.length > 0
      ? `<div class="featured-tags">${opportunity.tags.map((tag) => `<span class="featured-tag">${escapeHtml(tag)}</span>`).join("")}</div>`
      : "";

  const selectedLabel = selectedAt
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      }).format(new Date(selectedAt))
    : "Today";

  featuredRoot.innerHTML = `
    <div class="featured-shell">
      <div class="featured-copy">
        <span class="featured-status">Featured ${escapeHtml(selectedLabel)}</span>
        <h3>${escapeHtml(opportunity.title)}</h3>
        <p class="featured-summary">${escapeHtml(opportunity.summary)}</p>

        <div class="featured-meta">
          <div><strong>Organisation</strong><span>${escapeHtml(opportunity.organization || "Not stated")}</span></div>
          <div><strong>Category</strong><span>${escapeHtml(opportunity.category || "Opportunity")}</span></div>
          <div><strong>Who it fits</strong><span>${escapeHtml(opportunity.audience || "Students and graduates")}</span></div>
          <div><strong>Deadline</strong><span>${escapeHtml(formatDeadline(opportunity.deadline))}</span></div>
        </div>

        ${opportunity.whyItFits ? `<div class="featured-block"><h4>Why it may be worth your attention</h4><p>${escapeHtml(opportunity.whyItFits)}</p></div>` : ""}
        ${listMarkup(opportunity.steps, true) ? `<div class="featured-block"><h4>How to apply</h4>${listMarkup(opportunity.steps, true)}</div>` : ""}
        ${listMarkup(opportunity.tips) ? `<div class="featured-block"><h4>Quick tips</h4>${listMarkup(opportunity.tips)}</div>` : ""}
        ${tags}
      </div>

      <div class="featured-side">
        <div class="featured-mini-card">
          <div class="featured-mini-title">Best next step</div>
          <p>Open the original source, confirm the deadline, and line up your documents before you leave the page.</p>
        </div>
        <div class="featured-mini-card">
          <div class="featured-mini-title">Source</div>
          <p>${sourceCardCopy}</p>
          <a href="${escapeHtml(opportunity.sourceUrl)}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">Open original source</a>
        </div>
      </div>
    </div>
  `;
};

const renderMemberOpportunities = (opportunities) => {
  if (!memberRoot) {
    return;
  }

  if (!Array.isArray(opportunities) || opportunities.length === 0) {
    memberRoot.innerHTML = `
      <article class="member-card">
        <div class="member-card-body">
          <h3>No member-advertised opportunities yet</h3>
          <p>As soon as the first member-submitted listing is approved, it will appear here with a separate disclaimer and direct source link.</p>
          <a href="/submit.html" class="btn btn-secondary">Share an opportunity</a>
        </div>
      </article>
    `;
    return;
  }

  memberRoot.innerHTML = opportunities
    .map(
      (opportunity) => {
        const imageMarkup = opportunity.imageUrl
          ? `<img class="member-image" src="${escapeHtml(opportunity.imageUrl)}" alt="${escapeHtml(opportunity.imageAltText || `${opportunity.title} opportunity image`)}" loading="lazy">`
          : "";

        return `
        <article class="member-card">
          ${imageMarkup}
          <div class="member-card-body">
            <div class="featured-tags" style="margin-top:0; margin-bottom:12px;">
              <span class="featured-tag">${escapeHtml(opportunity.category || "Opportunity")}</span>
            </div>
            <h3>${escapeHtml(opportunity.title)}</h3>
            <p>${escapeHtml(opportunity.summary)}</p>
            <div class="member-meta">
              <span><strong>Organisation:</strong> ${escapeHtml(opportunity.organization || "Not stated")}</span>
              <span><strong>Who it fits:</strong> ${escapeHtml(opportunity.audience || "See source")}</span>
              <span><strong>Deadline:</strong> ${escapeHtml(formatDeadline(opportunity.deadline))}</span>
            </div>
            <a href="${escapeHtml(opportunity.sourceUrl)}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">Open source</a>
          </div>
        </article>
      `;
      }
    )
    .join("");
};

const loadOpportunityData = async () => {
  if (!featuredRoot && !memberRoot) {
    return;
  }

  try {
    const requests = [];

    if (featuredRoot) {
      requests.push(
        fetch("/.netlify/functions/opportunity-of-day", {
          headers: { accept: "application/json" }
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error(
              `Featured opportunity request failed with status ${response.status}`
            );
          }

          return response.json();
        })
      );
    } else {
      requests.push(Promise.resolve(null));
    }

    if (memberRoot) {
      requests.push(
        fetch("/.netlify/functions/member-opportunities", {
          headers: { accept: "application/json" }
        }).then(async (response) => {
          if (!response.ok) {
            throw new Error(
              `Member opportunities request failed with status ${response.status}`
            );
          }

          return response.json();
        })
      );
    } else {
      requests.push(Promise.resolve({ opportunities: [] }));
    }

    const [featuredPayload, memberPayload] = await Promise.all(requests);

    if (featuredRoot) {
      if (featuredPayload?.featuredOpportunity) {
        renderFeatured(featuredPayload.featuredOpportunity, featuredPayload.selectedAt);
      } else {
        renderEmptyFeatured();
      }
    }

    if (memberRoot) {
      renderMemberOpportunities(memberPayload?.opportunities || []);
    }
  } catch (error) {
    console.error("Unable to load opportunity data", error);

    if (featuredRoot) {
      renderEmptyFeatured();
    }

    if (memberRoot) {
      renderMemberOpportunities([]);
    }
  }
};

loadOpportunityData();
