"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FileText, Upload, UserCircle2 } from "lucide-react";

import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface ResumeRecord {
  id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  version: number;
  is_active: boolean;
  uploaded_at: string;
}

function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export default function ProfilePage() {
  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [fullName, setFullName] = useState<string>("");
  const [resume, setResume] = useState<ResumeRecord | null>(null);
  const [signedUrl, setSignedUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const supabase = useMemo(() => createClient(), []);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setError(userError?.message || "Not signed in");
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name,email")
        .eq("id", user.id)
        .maybeSingle();

      setFullName((profileData?.full_name as string) || user.user_metadata?.full_name || "");

      const { data: resumeData, error: resumeError } = await supabase
        .from("user_resumes")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (resumeError) {
        setError(resumeError.message);
        return;
      }

      const activeResume = (resumeData as ResumeRecord | null) || null;
      setResume(activeResume);

      if (activeResume?.file_path) {
        const { data: signed, error: signedError } = await supabase.storage
          .from("resumes")
          .createSignedUrl(activeResume.file_path, 3600);
        if (!signedError && signed?.signedUrl) {
          setSignedUrl(signed.signedUrl);
        } else {
          setSignedUrl("");
        }
      } else {
        setSignedUrl("");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onResumeUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setMessage(null);

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];
    if (!allowedTypes.includes(file.type)) {
      setError("Please upload PDF, DOC, or DOCX files only.");
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File too large. Max allowed size is 10MB.");
      return;
    }

    if (!userId) {
      setError("Missing user session.");
      return;
    }

    setIsUploading(true);

    try {
      const resumeId = crypto.randomUUID();
      const fileName = sanitizeFilename(file.name);
      const path = `${userId}/${resumeId}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("resumes").upload(path, file, {
        contentType: file.type,
        upsert: false
      });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const { data: latest } = await supabase
        .from("user_resumes")
        .select("version")
        .eq("user_id", userId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextVersion = ((latest?.version as number | undefined) || 0) + 1;

      await supabase.from("user_resumes").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);

      const { error: insertError } = await supabase.from("user_resumes").insert({
        user_id: userId,
        file_path: path,
        file_name: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
        version: nextVersion,
        is_active: true,
        parse_status: "pending"
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setMessage("Resume uploaded successfully.");
      await loadProfile();
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <main className="min-h-screen bg-hero-gradient">
      <Header />

      <motion.section
        className="mx-auto w-full max-w-4xl px-4 pb-12 pt-8 sm:px-6"
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? undefined : { duration: 0.18, ease: "easeOut" }}
      >
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-foreground">My Profile</h1>
          <p className="mt-1 text-sm text-muted">Manage your account and resume used for personalized outreach.</p>
        </div>

        <div className="space-y-4">
          <Card className="rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <span className="rounded-lg border border-border bg-black/40 p-2 text-muted">
                <UserCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm text-muted">Signed in as</p>
                <p className="text-base font-semibold text-foreground">{fullName || "User"}</p>
                <p className="text-sm text-muted">{email}</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl p-5">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-accent" />
              <h2 className="text-base font-semibold text-foreground">Resume</h2>
            </div>

            {isLoading ? (
              <div className="space-y-3 rounded-xl border border-border bg-black/30 p-4">
                <div className="space-y-2 animate-pulse">
                  <div className="h-4 w-1/3 rounded bg-zinc-800" />
                  <div className="h-3 w-2/3 rounded bg-zinc-800" />
                  <div className="h-3 w-1/4 rounded bg-zinc-800" />
                </div>
              </div>
            ) : null}

            {!isLoading && resume ? (
              <div className="space-y-3 rounded-xl border border-border bg-black/30 p-4">
                <p className="text-sm font-medium text-foreground">{resume.file_name}</p>
                <p className="text-xs text-muted">
                  Version {resume.version} • {formatBytes(resume.file_size_bytes)} • Uploaded {new Date(resume.uploaded_at).toLocaleString()}
                </p>
                {signedUrl ? (
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-sm text-accent hover:underline"
                  >
                    View uploaded resume
                  </a>
                ) : (
                  <p className="text-xs text-muted">Signed URL unavailable for current file.</p>
                )}
              </div>
            ) : null}

            {!isLoading && !resume ? <p className="text-sm text-muted">No resume uploaded yet.</p> : null}

            <div className="mt-4">
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
                Upload / Replace Resume
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={onResumeUpload}
                  disabled={isUploading}
                  className="block w-full rounded-xl border border-border bg-black/40 p-2 text-sm text-muted"
                />
                <Button
                  isLoading={isUploading}
                  className="gap-2"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4" />
                  {isUploading ? "Uploading..." : "Choose & Upload"}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted">Allowed: PDF/DOC/DOCX, max 10MB.</p>
            </div>

            {error ? <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
            {message ? (
              <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{message}</p>
            ) : null}
          </Card>

          <Card id="credits" className="scroll-mt-24 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-foreground">Credits & Plans</h2>
            <p className="mt-2 text-sm text-muted">Billing setup is coming soon.</p>
            <p className="mt-1 text-sm text-muted">
              You can continue using WarmReach for lead discovery; AI draft send is blocked when credits are 0.
            </p>
            <div className="mt-4">
              <a
                href="mailto:support@lead-discovery-agent.com?subject=Credits%20and%20Plans%20waitlist"
                className="inline-flex items-center rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-foreground"
              >
                Notify me / Contact support
              </a>
            </div>
          </Card>
        </div>
      </motion.section>
    </main>
  );
}
