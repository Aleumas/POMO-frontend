import { useAuth } from "@/app/providers/AuthContext";
import { anonymousUserDisplayName, anonUserAvatarUrl } from "@/utils/user";

export function useCurrentUser() {
  const { user, loading } = useAuth();

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    anonymousUserDisplayName();

  const avatarUrl =
    user?.user_metadata?.picture ||
    user?.user_metadata?.avatar_url ||
    anonUserAvatarUrl(displayName);

  const isAnonymous = !!user && !user.email;

  return {
    user,
    loading,
    displayName,
    avatarUrl,
    isAnonymous,
  };
}
