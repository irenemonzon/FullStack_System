import "../env.js";

// Signs in a real Supabase auth user via the password grant and returns
// its access token, so tests exercise the real JWT verification path
// (JWKS signature, expiry, etc.) rather than fabricating tokens.
export async function signIn(email: string, password: string): Promise<string> {
  const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_ANON_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json()) as { access_token?: string };
  if (!res.ok || !body.access_token) {
    throw new Error(`Sign-in failed for ${email}: ${JSON.stringify(body)}`);
  }
  return body.access_token;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set in .env — needed for tests`);
  return value;
}

export const TEST_VOLUNTEER = {
  email: required("TEST_VOLUNTEER_EMAIL"),
  password: required("TEST_VOLUNTEER_PASSWORD"),
};

export const TEST_ADMIN = {
  email: required("TEST_ADMIN_EMAIL"),
  password: required("TEST_ADMIN_PASSWORD"),
};
