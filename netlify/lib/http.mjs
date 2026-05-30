export const json = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });

export const methodNotAllowed = (methods) =>
  json(
    {
      error: `Method not allowed. Use ${methods.join(", ")}.`
    },
    405
  );
