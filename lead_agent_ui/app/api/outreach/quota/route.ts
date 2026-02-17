import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getUtcDayStartIso(): string {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  return start.toISOString();
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const dailyLimit = Number.parseInt(process.env.DRAFTS_DAILY_LIMIT || "10", 10);

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase environment is missing.", request_id: requestId }, { status: 500 });
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
    return NextResponse.json({ error: "Unauthorized", request_id: requestId }, { status: 401 });
  }

  const dayStart = getUtcDayStartIso();
  const { count: usedBaseDrafts, error: baseCountError } = await supabase
    .from("outreach_base_drafts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", dayStart);

  if (baseCountError) {
    return NextResponse.json({ error: baseCountError.message, request_id: requestId }, { status: 500 });
  }

  await supabase.from("user_credit_wallets").upsert({ user_id: user.id }, { onConflict: "user_id" });
  const { data: walletData, error: walletError } = await supabase
    .from("user_credit_wallets")
    .select("balance")
    .eq("user_id", user.id)
    .maybeSingle();

  if (walletError) {
    return NextResponse.json({ error: walletError.message, request_id: requestId }, { status: 500 });
  }

  const { count: personalizedDraftsToday, error: personalizationCountError } = await supabase
    .from("outreach_drafts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", dayStart);

  if (personalizationCountError) {
    return NextResponse.json({ error: personalizationCountError.message, request_id: requestId }, { status: 500 });
  }

  const used = usedBaseDrafts || 0;
  return NextResponse.json({
    request_id: requestId,
    credits: {
      balance: Number.parseFloat(String(walletData?.balance ?? 0))
    },
    quota: {
      daily_limit: dailyLimit,
      used_today: used,
      remaining_today: Math.max(dailyLimit - used, 0),
      reset_at_utc: new Date(new Date(dayStart).getTime() + 24 * 60 * 60 * 1000).toISOString()
    },
    usage: {
      personalized_drafts_today: personalizedDraftsToday || 0
    }
  });
}
