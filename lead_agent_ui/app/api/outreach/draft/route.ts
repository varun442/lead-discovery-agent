import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  PROMPT_VERSION,
  buildBasePrompt,
  extractDraftText,
  getUtcDayStartIso,
  isMissingRelationError,
  parseDraft,
  personalizeTemplate,
  pickOpeningLine,
  sha256,
  toNumber,
  type OpenAiResponsePayload,
} from "@/lib/outreach-draft-helpers";

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

type DraftErrorCode = "OUT_OF_CREDITS" | "DAILY_LIMIT_REACHED" | "UNKNOWN";

function buildErrorResponse(
  requestId: string,
  status: number,
  error: string,
  errorCode: DraftErrorCode = "UNKNOWN",
  extra: Record<string, unknown> = {}
) {
  return NextResponse.json(
    {
      error,
      error_code: errorCode,
      request_id: requestId,
      ...extra
    },
    { status }
  );
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const openAiApiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const dailyLimit = Number.parseInt(process.env.DRAFTS_DAILY_LIMIT || "10", 10);

  if (!supabaseUrl || !supabaseAnonKey) {
    return buildErrorResponse(requestId, 500, "Supabase environment is missing.");
  }
  if (!openAiApiKey) {
    return buildErrorResponse(requestId, 500, "OPENAI_API_KEY is missing on server.");
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
    return buildErrorResponse(requestId, 401, "Unauthorized");
  }

  const payload = (await request.json()) as DraftRequestPayload;
  const contact = payload.contact;
  const job = payload.job;
  const tone = payload.tone?.trim() || "professional";
  const forceRegenerate = Boolean(payload.force_regenerate);

  if (!contact?.email || !job?.text) {
    return buildErrorResponse(requestId, 400, "Missing contact email or job description.");
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
    return buildErrorResponse(requestId, 500, resumeError.message);
  }
  if (!resumeData) {
    return buildErrorResponse(requestId, 400, "No active resume found. Upload resume in profile first.");
  }

  const resume = resumeData as ActiveResumeRow;
  const { data: fileData, error: fileError } = await supabase.storage.from("resumes").download(resume.file_path);
  if (fileError || !fileData) {
    console.error(`[outreach:draft:${requestId}] resume_download_error`, fileError?.message);
    return buildErrorResponse(requestId, 500, fileError?.message || "Failed to load resume file.");
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
      return buildErrorResponse(requestId, 500, "Missing table public.outreach_base_drafts. Run the SQL setup for base drafts first.");
    }
    return buildErrorResponse(requestId, 500, baseTodayCountError.message);
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
    return buildErrorResponse(requestId, 500, baseError.message);
  }
  if (baseError && isMissingRelationError(baseError.message)) {
    return buildErrorResponse(requestId, 500, "Missing table public.outreach_base_drafts. Run the SQL setup for base drafts first.");
  }

  if (baseData && !forceRegenerate) {
    baseDraft = baseData as BaseDraftRow;
  }

  let usage: OpenAiResponsePayload["usage"] = undefined;
  let generatedWithLlm = false;

  if (!baseDraft) {
    if (usedTodayBase >= dailyLimit) {
      return buildErrorResponse(requestId, 429, `Daily base-draft limit reached (${dailyLimit}).`, "DAILY_LIMIT_REACHED", {
        quota: {
          daily_limit: dailyLimit,
          used_today: usedTodayBase,
          remaining_today: 0,
          reset_at_utc: new Date(new Date(dayStart).getTime() + 24 * 60 * 60 * 1000).toISOString()
        }
      }
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
      return buildErrorResponse(requestId, 500, `LLM request failed: ${failure}`);
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
      return buildErrorResponse(requestId, 500, "LLM returned an empty draft.");
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
      return buildErrorResponse(requestId, 500, insertBase.error.message);
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
    return buildErrorResponse(
      requestId,
      500,
      maybeMissingFn ? "Missing credit SQL setup. Run docs/supabase_credits.sql first." : creditError.message
    );
  }

  const credit = ((creditRows as ConsumeCreditsResultRow[] | null) || [])[0];
  if (!credit?.success) {
    return buildErrorResponse(requestId, 402, credit?.message || "Insufficient credits.", "OUT_OF_CREDITS", {
      credits: {
        charged: 0,
        balance: toNumber(credit?.balance),
        event_type: creditEventType
      }
    }
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
