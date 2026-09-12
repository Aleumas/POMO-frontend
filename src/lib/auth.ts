import { betterAuth } from "better-auth";
import { anonymous, jwt } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getAuth() {
  const { env } = await getCloudflareContext({ async: true });
  const origin = env.BETTER_AUTH_URL;

  return betterAuth({
    database: env.DB, // D1 binding, auto-detected (Better Auth >= 1.5)
    baseURL: origin,
    secret: env.BETTER_AUTH_SECRET,
    socialProviders: {
      google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
      discord: { clientId: env.DISCORD_CLIENT_ID, clientSecret: env.DISCORD_CLIENT_SECRET },
      github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET },
    },
    plugins: [
      anonymous({
        disableDeleteAnonymousUser: false,
        onLinkAccount: async ({ anonymousUser, newUser }) => {
          // Preserve the guest's focus history: re-point rows to the new id.
          const { env } = await getCloudflareContext({ async: true });
          await env.DB.prepare(
            `UPDATE focus_session SET user_id = ? WHERE user_id = ?`,
          ).bind(newUser.user.id, anonymousUser.user.id).run();
        },
      }),
      jwt({ jwt: { issuer: origin, audience: origin, expirationTime: "1h" } }),
      nextCookies(), // MUST be last
    ],
  });
}
