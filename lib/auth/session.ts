import "server-only";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/user";
import { isAdminClaims } from "./claims";

// Server-side pieces of the admin sign-in (04 §6). The /login page will call
// these from a server action, which is the only place where the session
// cookies can be written; the browser never receives a Supabase key.

export const signInSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(1000),
});

export type SignInInput = z.infer<typeof signInSchema>;

export type SignInResult =
  { ok: true } | { ok: false; reason: "invalid_credentials" | "not_admin" };

/**
 * Signs in with email and password and stores the session in httpOnly
 * cookies. A valid account without the admin claim is signed out again, so
 * no session cookie is left for an account that cannot use the admin panel.
 * Why one reason for every failed sign-in: telling "no such account" apart
 * from "wrong password" would let anyone probe which emails exist.
 */
export async function signIn(input: SignInInput): Promise<SignInResult> {
  const client = await createSessionClient();
  const { data, error } = await client.auth.signInWithPassword(input);
  if (error !== null || data.session === null) {
    return { ok: false, reason: "invalid_credentials" };
  }
  const { data: verified, error: claimsError } = await client.auth.getClaims();
  if (claimsError !== null || verified === null) {
    return { ok: false, reason: "invalid_credentials" };
  }
  if (!isAdminClaims(verified.claims)) {
    await client.auth.signOut();
    return { ok: false, reason: "not_admin" };
  }
  return { ok: true };
}

/** Ends the admin session and clears the session cookies. */
export async function signOut(): Promise<void> {
  const client = await createSessionClient();
  await client.auth.signOut();
}
