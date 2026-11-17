import { createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, CalendarDays, Lightbulb, ShieldCheck, Sparkles } from "lucide-react";
import { BorrowBeeLayout, PageHeading } from "@/components/borrowbee-layout";
import { BRAND } from "@/lib/borrowbee";

const posts = [
  { title: "How to price your first rental", date: "Nov 10, 2026", category: "For owners", excerpt: "Start with a simple price, look around at what classmates are sharing, and adjust once you see how often people ask.", icon: <Lightbulb /> },
  { title: "Five things every hostel room is hiding", date: "Oct 28, 2026", category: "Campus life", excerpt: "Speakers, extension boards, drafters, induction cooktops and fest costumes — classmates are searching for them right now.", icon: <Sparkles /> },
  { title: `Why ${BRAND.name} keeps community first`, date: "Oct 14, 2026", category: "Our community", excerpt: "Sharing works best when it feels close to home. We’re making it easier to share useful things with the people around campus.", icon: <ShieldCheck /> },
];

export const Route = createFileRoute("/blog")({
  head: () => ({ meta: [
    { title: "The BorrowBee Journal | Campus rental tips" },
    { name: "description", content: "Thoughtful tips for borrowing and lending useful things around the ADYPU campus." },
    { property: "og:title", content: "The BorrowBee Journal" },
    { property: "og:description", content: "Stories and tips for borrowing and lending around campus." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: BlogPage,
});

function BlogPage() {
  return (
    <BorrowBeeLayout>
      <section className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-16">
        <PageHeading eyebrow="The BorrowBee journal" title="Notes from campus." description="Practical ideas for sharing the things we only need sometimes." />
        <ol className="mt-8 divide-y divide-border border-y border-border">{posts.map((post, index) => <li key={post.title}><article className="grid gap-5 py-7 sm:grid-cols-[90px_1fr] sm:gap-8"><div className="flex items-center gap-3 text-sm text-muted-foreground sm:flex-col sm:items-start"><span className="grid size-12 place-items-center bg-brand-gold-soft text-foreground">{post.icon}</span><span className="inline-flex items-center gap-1.5 text-xs"><CalendarDays size={14} />{post.date}</span></div><div><p className="text-xs font-semibold uppercase text-brand-terracotta">{post.category} · 0{index + 1}</p><h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{post.title}</h2><p className="mt-3 max-w-2xl leading-7 text-muted-foreground">{post.excerpt}</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold">Read the note <ArrowUpRight size={16} /></span></div></article></li>)}</ol>
      </section>
    </BorrowBeeLayout>
  );
}