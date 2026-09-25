import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { getChannelForUser, getChannelMessages } from "@/lib/chat";
import { ChannelView } from "./ChannelView";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Taken before querying, so the live stream (which resumes from here) re-sends
  // anything that changes while this page renders rather than skipping it.
  const since = new Date().toISOString();

  // Fetched in parallel; messages are discarded below for non-members, matching
  // GET /api/channels/[channelId]/messages' membership check.
  const [result, messages] = await Promise.all([
    getChannelForUser(channelId, user.id),
    getChannelMessages(channelId, user.id),
  ]);

  const channel = result.ok ? result.channel : null;
  const initialMessages = channel?.isMember ? messages : [];

  // Keyed by channel and membership so switching channels — or joining this
  // one — remounts the view with fresh state instead of reusing the old one.
  return (
    <ChannelView
      key={`${channelId}:${channel?.isMember ?? false}`}
      channelId={channelId}
      channel={JSON.parse(JSON.stringify(channel))}
      initialMessages={JSON.parse(JSON.stringify(initialMessages))}
      since={since}
    />
  );
}
