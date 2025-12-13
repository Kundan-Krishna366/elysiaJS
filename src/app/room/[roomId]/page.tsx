"use client";
import { api } from "@/lib/eden";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useRef } from "react";
import { useUsername } from "@/hooks/use-usename";
import { format } from "date-fns";
import { useRealtime } from "@/lib/realtime-client";

function formatTimeRemaining(seconds: number){
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2,'0')}`;
}


const Page =() => {

  const params = useParams();
  const roomId = params.roomId as string
  const router = useRouter()
  const {username} = useUsername()
  const [input,setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null);
  const [copyStatus,setCopyStatus] = useState("Copy")
  const [timeRemaining,setTimeRemaining] = useState< number | null >(null)

  const {data: ttlData } = useQuery({
    queryKey: ["ttl",roomId],
    queryFn: async () => {
       const res = await api.room.ttl.get({query:{roomId}})
        return res.data
    }   
  })

  useEffect(() => {
    if (ttlData?.ttl !== undefined) setTimeRemaining(ttlData.ttl)
  }, [ttlData])

  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) return

    if (timeRemaining === 0) {
      router.push("/?destroyed=true")
      return
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeRemaining, router])


  const {data:messages,refetch} = useQuery({
    queryKey: ["messages",roomId],
    queryFn: async () => {
      const res = await api.messages.get({query:{roomId}})
      return res.data
    }
  })
  
  const {mutate: sendMessage,isPending} = useMutation({
    mutationFn: async ({text}:{text:string}) => {
      await api.messages.post({
        sender: username,text},{query: { roomId }} )
      setInput("")
    }
  })
  
  useRealtime({
    channels:[roomId],
    events:["chat.message","chat.destroy"],
    onData:({event})=>{
      if(event==="chat.message"){
        refetch()
      }
      if(event==="chat.destroy"){
        router.push("/?destroyed=true")
      }
    }
  })
   
  const {mutate:destroyRoom} = useMutation({
    mutationFn: async () => {
      await api.room.delete(null,{query:{roomId}})
    }
  })

  const copyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setCopyStatus("Copied")
    setTimeout(() => {
      setCopyStatus("Copy")
    }, 2000);
  }

  return( 
 <main className="flex flex-col h-screen max-h-screen overflow-hidden bg-neutral-950 relative">
  {/* Enhanced Background - Cyan Theme */}
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-cyan-900/8 rounded-[60%_40%_30%_70%/60%_30%_70%_40%] blur-3xl animate-blob"></div>
    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-900/8 rounded-[30%_70%_70%_30%/30%_30%_70%_70%] blur-3xl animate-blob animation-delay-2000"></div>
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-800/6 rounded-full blur-3xl"></div>
  </div>

  {/* Redesigned Header with Visible Animated Background */}
  <header className="relative z-10 border-b border-cyan-800/30 backdrop-blur-xl overflow-hidden">
    {/* Strong Animated Header Background */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute -top-32 right-0 w-[400px] h-[400px] bg-gradient-to-br from-cyan-600/15 to-cyan-800/10 rounded-[60%_40%_30%_70%/60%_30%_70%_40%] blur-2xl animate-blob"></div>
      <div className="absolute top-0 left-0 w-[350px] h-[350px] bg-gradient-to-br from-teal-600/12 to-teal-800/8 rounded-[40%_60%_70%_30%/40%_60%_30%_70%] blur-2xl animate-blob animation-delay-4000"></div>
      <div className="absolute top-0 left-1/2 w-[300px] h-[300px] bg-cyan-500/8 rounded-full blur-3xl animate-pulse"></div>
    </div>
    
    <div className="relative bg-gradient-to-br from-neutral-900/60 via-neutral-950/70 to-neutral-900/60 p-6">
      <div className="flex items-center justify-between">
        {/* Left Section - Room Info */}
        <div className="flex items-center gap-6">
          {/* Room Avatar/Icon */}
          <div className="relative group">
            <div className="absolute inset-0 bg-cyan-600/20 blur-xl rounded-full group-hover:bg-cyan-500/30 transition-all duration-500"></div>
            <div className="relative w-12 h-12 bg-gradient-to-br from-cyan-600 to-teal-700 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-900/40 group-hover:scale-110 transition-all duration-300 rotate-3 group-hover:rotate-6 border border-cyan-500/30">
              <svg className="w-6 h-6 text-cyan-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>

          {/* Room Details */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h2 className="text-lg font-bold bg-gradient-to-r from-cyan-300 to-teal-400 bg-clip-text text-transparent">
                Secret Room
              </h2>
              <span className="px-2.5 py-0.5 bg-cyan-900/30 border border-cyan-700/30 rounded-full text-xs font-semibold text-cyan-400">
                Active
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-500 font-medium">ID:</span>
              <code className="text-sm font-mono font-bold text-cyan-400">{roomId}</code>
              <button 
                onClick={copyLink} 
                className="group/copy px-3 py-1 bg-neutral-800/50 hover:bg-cyan-900/40 rounded-lg text-xs font-semibold text-neutral-400 hover:text-cyan-300 transition-all duration-300 border border-neutral-700/30 hover:border-cyan-700/40 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 group-hover/copy:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {copyStatus}
              </button>
            </div>
          </div>
        </div>

        {/* Right Section - Timer & Close */}
        <div className="flex items-center gap-4">
          {/* Timer Card */}
          <div className="px-4 py-2.5 bg-neutral-800/50 border border-neutral-700/40 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${timeRemaining !== null && timeRemaining < 60 ? "bg-red-500 animate-pulse" : "bg-amber-500 animate-pulse"}`}></div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Auto-close</span>
                <span className={`text-base font-bold font-mono ${timeRemaining !== null && timeRemaining < 60 ? "text-red-400" : "text-amber-400"}`}>
                  {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : "--:--"}
                </span>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button 
            onClick={() => destroyRoom()} 
            className="group/close px-4 py-2.5 bg-red-950/40 hover:bg-red-600 border border-red-900/40 hover:border-red-500 rounded-xl text-red-400 hover:text-white font-bold transition-all duration-300 flex items-center gap-2 disabled:opacity-50 hover:scale-105 active:scale-95 shadow-lg hover:shadow-red-900/30"
          >
            <svg className="w-4 h-4 group-hover/close:rotate-90 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-sm uppercase tracking-wide">Close</span>
          </button>
        </div>
      </div>
    </div>
  </header>

  {/* Messages Area */}
  <div className="relative z-10 flex-1 overflow-y-auto p-8 space-y-5">
    {messages?.messages.length === 0 && (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-5">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 bg-cyan-600/10 blur-2xl rounded-full animate-pulse"></div>
            <div className="relative w-24 h-24 rounded-[35%] bg-gradient-to-br from-neutral-800/60 to-neutral-900/60 flex items-center justify-center border border-neutral-700/50 shadow-2xl rotate-6">
              <svg className="w-12 h-12 text-cyan-500/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>
          <div>
            <p className="text-neutral-300 text-lg font-bold">Start the Conversation</p>
            <p className="text-neutral-500 text-sm mt-2">Your messages will appear here</p>
          </div>
        </div>
      </div>
    )}
    
    {messages?.messages.map((msg, index) => (
      <div 
        key={msg.id} 
        className={`flex gap-3 ${msg.sender === username ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-4 duration-500`}
        style={{ animationDelay: `${index * 50}ms` }}
      >
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-lg ${
            msg.sender === username 
              ? "bg-gradient-to-br from-cyan-600 to-cyan-700 text-cyan-50 border-2 border-cyan-500/30" 
              : "bg-gradient-to-br from-teal-700 to-teal-800 text-teal-50 border-2 border-teal-600/30"
          }`}>
            {msg.sender.charAt(0).toUpperCase()}
          </div>
        </div>

        <div className={`flex flex-col gap-1.5 max-w-[65%] ${msg.sender === username ? 'items-end' : 'items-start'}`}>
          <div className="flex items-center gap-2 px-1">
            <span className={`text-xs font-bold ${msg.sender === username ? "text-cyan-400" : "text-teal-400"}`}>
              {msg.sender === username ? "You" : msg.sender}
            </span>
            <span className="text-[10px] text-neutral-600 font-medium">{format(msg.timestamp, "HH:mm")}</span>
          </div>
          
          <div className="relative group/msg">
            <div className={`absolute top-2 ${msg.sender === username ? '-right-1' : '-left-1'} w-3 h-3 ${
              msg.sender === username 
                ? "bg-gradient-to-br from-cyan-700 to-cyan-800" 
                : "bg-neutral-800/80"
            } rotate-45 ${msg.sender === username ? 'rounded-br-sm' : 'rounded-bl-sm'}`}></div>
            
            <div className={`relative ${
              msg.sender === username 
                ? "bg-gradient-to-br from-cyan-700 via-cyan-750 to-cyan-800 shadow-cyan-900/30" 
                : "bg-gradient-to-br from-neutral-800/90 to-neutral-850/90 backdrop-blur-sm shadow-neutral-900/40"
            } rounded-3xl px-5 py-3.5 shadow-xl group-hover/msg:shadow-2xl transition-all duration-300 border ${
              msg.sender === username ? "border-cyan-600/20" : "border-neutral-700/30"
            }`}>
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/0 via-white/5 to-white/0 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              
              <p className={`text-[15px] leading-relaxed break-words relative z-10 ${
                msg.sender === username ? "text-cyan-50" : "text-neutral-50"
              }`}>
                {msg.text}
              </p>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>

  {/* Redesigned Footer with Visible Animated Background */}
  <footer className="relative z-10 border-t border-cyan-800/30 backdrop-blur-xl overflow-hidden">
    {/* Strong Animated Footer Background */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute -bottom-32 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-teal-600/15 to-teal-800/10 rounded-[40%_60%_70%_30%/40%_60%_30%_70%] blur-2xl animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-0 right-0 w-[350px] h-[350px] bg-gradient-to-tl from-cyan-600/12 to-cyan-800/8 rounded-[60%_40%_30%_70%/60%_30%_70%_40%] blur-2xl animate-blob animation-delay-6000"></div>
      <div className="absolute bottom-0 left-1/2 w-[300px] h-[300px] bg-teal-500/8 rounded-full blur-3xl animate-pulse"></div>
    </div>

    <div className="relative bg-gradient-to-br from-neutral-900/60 via-neutral-950/70 to-neutral-900/60 p-6">
      <div className="flex gap-3 items-end">
        <div className="flex-1 relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-600/0 via-cyan-600/30 to-cyan-600/0 rounded-[26px] opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur"></div>
          
          <div className="relative">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-500 group-focus-within:scale-110 group-focus-within:text-cyan-400 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>

            <input 
              ref={inputRef}
              autoFocus 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim()) {
                  sendMessage({text: input})
                  inputRef.current?.focus()
                }
              }} 
              type="text" 
              placeholder="Type your message..." 
              className="w-full bg-neutral-900/60 border-2 border-neutral-800/60 focus:border-cyan-700/50 focus:bg-neutral-900/80 focus:outline-none transition-all duration-300 text-neutral-50 placeholder:text-neutral-500 py-4 pl-14 pr-5 text-base rounded-[26px] hover:border-neutral-700/70 shadow-lg font-medium"
            />

            {input.length > 0 && (
              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                <span className="text-xs text-neutral-600 font-medium">{input.length}</span>
              </div>
            )}
          </div>
        </div>
        
        <button 
          onClick={() => {
            sendMessage({text: input})
            inputRef.current?.focus()
          }} 
          disabled={!input.trim() || isPending} 
          className="group/btn relative overflow-hidden bg-gradient-to-br from-cyan-600 via-cyan-700 to-teal-700 hover:from-cyan-500 hover:via-cyan-600 hover:to-teal-600 p-4 rounded-full text-white font-bold transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xl shadow-cyan-900/50 hover:shadow-cyan-800/70 hover:scale-110 active:scale-95 disabled:hover:scale-100 border-2 border-cyan-500/40 hover:border-cyan-400/60"
        >
          <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
          <div className="absolute inset-0 rounded-full bg-cyan-400/0 group-hover/btn:bg-cyan-400/20 group-hover/btn:animate-pulse transition-all duration-500"></div>
          
          <svg className="relative w-6 h-6 group-hover/btn:rotate-45 group-hover/btn:scale-110 transition-all duration-500 ease-out" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-neutral-600">
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-cyan-700" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          <span>End-to-end encrypted</span>
        </div>
        <span className="text-neutral-800">•</span>
        <div className="flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5 text-cyan-700" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
          </svg>
          <span>Self-destructs</span>
        </div>
        <span className="text-neutral-800">•</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-600 animate-pulse"></div>
          <span>{messages?.messages.length || 0} messages</span>
        </div>
      </div>
    </div>
  </footer>
</main>



)
}

export default Page;