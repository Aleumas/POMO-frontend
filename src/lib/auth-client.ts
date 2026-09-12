import { createAuthClient } from "better-auth/react";
import { anonymousClient, jwtClient } from "better-auth/client/plugins";

// better-auth's generic client-side type inference (createAuthClient<Option>)
// resolves the session/user shape to `never` unless the server's concrete
// endpoint types are threaded through, which this version doesn't do from
// plugin config alone. Runtime behavior is correct; we type the well-documented
// session/user shape ourselves instead of fighting the library's generics.
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  isAnonymous?: boolean | null;
};

export const authClient = createAuthClient({
  plugins: [anonymousClient(), jwtClient()],
});

export const useSession = authClient.useSession as unknown as () => {
  data: { user: SessionUser; session: { id: string } } | null;
  isPending: boolean;
  error: unknown;
};

export const { signIn, signOut } = authClient;

export async function ensureAnonUser(): Promise<void> {
  const { data } = await authClient.getSession({ query: {} });
  if (!data?.session) {
    await authClient.signIn.anonymous({ query: {} });
  }
}
