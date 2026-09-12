"use client";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

const providers = [
  { id: "google", label: "Continue with Google" },
  { id: "discord", label: "Continue with Discord" },
  { id: "github", label: "Continue with GitHub" },
] as const;

export function SocialSignIn({ callbackURL = "/" }: { callbackURL?: string }) {
  return (
    <div className="flex flex-col gap-3">
      {providers.map((p) => (
        <Button key={p.id} onClick={() => signIn.social({ provider: p.id, callbackURL })}>
          {p.label}
        </Button>
      ))}
    </div>
  );
}
