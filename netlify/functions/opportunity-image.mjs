import { getStore } from "@netlify/blobs";
import { json, methodNotAllowed } from "../lib/http.mjs";

const imageStore = getStore("apply-opportunity-images");
const contentTypes = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp"
};

const inferContentType = (key) => {
  const extension = String(key).split(".").pop()?.toLowerCase();
  return contentTypes[extension] || "application/octet-stream";
};

export default async (request) => {
  if (request.method !== "GET") {
    return methodNotAllowed(["GET"]);
  }

  const url = new URL(request.url);
  const key = String(url.searchParams.get("key") || "").trim();

  if (!key || !key.startsWith("member/") || key.includes("..")) {
    return json({ error: "Invalid image key." }, 400);
  }

  const image = await imageStore.get(key, { type: "arrayBuffer" });

  if (!image) {
    return json({ error: "Image not found." }, 404);
  }

  return new Response(image, {
    headers: {
      "content-type": inferContentType(key),
      "cache-control": "public, max-age=31536000, immutable"
    }
  });
};
