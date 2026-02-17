"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function GoogleLogo() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.6 12 2.6 6.9 2.6 2.8 6.7 2.8 11.8S6.9 21 12 21c6.9 0 9.2-4.8 9.2-7.3 0-.5 0-.9-.1-1.2H12z"
      />
      <path
        fill="#34A853"
        d="M2.8 7.1l3.2 2.4C6.8 7.9 9.2 6 12 6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.6 12 2.6 8.1 2.6 4.7 4.8 2.8 7.1z"
      />
      <path
        fill="#FBBC05"
        d="M12 21c2.5 0 4.7-.8 6.3-2.2l-2.9-2.4c-.8.6-1.9 1.1-3.4 1.1-3.9 0-5.2-2.6-5.5-3.9l-3.2 2.5C5.1 18.8 8.3 21 12 21z"
      />
      <path
        fill="#4285F4"
        d="M21.2 13.7c0-.6-.1-1.1-.2-1.6H12v3.9h5.5c-.3 1.4-1.3 2.5-2.1 3.1l2.9 2.4c1.7-1.6 2.9-4 2.9-7.8z"
      />
    </svg>
  );
}

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) return;
    router.replace(`/auth/callback?code=${encodeURIComponent(code)}`);
  }, [router, searchParams]);

  const onSignIn = async () => {
    setIsLoading(true);
    setMessage(null);
    setError(null);
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError("Email and password are required.");
      setIsLoading(false);
      return;
    }
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const onSignUp = async () => {
    setIsLoading(true);
    setMessage(null);
    setError(null);
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password) {
      setError("Email and password are required.");
      setIsLoading(false);
      return;
    }
    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({ email: normalizedEmail, password });
      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("anonymous sign-ins are disabled")) {
          setError("Email sign-up is disabled in Supabase. Enable Email provider + sign-ups in Auth settings.");
        } else {
          setError(signUpError.message);
        }
        return;
      }
      setMessage("Account created. If email confirmation is enabled, verify your inbox before signing in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up");
    } finally {
      setIsLoading(false);
    }
  };

  const onGoogleAuth = async () => {
    setIsLoading(true);
    setMessage(null);
    setError(null);
    try {
      const supabase = createClient();
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo }
      });
      if (oauthError) {
        setError(oauthError.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start Google sign-in");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-hero-gradient px-4">
      <Card className="w-full max-w-md rounded-2xl p-6">
        <h1 className="text-2xl font-semibold text-foreground">Sign In</h1>
        <p className="mt-1 text-sm text-muted">Access your Lead Discovery workspace.</p>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">Email</label>
            <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">Password</label>
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" />
          </div>
        </div>

        {error && <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        {message && (
          <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{message}</p>
        )}

        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button onClick={onSignIn} isLoading={isLoading} className="w-full">
            Sign In
          </Button>
          <Button onClick={onSignUp} isLoading={isLoading} className="w-full" type="button">
            Sign Up
          </Button>
        </div>

        <div className="my-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-wider text-muted">or continue with</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={onGoogleAuth}
          disabled={isLoading}
          type="button"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-zinc-900/60 text-sm font-medium text-foreground transition hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <GoogleLogo />
          Continue with Google
        </button>
      </Card>
    </main>
  );
}
