"use client";

import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { useEnsureAnonUser } from "@/hooks/useEnsureAnonUser";
import { AuthProvider } from "@/app/providers/AuthContext";

export default function App({ children }: { children: React.ReactNode }) {
  useEnsureAnonUser();
  return (
    <AuthProvider>
      <html>
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <div className="h-screen w-screen">{children}</div>
          </ThemeProvider>
          <Toaster richColors />
        </body>
      </html>
    </AuthProvider>
  );
}
