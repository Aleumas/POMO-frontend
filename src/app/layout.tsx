import { UserProvider } from "@auth0/nextjs-auth0/client";

export default function App({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <html>
        <body>{children}</body>
      </html>
    </UserProvider>
  );
}
