import type { User } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { signUpOrUpgrade } from "@/lib/auth/sign-up";

const input = {
  email: "ada@example.com",
  password: "correct horse battery",
  displayName: "  Ada  ",
  emailRedirectTo: "http://localhost:3001/protected",
};

const anonUser = { id: "anon-1", is_anonymous: true } as User;
const permanentUser = { id: "perm-1", is_anonymous: false } as User;

function fakeAuth() {
  return {
    updateUser: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
  };
}

describe("signUpOrUpgrade", () => {
  it("upgrades an anonymous user in place", async () => {
    const auth = fakeAuth();

    const outcome = await signUpOrUpgrade({ auth } as any, anonUser, input);

    expect(outcome).toBe("upgraded");
    expect(auth.updateUser).toHaveBeenCalledWith(
      {
        email: "ada@example.com",
        password: "correct horse battery",
        data: { full_name: "Ada" },
      },
      { emailRedirectTo: "http://localhost:3001/protected" },
    );
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("creates a new account when there is no current user", async () => {
    const auth = fakeAuth();

    const outcome = await signUpOrUpgrade({ auth } as any, null, input);

    expect(outcome).toBe("created");
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "ada@example.com",
      password: "correct horse battery",
      options: {
        emailRedirectTo: "http://localhost:3001/protected",
        data: { full_name: "Ada" },
      },
    });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("creates a new account when the current user is already permanent", async () => {
    const auth = fakeAuth();

    await signUpOrUpgrade({ auth } as any, permanentUser, input);

    expect(auth.signUp).toHaveBeenCalledTimes(1);
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("omits full_name when the display name is blank", async () => {
    const auth = fakeAuth();

    await signUpOrUpgrade({ auth } as any, anonUser, {
      ...input,
      displayName: "   ",
    });

    expect(auth.updateUser.mock.calls[0][0]).toEqual({
      email: "ada@example.com",
      password: "correct horse battery",
      data: {},
    });
  });

  it("throws the supabase error", async () => {
    const error = new Error("Email rate limit exceeded");
    const auth = fakeAuth();
    auth.updateUser.mockResolvedValue({ error });

    await expect(
      signUpOrUpgrade({ auth } as any, anonUser, input),
    ).rejects.toBe(error);
  });
});
