import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));
vi.mock("@/app/providers/AuthContext", () => ({
  useAuth: useAuthMock,
}));

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: createClientMock,
}));

const { signUpOrUpgradeMock } = vi.hoisted(() => ({
  signUpOrUpgradeMock: vi.fn(),
}));
vi.mock("@/lib/auth/sign-up", () => ({
  signUpOrUpgrade: signUpOrUpgradeMock,
}));

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { SignUpForm } from "@/components/sign-up-form";

const anonUser = { id: "anon-1", is_anonymous: true } as User;

function fillForm() {
  fireEvent.change(screen.getByLabelText("Display Name"), {
    target: { value: "Ada" },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "ada@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "correct horse battery" },
  });
  fireEvent.change(screen.getByLabelText("Repeat Password"), {
    target: { value: "correct horse battery" },
  });
}

beforeEach(() => {
  useAuthMock.mockReset();
  createClientMock.mockReset();
  signUpOrUpgradeMock.mockReset();
  pushMock.mockReset();
  createClientMock.mockReturnValue({});
  signUpOrUpgradeMock.mockResolvedValue("upgraded");
});

describe("SignUpForm auth hydration", () => {
  it("disables the submit button and shows loading copy while auth is hydrating", () => {
    useAuthMock.mockReturnValue({ user: null, session: null, loading: true });

    render(<SignUpForm />);

    const button = screen.getByRole("button", { name: /loading/i });
    expect(button).toBeDisabled();
  });

  it("does not call signUpOrUpgrade when submitted while auth is loading", async () => {
    useAuthMock.mockReturnValue({ user: null, session: null, loading: true });

    render(<SignUpForm />);
    fillForm();
    fireEvent.submit(screen.getByRole("button"));

    await Promise.resolve();
    expect(signUpOrUpgradeMock).not.toHaveBeenCalled();
  });

  it("submits with the resolved anonymous user once auth has loaded", async () => {
    useAuthMock.mockReturnValue({
      user: anonUser,
      session: null,
      loading: false,
    });

    render(<SignUpForm />);
    fillForm();
    fireEvent.submit(screen.getByRole("button"));

    await waitFor(() => expect(signUpOrUpgradeMock).toHaveBeenCalledTimes(1));
    expect(signUpOrUpgradeMock).toHaveBeenCalledWith(
      expect.anything(),
      anonUser,
      expect.objectContaining({
        email: "ada@example.com",
        password: "correct horse battery",
        displayName: "Ada",
      }),
    );
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/auth/sign-up-success"),
    );
  });
});
