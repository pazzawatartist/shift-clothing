import "server-only";

const FRIENDLY_MESSAGES: Record<string, string> = {
  "23505": "That value already exists — please use something unique.",
  "23503": "This record is still referenced elsewhere and can't be modified this way.",
  "23514": "That value doesn't meet the required constraints.",
  P0001: "The operation could not be completed.",
};

/** Converts a raw Postgres/PostgREST error into a safe, user-facing message. */
export function toFriendlyError(error: { code?: string; message?: string; details?: string; hint?: string } | null | undefined): string {
  if (!error) return "Something went wrong. Please try again.";

  // Never shown to the user — server-side only, so raw DB errors are diagnosable
  // without ever leaking them into the UI.
  console.error("[db error]", error);

  const mapped = error.code ? FRIENDLY_MESSAGES[error.code] : undefined;
  if (mapped) {
    // Custom RAISE EXCEPTION messages from our RPCs (errcode P0001) are already user-safe.
    if (error.code === "P0001" && error.message) return error.message;
    return mapped;
  }

  const message = error.message ?? "";
  if (message.startsWith("Insufficient stock") || message.includes("not authorized")) {
    return message;
  }

  return "Something went wrong. Please try again.";
}
