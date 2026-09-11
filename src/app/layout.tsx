"use client";

import { Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { useEnsureAnonUser } from "@/hooks/useEnsureAnonUser";
import { AuthProvider } from "@/app/providers/AuthContext";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export default function App({ children }: { children: React.ReactNode }) {
  useEnsureAnonUser();
  return (
    <AuthProvider>
      <html>
        <body className={`${spaceGrotesk.variable} font-sans`}>
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
