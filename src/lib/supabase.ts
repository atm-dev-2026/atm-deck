import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Used only for Realtime broadcast (pub/sub) — not as a database client.
// The app's actual database is Prisma Postgres; see CLAUDE.md.
export const supabase = url && publishableKey ? createClient(url, publishableKey) : null;

/**
 * Sends a broadcast without holding open a websocket — fine for a serverless
 * route handler, since supabase-js posts it over HTTP when send() is called
 * on a channel that was never subscribed.
 */
export async function broadcast(topic: string, event: string, payload: unknown) {
  if (!supabase) return;
  try {
    await supabase.channel(topic).send({ type: "broadcast", event, payload });
  } catch (error) {
    console.error("Supabase broadcast failed", error);
  }
}
