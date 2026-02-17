import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createHash } from "node:crypto";

interface DraftRequestPayload {
  contact?: {
    name?: string;
    title?: string;
    email?: string;
    linkedin?: string;
  };
  job?: {
    title?: string;
    company?: string;
    text?: string;
    source_url?: string;
  };
  company?: string;
  force_regenerate?: boolean;
  tone?: string;
}

interface ActiveResumeRow {
  file_path: string;
  file_name: string;
  mime_type: string;
}

interface OpenAiResponsePayload {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
}

interface BaseDraftRow {
  id: string;
  subject_template: string;
  body_template: string;
}

interface ConsumeCreditsResultRow {
  success: boolean;
  balance: number | string;
  message: string | null;
}

function extractDraftText(payload: OpenAiResponsePayload): string {
  if (payload.output_text && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const chunks: string[] = [];
  for (const item of payload.output || []) {
    for (const part of item.content || []) {
      if (part.type === "output_text" && part.text) {
        chunks.push(part.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function getUtcDayStartIso(): string {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  return start.toISOString();
}

function isMissingRelationError(message: string | undefined): boolean {
  const msg = (message || "").toLowerCase();
  return msg.includes("relation") && msg.includes("does not exist");
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value);
  return 0;
}

function parseDraft(draft: string, fallbackSubject: string) {
  const lines = draft.split("\n");
  const subjectLine = lines.find((line) => /^subject:/i.test(line.trim()));
  const subject = subjectLine ? subjectLine.replace(/^subject:\s*/i, "").trim() : fallbackSubject;
  const body = subjectLine ? lines.slice(lines.indexOf(subjectLine) + 1).join("\n").trim() : draft.trim();
  return { subject, body };
}

const PROMPT_VERSION = "v2_dynamic_opening";
const OPENING_LINE_CANDIDATES = [
  "I know your inbox is probably overflowing right now, so I'll make this quick and worthwhile.",
  "I'll keep this short because I know your time is valuable.",
  "You're likely juggling multiple priorities, so I'll get straight to why I'm reaching out.",
  "I won't take much of your time, just a quick note about how I can add value.",
  "I'll respect your busy schedule and get straight to the point.",
  "I'm reaching out with intent because I believe I can contribute meaningfully to your team.",
  "Instead of sending a generic application, I wanted to connect directly.",
  "I'll skip the fluff and get straight to why this message matters.",
  "You don't know me yet, but I believe this message will be worth your time.",
  "I'm not here to waste your time, I'm here to create impact.",
  "I promise this won't be another long, generic email in your inbox.",
  "If you give me 30 seconds, I'll explain why I'm a strong fit.",
  "Consider this a brief introduction from someone eager to solve real problems.",
  "I'll make this as efficient as a well-optimized API call.",
  "Rather than waiting in the applicant queue, I thought I'd reach out proactively."
];

function pickOpeningLine(seed: string): string {
  const hash = createHash("sha256").update(seed).digest("hex");
  const index = Number.parseInt(hash.slice(0, 8), 16) % OPENING_LINE_CANDIDATES.length;
  return OPENING_LINE_CANDIDATES[index];
}

function buildBasePrompt(params: {
  senderName: string;
  senderRole: string;
  targetCompany: string;
  jobRole: string;
  jobDescription: string;
  jobUrl?: string;
  tone: string;
}) {
  const {
    senderName,
    senderRole,
    targetCompany,
    jobRole,
    jobDescription,
    jobUrl,
    tone
  } = params;

  return `
You are a professional cold-email drafting assistant.

Follow these strict rules:
1) Use ONLY details from the attached resume file plus the job description.
2) Do NOT invent, assume, or hallucinate experience.
3) Align every highlight directly to job description keywords.
4) Keep the tone confident, slightly persuasive, and respectful.
5) Keep the template structure exactly in this order.
6) Sign off with exactly this sender name: ${senderName}.
7) Output only the final email text.
8) Use placeholders exactly:
   - [RECIPIENT_NAME]
   - [RECIPIENT_TITLE]
   - [COMPANY_NAME]
   - [JOB_ROLE]
9) The sentence immediately after greeting must be a concise, human opening line in this style:
   "I know your inbox is probably overflowing right now, so I'll make this quick and worthwhile."
   "I'll keep this short because I know your time is valuable."
   "You're likely juggling multiple priorities, so I'll get straight to why I'm reaching out."
   "I'll skip the fluff and get straight to why this message matters."
   "If you give me 30 seconds, I'll explain why I'm a strong fit."
   Do NOT reuse this exact sentence:
   "I know you're busy with your important work, so I'll get straight to the point without wasting your time."
10) Keep that opening line to one sentence only.

Context:
- Sender name: ${senderName}
- Sender current role (if known): ${senderRole || "Not provided"}
- Company name: ${targetCompany || "Target company"}
- Job role: ${jobRole || "Open role"}
- Job URL: ${jobUrl || "Not provided"}
- Tone: ${tone}

Job Description:
${jobDescription}

EMAIL TEMPLATE TO FOLLOW EXACTLY:

Subject: Skilled [Job role] eager to join [company name]

Hey [Recruiter's Name],

[OPENING_LINE]

I am [Your Name], a [Your Job Title] with significant experience in [Your Key Skill Area] that [Brief Impressive Stat or Achievement].

Here are a few highlights of my experience:

1. [Technical Skill or Achievement 1 aligned to JD]
2. [Technical Skill or Achievement 2 aligned to JD]
3. [Technical Skill or Achievement 3 aligned to JD]
4. [Technical Skill or Achievement 4 aligned to JD]

[List of Technologies/Skills relevant to this role only]

And I have attached my resume; you can check more of my work.

I noticed a job opportunity at your [Company] hiring for a [Job Role], and I couldn’t resist reaching out. I've researched your project and found it incredibly interesting, and I am eager to contribute to your team. I believe I would be a valuable asset to [Company Name]. Please give me a chance to prove myself—test me, observe my work, and then decide if I am a good fit.

I totally understand that you are busy and it's okay even if you don’t respond to my mail. I will do a follow up in the next 3 days just to make sure that you have read my mail.

Warm regards,
[Your Name]
`.trim();
}

function personalizeTemplate(params: {
  subjectTemplate: string;
  bodyTemplate: string;
  contactName: string;
  contactTitle: string;
  companyName: string;
  jobRole: string;
  openingLine: string;
}) {
  const { subjectTemplate, bodyTemplate, contactName, contactTitle, companyName, jobRole, openingLine } = params;
  const recipient = contactName || "Hiring Team";
  const role = jobRole || "role";
  const company = companyName || "company";

  const replacer = (input: string) =>
    input
      .replaceAll("[RECIPIENT_NAME]", recipient)
      .replaceAll("[RECIPIENT_TITLE]", contactTitle || "Hiring Team")
      .replaceAll("[COMPANY_NAME]", company)
      .replaceAll("[JOB_ROLE]", role)
      .replaceAll("[OPENING_LINE]", openingLine)
      .replaceAll("[Recruiter's Name]", recipient)
      .replaceAll("[company name]", company)
      .replaceAll("[Company Name]", company)
      .replaceAll("[Company]", company)
      .replaceAll("[Job role]", role)
      .replaceAll("[Job Role]", role)
      .replaceAll(
        "I know you're busy with your important work, so I'll get straight to the point without wasting your time.",
        openingLine
      );

  return {
    subject: replacer(subjectTemplate),
    body: replacer(bodyTemplate)
  };
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const dailyLimit = Number.parseInt(process.env.DRAFTS_DAILY_LIMIT || "10", 10);

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase environment is missing.", request_id: requestId }, { status: 500 });
  }
  if (!openAiApiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is missing on server.", request_id: requestId }, { status: 500 });
  }

  let response = NextResponse.next();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: "", ...options });
      }
    }
  });

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error(`[outreach:draft:${requestId}] unauthorized`, userError?.message);
    return NextResponse.json({ error: "Unauthorized", request_id: requestId }, { status: 401 });
  }

  const payload = (await request.json()) as DraftRequestPayload;
  const contact = payload.contact;
  const job = payload.job;
  const tone = payload.tone?.trim() || "professional";
  const forceRegenerate = Boolean(payload.force_regenerate);

  if (!contact?.email || !job?.text) {
    return NextResponse.json({ error: "Missing contact email or job description.", request_id: requestId }, { status: 400 });
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const senderName = (profileData?.full_name as string) || user.user_metadata?.full_name || user.email || "Candidate";

  const { data: resumeData, error: resumeError } = await supabase
    .from("user_resumes")
    .select("file_path,file_name,mime_type")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (resumeError) {
    console.error(`[outreach:draft:${requestId}] resume_query_error`, resumeError.message);
    return NextResponse.json({ error: resumeError.message, request_id: requestId }, { status: 500 });
  }
  if (!resumeData) {
    return NextResponse.json(
      { error: "No active resume found. Upload resume in profile first.", request_id: requestId },
      { status: 400 }
    );
  }

  const resume = resumeData as ActiveResumeRow;
  const { data: fileData, error: fileError } = await supabase.storage.from("resumes").download(resume.file_path);
  if (fileError || !fileData) {
    console.error(`[outreach:draft:${requestId}] resume_download_error`, fileError?.message);
    return NextResponse.json({ error: fileError?.message || "Failed to load resume file.", request_id: requestId }, { status: 500 });
  }

  const bytes = Buffer.from(await fileData.arrayBuffer());
  const base64 = bytes.toString("base64");
  const mimeType = resume.mime_type || "application/pdf";
  const resumeHash = sha256(bytes.toString("base64"));
  const jdHash = sha256(
    JSON.stringify({
      prompt_version: PROMPT_VERSION,
      title: job.title || "",
      company: job.company || payload.company || "",
      text: job.text,
      tone
    })
  );

  const dayStart = getUtcDayStartIso();
  const { count: baseTodayCount, error: baseTodayCountError } = await supabase
    .from("outreach_base_drafts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", dayStart);

  if (baseTodayCountError) {
    console.error(`[outreach:draft:${requestId}] base_today_count_error`, baseTodayCountError.message);
    if (isMissingRelationError(baseTodayCountError.message)) {
      return NextResponse.json(
        {
          error: "Missing table public.outreach_base_drafts. Run the SQL setup for base drafts first.",
          request_id: requestId
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: baseTodayCountError.message, request_id: requestId }, { status: 500 });
  }

  let usedTodayBase = baseTodayCount || 0;
  let baseDraft: BaseDraftRow | null = null;
  const { data: baseData, error: baseError } = await supabase
    .from("outreach_base_drafts")
    .select("id,subject_template,body_template")
    .eq("user_id", user.id)
    .eq("jd_hash", jdHash)
    .eq("resume_hash", resumeHash)
    .eq("tone", tone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (baseError && !isMissingRelationError(baseError.message)) {
    console.error(`[outreach:draft:${requestId}] base_draft_query_error`, baseError.message);
    return NextResponse.json({ error: baseError.message, request_id: requestId }, { status: 500 });
  }
  if (baseError && isMissingRelationError(baseError.message)) {
    return NextResponse.json(
      {
        error: "Missing table public.outreach_base_drafts. Run the SQL setup for base drafts first.",
        request_id: requestId
      },
      { status: 500 }
    );
  }

  if (baseData && !forceRegenerate) {
    baseDraft = baseData as BaseDraftRow;
  }

  let usage: OpenAiResponsePayload["usage"] = undefined;
  let generatedWithLlm = false;

  if (!baseDraft) {
    if (usedTodayBase >= dailyLimit) {
      return NextResponse.json(
        {
          error: `Daily base-draft limit reached (${dailyLimit}).`,
          request_id: requestId,
          quota: {
            daily_limit: dailyLimit,
            used_today: usedTodayBase,
            remaining_today: 0,
            reset_at_utc: new Date(new Date(dayStart).getTime() + 24 * 60 * 60 * 1000).toISOString()
          }
        },
        { status: 429 }
      );
    }

    const prompt = buildBasePrompt({
      senderName: String(senderName),
      senderRole: "",
      targetCompany: job.company || payload.company || "Company",
      jobRole: job.title || "",
      jobDescription: job.text,
      jobUrl: job.source_url,
      tone
    });

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiApiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              {
                type: "input_file",
                filename: resume.file_name || "resume.pdf",
                file_data: `data:${mimeType};base64,${base64}`
              }
            ]
          }
        ]
      })
    });

    if (!openAiResponse.ok) {
      const failure = await openAiResponse.text();
      console.error(`[outreach:draft:${requestId}] openai_error`, failure);
      await supabase.from("outreach_drafts").insert({
        user_id: user.id,
        contact_name: contact.name || null,
        contact_title: contact.title || null,
        contact_email: contact.email,
        company_name: job.company || payload.company || null,
        job_role: job.title || null,
        job_source_url: job.source_url || null,
        status: "failed",
        model_name: model,
        error_message: failure.slice(0, 1500)
      });
      return NextResponse.json({ error: `LLM request failed: ${failure}`, request_id: requestId }, { status: 500 });
    }

    const llmData = (await openAiResponse.json()) as OpenAiResponsePayload;
    const draft = extractDraftText(llmData);
    if (!draft) {
      const responseShape = JSON.stringify(
        {
          has_output_text: Boolean(llmData.output_text),
          output_items: llmData.output?.length || 0
        },
        null,
        2
      );
      console.error(`[outreach:draft:${requestId}] empty_draft`, responseShape);
      await supabase.from("outreach_drafts").insert({
        user_id: user.id,
        contact_name: contact.name || null,
        contact_title: contact.title || null,
        contact_email: contact.email,
        company_name: job.company || payload.company || null,
        job_role: job.title || null,
        job_source_url: job.source_url || null,
        status: "failed",
        model_name: model,
        error_message: `LLM returned empty draft. ${responseShape}`.slice(0, 1500)
      });
      return NextResponse.json({ error: "LLM returned an empty draft.", request_id: requestId }, { status: 500 });
    }

    const fallbackSubject = "Skilled [JOB_ROLE] eager to join [COMPANY_NAME]";
    const parsed = parseDraft(draft, fallbackSubject);
    usage = llmData.usage;
    generatedWithLlm = true;

    const insertBase = await supabase
      .from("outreach_base_drafts")
      .insert({
        user_id: user.id,
        jd_hash: jdHash,
        resume_hash: resumeHash,
        tone,
        company_name: job.company || payload.company || null,
        job_role: job.title || null,
        subject_template: parsed.subject,
        body_template: parsed.body,
        model_name: model
      })
      .select("id,subject_template,body_template")
      .single();

    if (insertBase.error) {
      console.error(`[outreach:draft:${requestId}] base_draft_insert_error`, insertBase.error.message);
      return NextResponse.json({ error: insertBase.error.message, request_id: requestId }, { status: 500 });
    }
    baseDraft = insertBase.data as BaseDraftRow;
    usedTodayBase += 1;
  }

  const finalDraft = personalizeTemplate({
    subjectTemplate: baseDraft.subject_template,
    bodyTemplate: baseDraft.body_template,
    contactName: contact.name || "Recruiter",
    contactTitle: contact.title || "",
    companyName: job.company || payload.company || "Company",
    jobRole: job.title || "role",
    openingLine: pickOpeningLine(`${contact.email}|${job.title || ""}|${job.company || payload.company || ""}`)
  });

  const creditCost = 1;
  const creditEventType = generatedWithLlm ? "base_generation" : "personalization";
  const { data: creditRows, error: creditError } = await supabase.rpc("consume_credits", {
    p_user_id: user.id,
    p_amount: creditCost,
    p_event_type: creditEventType,
    p_metadata: {
      request_id: requestId,
      model,
      generated_with_llm: generatedWithLlm,
      contact_email: contact.email,
      company: job.company || payload.company || null,
      job_role: job.title || null
    }
  });

  if (creditError) {
    console.error(`[outreach:draft:${requestId}] credit_consume_error`, creditError.message);
    const maybeMissingFn = (creditError.message || "").toLowerCase().includes("function");
    return NextResponse.json(
      {
        error: maybeMissingFn
          ? "Missing credit SQL setup. Run docs/supabase_credits.sql first."
          : creditError.message,
        request_id: requestId
      },
      { status: 500 }
    );
  }

  const credit = ((creditRows as ConsumeCreditsResultRow[] | null) || [])[0];
  if (!credit?.success) {
    return NextResponse.json(
      {
        error: credit?.message || "Insufficient credits.",
        request_id: requestId,
        credits: {
          charged: 0,
          balance: toNumber(credit?.balance),
          event_type: creditEventType
        }
      },
      { status: 402 }
    );
  }

  const creditBalance = toNumber(credit.balance);

  await supabase.from("outreach_drafts").insert({
    user_id: user.id,
    contact_name: contact.name || null,
    contact_title: contact.title || null,
    contact_email: contact.email,
    company_name: job.company || payload.company || null,
    job_role: job.title || null,
    job_source_url: job.source_url || null,
    subject: finalDraft.subject,
    draft_body: finalDraft.body,
    status: "generated",
    model_name: model,
    prompt_tokens: usage?.input_tokens || null,
    completion_tokens: usage?.output_tokens || null,
    total_tokens: usage?.total_tokens || null
  });

  return NextResponse.json({
    subject: finalDraft.subject,
    body: finalDraft.body,
    draft: `Subject: ${finalDraft.subject}\n\n${finalDraft.body}`,
    request_id: requestId,
    generated_with_llm: generatedWithLlm,
    base_cached: !generatedWithLlm,
    credits: {
      charged: creditCost,
      balance: creditBalance,
      event_type: creditEventType
    },
    quota: {
      daily_limit: dailyLimit,
      used_today: usedTodayBase,
      remaining_today: Math.max(dailyLimit - usedTodayBase, 0),
      reset_at_utc: new Date(new Date(dayStart).getTime() + 24 * 60 * 60 * 1000).toISOString()
    }
  });
}
