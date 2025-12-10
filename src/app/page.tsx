"use client";
import Image from "next/image";
import { use, useState } from "react";

export default function Home() {
  const [username, setUsername] = useState("");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-md">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="flex-items-center text-zinc-500">Your Identity</label>
            <div className="flex-items-center gap-3">
              <div className="flex-1 bg-zinc-950 border border-zinc-800 p-3 text-sm text-zinc-400 font-mono"> {username}

            </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </main>
  );
}
