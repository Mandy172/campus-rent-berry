import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Bell, CheckCheck } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BorrowBeeLayout, PageHeading } from "@/components/borrowbee-layout";
import { useSupabaseAuth } from "@/hooks/use-supabase-auth";
import { listMyNotifications, markMyNotificationsRead } from "@/lib/community.functions";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [
    { title: "Notifications | BorrowBee" },
    { name: "description", content: "Updates about your BorrowBee rental requests and messages." },
    { property: "og:title", content: "Notifications | BorrowBee" },
    { property: "og:description", content: "Your BorrowBee account updates." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user, ready } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const load = useServerFn(listMyNotifications);
  const markRead = useServerFn(markMyNotificationsRead);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => load(),
    enabled: Boolean(user),
  });
  const unread = data?.some((notification) => !notification.read) ?? false;

  useEffect(() => {
    if (!user || !unread) return;
    void markRead()
      .then(async () => {
        await refetch();
        await queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
      })
      .catch(() => toast.error("Your notifications could not be marked as read."));
  }, [markRead, queryClient, refetch, unread, user]);

  return (
    <BorrowBeeLayout>
      <section className="mx-auto max-w-4xl px-5 py-9 md:px-8 md:py-14">
        <PageHeading eyebrow="Account updates" title="Notifications" description="Rental decisions and new messages from your campus community." />
        {!ready ? <p className="py-12 text-center text-muted-foreground">Checking your sign-in…</p>
          : !user ? <div className="mt-8 border-l-2 border-primary bg-brand-gold-soft/30 p-5">
            <h2 className="font-semibold">Sign in to see notifications</h2>
            <p className="mt-1 text-sm text-muted-foreground">Updates are private to your account.</p>
            <Button asChild size="sm" className="mt-4"><a href="/sign-in?next=%2Fnotifications">Sign in <ArrowRight /></a></Button>
          </div>
          : isLoading ? <p className="py-12 text-center text-muted-foreground">Loading notifications…</p>
            : error ? <p role="alert" className="py-12 text-center text-destructive">Your notifications could not be loaded.</p>
              : data?.length ? <>
                <p className="flex items-center gap-2 border-b border-border py-4 text-sm text-muted-foreground"><CheckCheck size={17} /> Unread updates are marked as read when you open this page.</p>
                <ol className="divide-y divide-border border-b border-border">{data.map((notification) => <li key={notification.id}>
                  <a href={notification.href} className="flex items-start gap-4 py-5 hover:bg-muted/50">
                    <span className="grid size-10 shrink-0 place-items-center bg-brand-gold-soft"><Bell size={18} /></span>
                    <span className="min-w-0 flex-1"><strong className="block">{notification.title}</strong><span className="mt-1 block break-words text-sm text-muted-foreground">{notification.body}</span><time className="mt-2 block text-xs text-muted-foreground" dateTime={notification.created_at}>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(notification.created_at))}</time></span>
                    {!notification.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                  </a>
                </li>)}</ol>
              </>
              : <div className="border-y border-border py-14 text-center"><span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-gold-soft"><Bell /></span><h2 className="mt-4 text-2xl font-semibold">You’re all caught up</h2><p className="mt-2 text-muted-foreground">Rental requests and messages will show up here.</p></div>}
      </section>
    </BorrowBeeLayout>
  );
}