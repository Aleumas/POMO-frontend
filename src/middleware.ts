import { withMiddlewareAuthRequired } from "@auth0/nextjs-auth0/edge";

export async function middleware(request, event) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/room/")) {
    const parts = pathname.split("/");

    const id = parts[2];

    try {
      const response = await fetch(`http://localhost:3000/rooms/${id}`);
      if (!response.ok) {
        throw new Error("Room not found");
      }
    } catch (error) {
      return new Response(error.message, { status: 404 });
    }
  }

  return withMiddlewareAuthRequired()(request, event);
}
