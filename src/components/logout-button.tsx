"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      onClick={() =>
        signOut({ fetchOptions: { onSuccess: () => router.push("/auth/login") } })
      }
    >
      Log out
    </Button>
  );
}
