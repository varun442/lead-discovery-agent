import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { normalizeHistoryPayload, type CompanySearchHistoryInput } from "@/lib/company-search-history";
import type { CompanySearchHistoryItem } from "@/lib/types";

function parseLimit(raw: string | null): number {
  const parsed = Number.parseInt(raw || "15", 10);
  if (Number.isNaN(parsed) || parsed <= 0) return 15;
  return Math.min(parsed, 50);
}

function isMissingResultSnapshotColumnError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("result_snapshot") && normalized.includes("column");
}

async function createAuthedClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { errorResponse: NextResponse.json({ error: "Supabase environment is missing." }, { status: 500 }) };
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
    return { errorResponse: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { supabase, user };
}

export async function GET(request: NextRequest) {
  const auth = await createAuthedClient(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
  const { data, error } = await auth.supabase
    .from("company_search_history")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    items: ((data as CompanySearchHistoryItem[] | null) || []).slice(0, limit)
  });
}

export async function POST(request: NextRequest) {
  const auth = await createAuthedClient(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!rawPayload || typeof rawPayload !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = normalizeHistoryPayload(rawPayload as CompanySearchHistoryInput);
  if (!payload.website_url) {
    return NextResponse.json({ error: "website_url is required" }, { status: 400 });
  }
  if (!payload.search_domain) {
    return NextResponse.json({ error: "Unable to derive search domain" }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const upsertPayload = {
    user_id: auth.user.id,
    search_domain: payload.search_domain,
    website_url: payload.website_url,
    linkedin_url: payload.linkedin_url,
    company_name: payload.company_name,
    contacts_count: payload.contacts_count,
    status: payload.status,
    error_message: payload.error_message,
    result_snapshot: payload.result_snapshot,
    last_searched_at: nowIso,
    updated_at: nowIso
  };

  const { data, error } = await auth.supabase
    .from("company_search_history")
    .upsert(upsertPayload, { onConflict: "user_id,search_domain" })
    .select("*")
    .single();

  if (error && isMissingResultSnapshotColumnError(error.message)) {
    const fallbackPayload = {
      user_id: auth.user.id,
      search_domain: payload.search_domain,
      website_url: payload.website_url,
      linkedin_url: payload.linkedin_url,
      company_name: payload.company_name,
      contacts_count: payload.contacts_count,
      status: payload.status,
      error_message: payload.error_message,
      last_searched_at: nowIso,
      updated_at: nowIso
    };
    const fallback = await auth.supabase
      .from("company_search_history")
      .upsert(fallbackPayload, { onConflict: "user_id,search_domain" })
      .select("*")
      .single();

    if (fallback.error) {
      return NextResponse.json({ error: fallback.error.message }, { status: 500 });
    }

    return NextResponse.json({
      item: fallback.data as CompanySearchHistoryItem,
      warning: "History cache column missing. Run supabase_company_searches.sql migration for instant result restore."
    });
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item: data as CompanySearchHistoryItem });
}

export async function DELETE(request: NextRequest) {
  const auth = await createAuthedClient(request);
  if ("errorResponse" in auth) return auth.errorResponse;

  const all = request.nextUrl.searchParams.get("all");
  if (all === "true") {
    const { data, error } = await auth.supabase.from("company_search_history").delete().eq("user_id", auth.user.id).select("id");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ deleted_count: (data || []).length });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query param is required" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("company_search_history")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .select("id");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted_count: (data || []).length });
}
