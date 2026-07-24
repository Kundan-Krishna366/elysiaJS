import { redis } from "@/lib/redis";

const fixedWindowScript = `
local count = redis.call("INCR", KEYS[1])
if count == 1 then redis.call("EXPIRE", KEYS[1], ARGV[1]) end
if count > tonumber(ARGV[2]) then return 0 end
return 1
`;

export function isWithinRateLimit(key: string, limit: number, windowSeconds: number) {
  return redis.eval<[string, string], number>(fixedWindowScript, [key], [String(windowSeconds), String(limit)]);
}
