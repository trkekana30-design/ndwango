// Browser-only Sentry error reporting. The DSN is a public key (safe in client code).
const DSN = "https://6d7e8abc4fc694bc5f899c7e081be90f@o4512154127302656.ingest.de.sentry.io/4512175184871504";

let started = false;
type SentryMod = typeof import("@sentry/react");
let mod: SentryMod | null = null;

export async function initSentry() {
  if (started || typeof window === "undefined") return;
  started = true;
  mod = await import("@sentry/react");
  mod.init({
    dsn: DSN,
    environment: window.location.hostname.includes("id-preview") || window.location.hostname === "localhost" ? "preview" : "production",
    tracesSampleRate: 0.1,
  });
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!mod) return;
  mod.captureException(error, { extra: context });
}

export function setSentryUser(id: string | null) {
  mod?.setUser(id ? { id } : null);
}
