// Server functions for Google OAuth + Gmail send (callable from client).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { withSupabaseSession } from "@/integrations/supabase/serverfn-auth";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  GOOGLE_SCOPE_STRING,
  getValidAccessToken,
} from "@/lib/google.server";
import { signState } from "@/lib/googleState.server";

/** Resolve the signed-in user's active workspace, or throw. */
async function requireActiveTenant(userId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("active_tenant_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const tenantId = data?.active_tenant_id;
  if (!tenantId) throw new Error("No active workspace selected.");
  return tenantId;
}

const StartSchema = z.object({
  origin: z.string().url(),
  returnTo: z.string().min(1).max(200),
});

function canonicalOAuthOrigin(origin: string) {
  const parsed = new URL(origin);
  const previewHost = process.env.LOVABLE_PREVIEW_HOST;

  // The Lovable editor can run the app inside a lovableproject.com iframe host.
  // Google OAuth clients are configured against the app's canonical lovable.app
  // host, so using the iframe origin as redirect_uri causes Google 403s.
  if (parsed.hostname.endsWith(".lovableproject.com") && previewHost) {
    return `https://${previewHost}`;
  }

  return parsed.origin;
}

function safeReturnTo(returnTo: string) {
  if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return "/";
  return returnTo;
}

/** Build the Google OAuth consent URL for the current user + active workspace. */
export const startGoogleOAuth = createServerFn({ method: "POST" })
  .middleware([withSupabaseSession])
  .inputValidator((input) => StartSchema.parse(input))
  .handler(async ({ data, context }) => {
    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) throw new Error("GOOGLE_OAUTH_CLIENT_ID not configured");

    const tenantId = await requireActiveTenant(context.userId);
    const oauthOrigin = canonicalOAuthOrigin(data.origin);
    const redirectUri = `${oauthOrigin}/api/public/google/callback`;
    const state = signState({
      userId: context.userId,
      tenantId,
      returnTo: safeReturnTo(data.returnTo),
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPE_STRING,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
    });

    return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
  });

/** Get the active workspace's current Google connection status. */
export const getGoogleStatus = createServerFn({ method: "GET" })
  .middleware([withSupabaseSession])
  .handler(async ({ context }) => {
    if (!context?.userId) {
      return { connected: false, email: null, scope: null, updatedAt: null };
    }
    let tenantId: string;
    try {
      tenantId = await requireActiveTenant(context.userId);
    } catch {
      return { connected: false, email: null, scope: null, updatedAt: null };
    }
    const { data, error } = await supabaseAdmin
      .from("google_tokens")
      .select("google_email, scope, updated_at")
      .eq("tenant_id", tenantId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      connected: !!data,
      email: data?.google_email ?? null,
      scope: data?.scope ?? null,
      updatedAt: data?.updated_at ?? null,
    };
  });

/** Disconnect: delete tokens for the active workspace. */
export const disconnectGoogle = createServerFn({ method: "POST" })
  .middleware([withSupabaseSession])
  .handler(async ({ context }) => {
    const tenantId = await requireActiveTenant(context.userId);
    const { error } = await supabaseAdmin
      .from("google_tokens")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { success: true };
  });


const SendSchema = z.object({
  to: z.string().min(3).max(500),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(50_000),
  eventId: z.string().uuid().optional(),
});


/**
 * Gmail send/list are DEFERRED.
 *
 * The Gmail scopes (gmail.send, gmail.readonly) are intentionally not
 * requested by the OAuth flow right now. These stubs throw immediately so
 * no callsite can ever hit gmail.googleapis.com and surface an
 * ACCESS_TOKEN_SCOPE_INSUFFICIENT error.
 *
 * To re-enable: restore the previous implementations, add the appropriate
 * scopes to GOOGLE_SCOPE_STRING, and have users reconnect.
 */
export const sendGmail = createServerFn({ method: "POST" })
  .middleware([withSupabaseSession])
  .inputValidator((input) => SendSchema.parse(input))
  .handler(async () => {
    throw new Error(
      "In-app Gmail sending is deferred. Use 'Open in Gmail' to compose and send from your inbox.",
    );
  });

type GmailListItem = {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  unread: boolean;
};

export const listGmailMessages = createServerFn({ method: "POST" })
  .middleware([withSupabaseSession])
  .inputValidator((input) => ListGmailSchema.parse(input ?? {}))
  .handler(async (): Promise<{ messages: GmailListItem[] }> => {
    // Deferred — Gmail read scope is not requested. Always return empty.
    return { messages: [] };
  });

const ListGmailSchema = z.object({
  maxResults: z.number().int().min(1).max(50).optional(),
  q: z.string().max(500).optional(),
});


/* ------------------------------------------------------------------ *
 * Calendar: list upcoming events
 * ------------------------------------------------------------------ */

const ListCalSchema = z.object({
  timeMin: z.string().optional(),
  timeMax: z.string().optional(),
  maxResults: z.number().int().min(1).max(250).optional(),
});

type CalEvent = {
  id: string;
  summary: string;
  description: string | null;
  start: string | null;
  end: string | null;
  allDay: boolean;
  location: string | null;
  htmlLink: string | null;
};

export const listCalendarEvents = createServerFn({ method: "POST" })
  .middleware([withSupabaseSession])
  .inputValidator((input) => ListCalSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<{ events: CalEvent[] }> => {
    const tenantId = await requireActiveTenant(context.userId);
    const accessToken = await getValidAccessToken(context.userId, tenantId);
    if (!accessToken) return { events: [] };

    const timeMin = data.timeMin ?? new Date().toISOString();
    const params = new URLSearchParams({
      timeMin,
      maxResults: String(data.maxResults ?? 50),
      singleEvents: "true",
      orderBy: "startTime",
    });
    if (data.timeMax) params.set("timeMax", data.timeMax);

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Calendar list failed [${res.status}]: ${text}`);
    }
    const json = (await res.json()) as {
      items?: {
        id: string;
        summary?: string;
        description?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
        location?: string;
        htmlLink?: string;
      }[];
    };
    const events: CalEvent[] = (json.items ?? []).map((e) => ({
      id: e.id,
      summary: e.summary ?? "(no title)",
      description: e.description ?? null,
      start: e.start?.dateTime ?? e.start?.date ?? null,
      end: e.end?.dateTime ?? e.end?.date ?? null,
      allDay: !e.start?.dateTime,
      location: e.location ?? null,
      htmlLink: e.htmlLink ?? null,
    }));
    return { events };
  });