"use client";

import { signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return <Button onClick={() => signOut({})}>Log out</Button>;
}
