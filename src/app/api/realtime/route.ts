import { handle } from "@upstash/realtime"
import { realtime } from "@/lib/realtime"
import { redis } from "@/lib/redis"

export const GET = handle({
  realtime,
  middleware: async ({ request, channels }) => {
    const cookieHeader = request.headers.get("cookie") || "";
    for (const channel of channels) {
      const cookieName = `x-auth-token-${channel}`;
      const match = cookieHeader.match(new RegExp(`(?:^|;)\\s*${cookieName}=([^;]*)`));
      const token = match ? match[1] : null;

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