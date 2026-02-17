"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Radar, UserCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function Header() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [credits, setCredits] = useState<{ balance: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (mounted) {
          setEmail(user?.email || "");
        }
      } catch {
        if (mounted) setEmail("");
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadQuota = async () => {
      try {
        const res = await fetch("/api/outreach/quota", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          credits?: { balance?: number };
        };
        if (!mounted) return;
        if (typeof data.credits?.balance === "number") {
          setCredits({ balance: data.credits.balance });
        }
      } catch {
        // noop
      }
    };

    loadQuota();
    const interval = window.setInterval(loadQuota, 30000);
    window.addEventListener("quota-refresh", loadQuota);

    return () => {
      mounted = false;
      window.removeEventListener("quota-refresh", loadQuota);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const onSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="rounded-lg border border-border bg-card p-2 text-accent">
            <Radar className="h-4 w-4" />
          </span>
          <p className="text-sm font-semibold tracking-wide text-foreground">Lead Discovery Agent</p>
        </Link>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border bg-card/70 px-3 py-1 text-xs text-muted">
            Credits: {credits ? `${Math.max(Math.floor(credits.balance), 0)} left` : "..."}
          </span>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-border bg-card/70 px-3 py-2 text-xs text-muted transition hover:text-foreground"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
            >
              <UserCircle2 className="h-4 w-4" />
              <span className="hidden max-w-[180px] truncate sm:inline">{email || "My Account"}</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {menuOpen ? (
              <div className="absolute right-0 mt-2 w-44 rounded-xl border border-border bg-card p-1 shadow-soft">
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-black/40 hover:text-foreground"
                >
                  My Profile
                </Link>
                <button
                  onClick={onSignOut}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted transition hover:bg-black/40 hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
