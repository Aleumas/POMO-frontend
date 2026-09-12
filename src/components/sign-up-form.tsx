"use client";

import { cn } from "@/lib/utils";
import { SocialSignIn } from "@/components/social-sign-in";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>
            Create an account to keep your focus history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SocialSignIn callbackURL="/protected" />
        </CardContent>
      </Card>
    </div>
  );
}
