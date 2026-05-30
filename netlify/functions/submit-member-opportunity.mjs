import { getStore } from "@netlify/blobs";
import { Buffer } from "node:buffer";
import { normalizeOpportunityInput } from "../../shared/opportunity-utils.mjs";
import { json, methodNotAllowed } from "../lib/http.mjs";
import { saveOpportunity } from "../lib/opportunities.mjs";

const imageStore = getStore("apply-opportunity-images");
const maxImageBytes = 2 * 1024 * 1024;
const imageTypes = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

const cleanFileName = (value = "opportunity-image") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "opportunity-image";

const parseImageUpload = (dataUrl = "", originalName = "") => {
  if (!dataUrl) {
    return null;
  }

  const match = String(dataUrl).match(/^data:(image\/(?:jpeg|png|webp));base64,([a-z0-9+/=\s]+)$/i);

  if (!match) {
    throw new Error("Image must be a JPG, PNG, or WebP file.");
  }

  const mimeType = match[1].toLowerCase();
  const extension = imageTypes[mimeType];

  if (!extension) {
    throw new Error("Image must be a JPG, PNG, or WebP file.");
  }

  const buffer = Buffer.from(match[2].replace(/\s+/g, ""), "base64");

  if (buffer.length > maxImageBytes) {
    throw new Error("Image must be 2 MB or smaller.");
  }

  if (buffer.length === 0) {
    throw new Error("Image file is empty.");
  }

  return {
    arrayBuffer: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    mimeType,
    extension,
    originalName: cleanFileName(originalName)
  };
};

export default async (request) => {
  if (request.method !== "POST") {
    return methodNotAllowed(["POST"]);
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const normalized = normalizeOpportunityInput({
    ...payload,
    listingType: "member_advertised",
    status: "pending_review"
  });
  let imageUpload = null;

  const errors = [];

  try {
    imageUpload = parseImageUpload(payload.imageDataUrl, payload.imageName);
  } catch (error) {
    errors.push(error.message);
  }

  if (!normalized.title) {
    errors.push("Title is required.");
  }

  if (!normalized.organization) {
    errors.push("Organization is required.");
  }

  if (!normalized.sourceUrl) {
    errors.push("Source URL is required.");
  }

  if (!normalized.summary) {
    errors.push("A short summary is required.");
  }

  if (normalized.sourceUrl) {
    try {
      new URL(normalized.sourceUrl);
    } catch {
      errors.push("Source URL must be a valid URL.");
    }
  }

  if (normalized.submittedByEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.submittedByEmail)) {
    errors.push("Submitter email must be a valid email address.");
  }

  if (errors.length > 0) {
    return json({ error: "Validation failed.", errors }, 400);
  }

  const opportunityId = crypto.randomUUID();
  let imageFields = {};

  if (imageUpload) {
    const imageKey = `member/${opportunityId}/${Date.now()}-${imageUpload.originalName}.${imageUpload.extension}`;

    await imageStore.set(imageKey, imageUpload.arrayBuffer, {
      metadata: {
        contentType: imageUpload.mimeType,
        originalName: imageUpload.originalName
      }
    });

    imageFields = {
      imageKey,
      imageMimeType: imageUpload.mimeType,
      imageOriginalName: imageUpload.originalName,
      imageAltText: `${normalized.title} opportunity image`
    };
  }

  const opportunity = await saveOpportunity({
    id: opportunityId,
    ...normalized,
    ...imageFields,
    category: normalized.category || "Other",
    steps:
      normalized.steps.length > 0
        ? normalized.steps
        : ["Open the source link and review the listing carefully."],
    tips:
      normalized.tips.length > 0
        ? normalized.tips
        : ["Please verify all details independently before applying."],
    createdAt: new Date().toISOString()
  });

  return json(
    {
      message: "Member opportunity submitted for review.",
      opportunityId: opportunity.id
    },
    201
  );
};
