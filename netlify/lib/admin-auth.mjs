import { json } from "./http.mjs";

const extractToken = (request) => {
  const headerToken = request.headers.get("x-apply-admin-token");

  if (headerToken) {
    return headerToken.trim();
  }

  const authHeader = request.headers.get("authorization");

  if (!authHeader) {
    return "";
  }

  return authHeader.replace(/^Bearer\s+/i, "").trim();
};

export const requireAdmin = (request) => {
  const configuredToken = process.env.APPLY_ADMIN_TOKEN;

  if (!configuredToken) {
    return {
      ok: false,
      response: json(
        {
          error: "APPLY_ADMIN_TOKEN is not configured for this site yet."
        },
        503
      )
    };
  }

  const providedToken = extractToken(request);

  if (!providedToken || providedToken !== configuredToken) {
    return {
      ok: false,
      response: json(
        {
          error: "Unauthorized."
        },
        401
      )
    };
  }

  return { ok: true };
};
