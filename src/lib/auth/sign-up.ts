import type { SupabaseClient, User } from "@supabase/supabase-js";

export type SignUpInput = {
  email: string;
  password: string;
  displayName: string;
  emailRedirectTo: string;
};

export type SignUpOutcome = "upgraded" | "created";

export async function signUpOrUpgrade(
  supabase: Pick<SupabaseClient, "auth">,
  currentUser: User | null,
  input: SignUpInput,
): Promise<SignUpOutcome> {
  const trimmedName = input.displayName.trim();
  const data = trimmedName ? { full_name: trimmedName } : {};

  if (currentUser?.is_anonymous) {
    const { error } = await supabase.auth.updateUser(
      { email: input.email, password: input.password, data },
      { emailRedirectTo: input.emailRedirectTo },
    );
    if (error) {
      throw error;
    }
    return "upgraded";
  }

  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { emailRedirectTo: input.emailRedirectTo, data },
  });
  if (error) {
    throw error;
  }
  return "created";
}
