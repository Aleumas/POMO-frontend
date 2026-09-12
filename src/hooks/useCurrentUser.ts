import { useSession } from "@/lib/auth-client";
import { anonymousUserDisplayName, anonUserAvatarUrl } from "@/utils/user";

export function useCurrentUser() {
  const { data } = useSession();
  const user = data?.user ?? null;
  const isAnonymous = Boolean(user?.isAnonymous) || !user;
  const displayName = user?.name?.trim() || anonymousUserDisplayName();
  const avatarUrl = user?.image || anonUserAvatarUrl(displayName);
  return { user, displayName, avatarUrl, isAnonymous };
}
