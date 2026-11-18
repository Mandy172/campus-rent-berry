import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, MessageCircle, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BorrowBeeLayout, PageHeading } from "@/components/borrowbee-layout";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { listConversationMessages, listConversations, sendConversationMessage } from "@/lib/community.functions";

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>) => ({
    conversation: typeof search["conversation"] === "string" && /^[0-9a-f-]{36}$/i.test(search["conversation"]) ? search["conversation"] : "",
  }),
  head: () => ({ meta: [
    { title: "Messages | RentBerry" },
    { name: "description", content: "Private conversations with RentBerry campus members." },
    { property: "og:title", content: "Messages | RentBerry" },
    { property: "og:description", content: "Message the people sharing items on RentBerry." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: MessagesPage,
});

function MessagesPage() {
  const { conversation: selectedId } = Route.useSearch();
  const { user, ready } = useSupabaseAuth();
  const loadConversations = useServerFn(listConversations);
  const { data: conversations, isLoading, error, refetch } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: () => loadConversations(),
    enabled: Boolean(user),
  });
  return (
    <BorrowBeeLayout>
      <section className="mx-auto max-w-7xl px-5 py-9 md:px-8 md:py-14">
        <PageHeading eyebrow="Between members" title="Messages" description="Keep item questions and handoff details in one place." />
        {!ready ? <p className="py-12 text-center text-muted-foreground">Checking your sign-in…</p>
          : !user ? <div className="mt-8 border-l-2 border-primary bg-brand-gold-soft/30 p-5">
            <h2 className="font-semibold">Sign in to see messages</h2>
            <p className="mt-1 text-sm text-muted-foreground">Your conversations are private to their participants.</p>
            <Button asChild size="sm" className="mt-4"><a href="/sign-in?next=%2Fmessages">Sign in <ArrowRight /></a></Button>
          </div>
          : isLoading ? <p className="py-12 text-center text-muted-foreground">Loading conversations…</p>
            : error ? <p role="alert" className="py-12 text-center text-destructive">Your conversations could not be loaded.</p>
              : <div className="mt-8 grid min-h-[26rem] border-y border-border md:grid-cols-[19rem_1fr]">
                <aside className={`${selectedId ? "hidden md:block" : "block"} border-b border-border md:border-b-0 md:border-r`}>
                  <h2 className="px-4 py-4 text-sm font-semibold">Your conversations</h2>
                  {conversations?.length ? <ul className="divide-y divide-border">{conversations.map((conversation) => (
                    <li key={conversation.id}>
                      <Link
                        to="/messages"
                        search={{ conversation: conversation.id }}
                        className={`block px-4 py-4 text-sm transition-colors hover:bg-muted ${selectedId === conversation.id ? "bg-muted" : ""}`}
                      >
                        <span className="block font-medium">{conversation.listing?.title ?? "RentBerry item"}</span>
                        <span className="mt-1 block truncate text-muted-foreground">{conversation.latestMessage?.body ?? "No messages yet"}</span>
                      </Link>
                    </li>
                  ))}</ul> : <p className="px-4 pb-5 text-sm text-muted-foreground">No conversations yet.</p>}
                </aside>
                <div className={`${selectedId ? "block" : "hidden md:grid"} place-items-center px-5 py-12 text-center`}>
                  {selectedId ? <ConversationThread key={selectedId} conversationId={selectedId} onSent={() => void refetch()} />
                    : <div><span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-gold-soft"><MessageCircle /></span><h2 className="mt-4 text-xl font-semibold">Choose a conversation</h2><p className="mt-1 text-sm text-muted-foreground">Open a listing’s message button to contact its owner.</p></div>}
                </div>
              </div>}
      </section>
    </BorrowBeeLayout>
  );
}

function ConversationThread({ conversationId, onSent }: { conversationId: string; onSent: () => void }) {
  const { user } = useSupabaseAuth();
  const load = useServerFn(listConversationMessages);
  const send = useServerFn(sendConversationMessage);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["conversation-messages", user?.id, conversationId],
    queryFn: () => load({ data: { conversationId } }),
    enabled: Boolean(user),
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      await send({ data: { conversationId, body } });
      setBody("");
      await refetch();
      onSent();
    } catch (sendError) {
      toast.error(sendError instanceof Error ? sendError.message : "Your message could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading messages…</p>;
  if (error || !data) return <p role="alert" className="text-sm text-destructive">This conversation is not available to your account.</p>;
  const otherMemberId = data.conversation.participant1_id === user?.id ? data.conversation.participant2_id : data.conversation.participant1_id;
  const displayName = data.listing?.owner_id === otherMemberId ? data.listing.owner_name : "Campus member";

  return (
    <div className="flex min-h-[24rem] w-full max-w-2xl flex-col text-left">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Button asChild variant="ghost" size="icon" className="md:hidden" aria-label="Back to conversations">
          <Link to="/messages" search={{ conversation: "" }}><ArrowRight className="rotate-180" /></Link>
        </Button>
        <div><h2 className="font-semibold">{displayName}</h2><p className="text-sm text-muted-foreground">{data.listing?.title ?? "RentBerry item"}</p></div>
      </div>
      <ol className="flex-1 space-y-3 overflow-y-auto py-5" aria-label="Conversation messages">
        {data.messages.length ? data.messages.map((message) => <li key={message.id} className={`max-w-[85%] border border-border px-3 py-2 text-sm ${message.sender_id === user?.id ? "ml-auto bg-brand-gold-soft" : "mr-auto bg-muted"}`}>
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
          <time className="mt-1 block text-right text-[0.7rem] text-muted-foreground" dateTime={message.created_at}>{new Intl.DateTimeFormat("en-IN", { dateStyle: "short", timeStyle: "short" }).format(new Date(message.created_at))}</time>
        </li>) : <li className="py-8 text-center text-sm text-muted-foreground">Start the conversation with a question about the item.</li>}
      </ol>
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border pt-4">
        <Input aria-label="Your message" maxLength={1000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a message…" />
        <Button type="submit" size="icon" aria-label="Send message" disabled={busy || !body.trim()}><Send /></Button>
      </form>
    </div>
  );
}