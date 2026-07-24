import { redis } from "@/lib/redis";

const claimUsernameScript = `
local current = redis.call("HGET", KEYS[1], ARGV[1])
if current then
  if current == ARGV[2] then return 1 end
  return -1
end
for _, username in ipairs(redis.call("HVALS", KEYS[1])) do
  if username == ARGV[2] then return 0 end
end
redis.call("HSET", KEYS[1], ARGV[1], ARGV[2])
if tonumber(ARGV[3]) > 0 then redis.call("EXPIRE", KEYS[1], ARGV[3]) end
return 1
`;

export type UsernameClaim = "claimed" | "taken" | "mismatch";

export async function claimUsername(roomId: string, token: string, username: string, ttl: number): Promise<UsernameClaim> {
  const result = await redis.eval<[string, string, string], number>(
    claimUsernameScript,
    [`room:${roomId}:users`],
    [token, username, String(ttl)],
  );

  if (result === 1) return "claimed";
  return result === 0 ? "taken" : "mismatch";
}
