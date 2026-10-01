import { createClient } from "@/lib/supabase/server";

export async function getVerifiedSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  const user = session?.user;

  if (!user?.id || !user.email || !user.email_confirmed_at) return null;
  if (!session.access_token) return null;

  return {
    accessToken: session.access_token,
    email: user.email,
  };
}
