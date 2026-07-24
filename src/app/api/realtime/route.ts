import { handle } from "@upstash/realtime"
import { realtime } from "@/lib/realtime"
import { redis } from "@/lib/redis"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const GET = handle({
  realtime,
  middleware: async ({ request, channels }) => {
    if (channels.length !== 1) {
      return new Response("Exactly one room is required", { status: 400 });
    }
    const cookieHeader = request.headers.get("cookie") || "";
    for (const channel of channels) {
      const cookieName = `x-auth-token-${channel}`;
      const token = cookieHeader
        .split(";")
        .map((cookie) => cookie.trim())
        .find((cookie) => cookie.startsWith(`${cookieName}=`))
        ?.slice(cookieName.length + 1);

      if (!token) {
        return new Response("Unauthorized", { status: 401 });
      }

      const connected = await redis.hget<string[]>(`meta:${channel}`, "connected");
      if (!connected || !connected.includes(token)) {
        return new Response("Forbidden", { status: 403 });
      }
    }
  }
})
