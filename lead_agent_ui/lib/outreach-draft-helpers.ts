import { createHash } from "node:crypto";

export interface OpenAiResponsePayload {
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

export const PROMPT_VERSION = "v3_firstname_joburl_no_emdash";

export const OPENING_LINE_CANDIDATES = [
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

export function extractDraftText(payload: OpenAiResponsePayload): string {
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

export function getUtcDayStartIso(): string {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  return start.toISOString();
}

export function isMissingRelationError(message: string | undefined): boolean {
  const msg = (message || "").toLowerCase();
  return msg.includes("relation") && msg.includes("does not exist");
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number.parseFloat(value);
  return 0;
}

export function parseDraft(draft: string, fallbackSubject: string): { subject: string; body: string } {
  const lines = draft.split("\n");
  const subjectLine = lines.find((line) => /^subject:/i.test(line.trim()));
  const subject = subjectLine ? subjectLine.replace(/^subject:\s*/i, "").trim() : fallbackSubject;
  const body = subjectLine ? lines.slice(lines.indexOf(subjectLine) + 1).join("\n").trim() : draft.trim();
  return { subject, body };
}

export function pickOpeningLine(seed: string): string {
  const hash = createHash("sha256").update(seed).digest("hex");
  const index = Number.parseInt(hash.slice(0, 8), 16) % OPENING_LINE_CANDIDATES.length;
  return OPENING_LINE_CANDIDATES[index];
}

export function extractFirstName(name: string): string {
  const fallback = "Hiring Team";
  const normalized = (name || "").trim().replace(/\s+/g, " ");
  if (!normalized) return fallback;

  for (const token of normalized.split(" ")) {
    const cleaned = token.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
    if (cleaned && /[\p{L}]/u.test(cleaned)) {
      return cleaned;
    }
  }
  return fallback;
}

export function stripEmAndEnDashes(text: string): string {
  return text
    .replace(/[—–]/g, ", ")
    .replace(/[ \t]*,[ \t]*/g, ", ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .trim();
}

export function buildBasePrompt(params: {
  senderName: string;
  senderRole: string;
  targetCompany: string;
  jobRole: string;
  jobDescription: string;
  jobUrl?: string;
  tone: string;
}): string {
  const { senderName, senderRole, targetCompany, jobRole, jobDescription, jobUrl, tone } = params;

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
   - [RECIPIENT_FIRST_NAME]
   - [RECIPIENT_TITLE]
   - [COMPANY_NAME]
   - [JOB_ROLE]
   - [JOB_URL]
9) The sentence immediately after greeting must be a concise, human opening line in this style:
   "I know your inbox is probably overflowing right now, so I'll make this quick and worthwhile."
   "I'll keep this short because I know your time is valuable."
   "You're likely juggling multiple priorities, so I'll get straight to why I'm reaching out."
   "I'll skip the fluff and get straight to why this message matters."
   "If you give me 30 seconds, I'll explain why I'm a strong fit."
   Do NOT reuse this exact sentence:
   "I know you're busy with your important work, so I'll get straight to the point without wasting your time."
10) Keep that opening line to one sentence only.
11) Do NOT use em dash or en dash characters anywhere in the final output.

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

Hey [RECIPIENT_FIRST_NAME],

[OPENING_LINE]

I am [Your Name], a [Your Job Title] with significant experience in [Your Key Skill Area] that [Brief Impressive Stat or Achievement].

Here are a few highlights of my experience:

1. [Technical Skill or Achievement 1 aligned to JD]
2. [Technical Skill or Achievement 2 aligned to JD]
3. [Technical Skill or Achievement 3 aligned to JD]
4. [Technical Skill or Achievement 4 aligned to JD]

[List of Technologies/Skills relevant to this role only]

And I have attached my resume; you can check more of my work.

I noticed a job opportunity at your [Company] hiring for a [Job Role] (job URL: [JOB_URL]), and I couldn’t resist reaching out. I've researched your project and found it incredibly interesting, and I am eager to contribute to your team. I believe I would be a valuable asset to [Company Name]. Please give me a chance to prove myself, test me, observe my work, and then decide if I am a good fit.

I totally understand that you are busy and it's okay even if you don’t respond to my mail. I will do a follow up in the next 3 days just to make sure that you have read my mail.

Warm regards,
[Your Name]
`.trim();
}

export function personalizeTemplate(params: {
  subjectTemplate: string;
  bodyTemplate: string;
  contactName: string;
  contactTitle: string;
  companyName: string;
  jobRole: string;
  jobUrl: string;
  openingLine: string;
}): { subject: string; body: string } {
  const { subjectTemplate, bodyTemplate, contactName, contactTitle, companyName, jobRole, jobUrl, openingLine } = params;
  const recipient = contactName || "Hiring Team";
  const firstName = extractFirstName(contactName || "");
  const role = jobRole || "role";
  const company = companyName || "company";
  const safeJobUrl = (jobUrl || "").trim() || "the role link was not provided";

  const replacer = (input: string) =>
    input
      .replaceAll("[RECIPIENT_NAME]", recipient)
      .replaceAll("[RECIPIENT_FIRST_NAME]", firstName)
      .replaceAll("[RECIPIENT_TITLE]", contactTitle || "Hiring Team")
      .replaceAll("[COMPANY_NAME]", company)
      .replaceAll("[JOB_ROLE]", role)
      .replaceAll("[JOB_URL]", safeJobUrl)
      .replaceAll("[OPENING_LINE]", openingLine)
      .replaceAll("[Recruiter's Name]", firstName)
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
    subject: stripEmAndEnDashes(replacer(subjectTemplate)),
    body: stripEmAndEnDashes(replacer(bodyTemplate))
  };
}
