import Link from "next/link";
import { ArrowRight, BrainCircuit, ChartColumn, Mail, Radar, ShieldCheck, Sparkles, UserRoundSearch } from "lucide-react";

import { Card } from "@/components/ui/card";

const NAV_ITEMS = [
  { href: "#home", label: "Home" },
  { href: "#about", label: "About" },
  { href: "#features", label: "Features" },
  { href: "#contact", label: "Contact" }
];

const FEATURE_CARDS = [
  {
    icon: UserRoundSearch,
    title: "Targeted Contact Discovery",
    description: "Find engineering managers and recruiters from company websites and LinkedIn."
  },
  {
    icon: BrainCircuit,
    title: "Context-Aware Outreach Drafts",
    description: "Generate personalized emails based on your resume and the job description."
  },
  {
    icon: ChartColumn,
    title: "Confidence-Driven Leads",
    description: "See which contacts are most relevant so you know who to message first."
  },
  {
    icon: ShieldCheck,
    title: "Controlled Credits & Quotas",
    description: "Simple usage limits keep your costs predictable."
  }
];

const STEPS = [
  {
    title: "Add a company",
    detail: "Paste the company website or LinkedIn page."
  },
  {
    title: "Review hiring contacts",
    detail: "See engineers, managers, and recruiters with confidence scores."
  },
  {
    title: "Send personalized outreach",
    detail: "Generate an email from your resume and send it in a few clicks."
  }
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-hero-gradient">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -right-20 top-40 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
      </div>

      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="rounded-lg border border-border bg-card p-2 text-accent">
              <Radar className="h-4 w-4" />
            </span>
            <p className="text-sm font-semibold tracking-wide text-foreground">Lead Discovery Agent</p>
          </Link>

          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            {NAV_ITEMS.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-foreground">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-muted transition hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-violet-600 px-4 text-sm font-medium text-white shadow-glow transition hover:brightness-110"
            >
              Open app
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section id="home" className="mx-auto w-full max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-indigo-200">
              <Sparkles className="h-3.5 w-3.5" />
              Built for focused outreach
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Find engineering hiring managers and send personalized outreach in minutes.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-muted sm:text-lg">
              Discover the right contacts, generate emails from your resume, and reach out with confidence.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/sign-in"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-violet-600 px-5 text-sm font-medium text-white shadow-glow transition hover:brightness-110"
              >
                Find my first contacts
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#features"
                className="inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm font-medium text-muted transition hover:text-foreground"
              >
                See how it works
              </Link>
            </div>
            <p className="mt-3 text-sm text-muted">Built for engineers applying to dozens of companies.</p>
          </div>

          <Card className="rounded-2xl border-border/80 bg-card/90 p-6">
            <p className="text-xs uppercase tracking-widest text-muted">What you get</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border bg-black/30 p-4">
                <p className="text-sm font-medium text-foreground">A complete outreach workflow</p>
                <p className="mt-1 text-sm text-muted">Discover contacts, generate personalized emails, and send them from one place.</p>
              </div>
              <div className="rounded-xl border border-border bg-black/30 p-4">
                <p className="text-sm font-medium text-foreground">Your job search in one workspace</p>
                <p className="mt-1 text-sm text-muted">Your resume, target companies, and outreach drafts stay organized.</p>
              </div>
              <div className="rounded-xl border border-border bg-black/30 p-4">
                <p className="text-sm font-medium text-foreground">Fast, predictable AI usage</p>
                <p className="mt-1 text-sm text-muted">Built-in credit controls keep things simple and affordable.</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
        <Card className="rounded-2xl border-border/80 bg-card/90 p-6 sm:p-8">
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">Stop sending applications into the void</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-black/30 p-4">
              <p className="text-sm font-semibold text-foreground">Without this tool</p>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>- Apply to 100+ jobs</li>
                <li>- No responses</li>
                <li>- No idea who the hiring manager is</li>
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-black/30 p-4">
              <p className="text-sm font-semibold text-foreground">With Lead Discovery Agent</p>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>- Find the right engineering contacts</li>
                <li>- Send personalized outreach</li>
                <li>- Get higher-quality responses</li>
              </ul>
            </div>
          </div>
        </Card>
      </section>

      <section id="features" className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Features</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">Everything you need to reach hiring managers</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURE_CARDS.map((item) => (
            <Card key={item.title} className="rounded-2xl border-border/80 bg-card/90 p-5">
              <item.icon className="h-5 w-5 text-accent" />
              <h3 className="mt-3 text-lg font-semibold text-foreground">{item.title}</h3>
              <p className="mt-1 text-sm text-muted">{item.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section id="about" className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6">
        <Card className="rounded-2xl border-border/80 bg-card/90 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">About</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">Designed to reduce outreach friction</h2>
          <p className="mt-3 max-w-3xl text-sm text-muted sm:text-base">
            One place to find hiring contacts, generate personalized emails, and send outreach that actually gets responses.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <div key={step.title} className="rounded-xl border border-border bg-black/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-indigo-200">Step {index + 1}</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{step.title}</p>
                <p className="mt-1 text-sm text-muted">{step.detail}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section id="contact" className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6">
        <Card className="rounded-2xl border-border/80 bg-card/90 p-6 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">Contact us</p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground">Need a custom onboarding or product walkthrough?</h2>
              <p className="mt-3 text-sm text-muted sm:text-base">
                Reach out and include your use case, expected volume, and current workflow. We’ll help you configure the product for
                production use.
              </p>
            </div>
            <div className="flex flex-col justify-center gap-3">
              <a
                href="mailto:hello@leaddiscoveryagent.com?subject=Lead%20Discovery%20Agent%20Inquiry"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-black/30 px-4 text-sm font-medium text-foreground transition hover:border-indigo-400/50"
              >
                <Mail className="h-4 w-4 text-accent" />
                hello@leaddiscoveryagent.com
              </a>
              <Link
                href="/sign-in"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-accent to-violet-600 px-5 text-sm font-medium text-white shadow-glow transition hover:brightness-110"
              >
                Sign in to continue
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </main>
  );
}
