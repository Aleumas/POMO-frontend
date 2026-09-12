import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { LogoutButton } from "@/components/logout-button";
import { getAuth } from "@/lib/auth";

export default async function ProtectedPage() {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/auth/login");

  return (
    <div className="flex h-svh w-full items-center justify-center gap-2">
      <p>
        Hello <span>{session.user.name ?? session.user.id}</span>
      </p>
      <LogoutButton />
    </div>
  );
}
