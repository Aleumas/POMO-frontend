import { UserProvider } from "@auth0/nextjs-auth0/client";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export default function App({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
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
          <Toaster />
        </body>
      </html>
    </UserProvider>
  );
}
