"use client";
import { api } from "@/lib/eden";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useUsername } from "@/hooks/use-username";
import { format } from "date-fns";
import { useRealtime } from "@/lib/realtime-client";
import type { Message } from "@/lib/realtime";

interface MessagesData {
  messages: Message[];
}

function formatTimeRemaining(seconds: number){
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2,'0')}`;
}

const Page = () => {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const {username} = useUsername();
  const [input,setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null); 
  const [copyStatus,setCopyStatus] = useState("Copy ID");
  const [timeRemaining,setTimeRemaining] = useState< number | null >(null);
  const [prevTtl, setPrevTtl] = useState<number | undefined>(undefined);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSubmitTime = useRef(0);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    // Only autofocus on desktop/wider screens to prevent automatic keyboard popup on mobile entry
    if (inputRef.current && window.innerWidth >= 768) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!isSubmitting && inputRef.current) {
      // Only refocus if desktop, or if the input already has active focus
      if (window.innerWidth >= 768 || document.activeElement === inputRef.current) {
        inputRef.current.focus();
      }
    }
  }, [isSubmitting]);

  // Clean up user token from Redis room connected metadata when they navigate away or close the tab
  useEffect(() => {
    const leaveRoom = () => {
      fetch(`/api/room/leave?roomId=${roomId}`, {
        method: "POST",
        keepalive: true
      });
    };
    window.addEventListener("beforeunload", leaveRoom);
    return () => {
      window.removeEventListener("beforeunload", leaveRoom);
      leaveRoom();
    };
  }, [roomId]);

  const {data: ttlData} = useQuery({
    queryKey: ["ttl",roomId],
    queryFn: async () => {
       const res = await api.room.ttl.get({query:{roomId}});
       if (res.error) {
         if (res.status === 401) {
           router.push("/?error=unauthorized");
         } else {
           router.push("/?error=room-not-found");
         }
         throw new Error("Failed to fetch TTL");
       }
       return res.data;
    }   
  });

  // Sync TTL countdown state during rendering phase to avoid synchronous state updates in useEffect
  if (ttlData?.ttl !== undefined && ttlData.ttl !== prevTtl) {
    setPrevTtl(ttlData.ttl);
    setTimeRemaining(ttlData.ttl);
  }

  useEffect(() => {
    if (timeRemaining === null) return;
    if (timeRemaining <= 0) {
      router.push("/?destroyed=true");
      return;
    }

    const timerId = setTimeout(() => {
      setTimeRemaining((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timerId);
  }, [timeRemaining, router]);

  const {data:messages, isPending: isMessagesPending} = useQuery({
    queryKey: ["messages",roomId],
    queryFn: async () => {
       const res = await api.messages.get({query:{roomId}});
       if (res.error) {
         if (res.status === 401) {
           router.push("/?error=unauthorized");
         } else {
           router.push("/?error=room-not-found");
         }
         throw new Error("Failed to fetch messages");
       }
       return res.data;
    },
    refetchInterval: false,
    staleTime: Infinity
  });

  useEffect(() => {
    if (bottomRef.current && messages?.messages) {
      // Use instant scroll on initial load, smooth scroll for incoming messages
      if (isFirstLoad.current) {
        bottomRef.current.scrollIntoView({ behavior: "auto" });
        isFirstLoad.current = false;
      } else {
        bottomRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages?.messages]);

  useEffect(() => {
    const handleResize = () => {
      if (document.activeElement === inputRef.current) {
        bottomRef.current?.scrollIntoView({ behavior: "auto" });
      }
    };
    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener("resize", handleResize);
    }
    return () => {
      if (viewport) {
        viewport.removeEventListener("resize", handleResize);
      }
    };
  }, []);
  
  const {mutate: sendMessage} = useMutation({
    mutationFn: async ({text}:{text:string}) => {
      const res = await api.messages.post({
        sender: username,
        text
      },{query: { roomId }});
      if (res.error) {
        throw new Error("Failed to send message");
      }
      return res.data;
    },
    onMutate: async (newMessage) => {
      const optimisticMessage: Message & { token: string } = {
        id: `temp-${Date.now()}`,
        sender: username,
        text: newMessage.text,
        timestamp: Date.now(),
        roomId,
        token: 'current'
      };
      
      queryClient.setQueryData<MessagesData>(["messages", roomId], (old) => ({
        messages: [...(old?.messages || []), optimisticMessage]
      }));
      
      return { optimisticMessage };
    },
    onSuccess: () => {
      setIsSubmitting(false);
    },
    onError: (error, variables, context) => {
      queryClient.setQueryData<MessagesData>(["messages", roomId], (old) => ({
        messages: old?.messages.filter((m) => m.id !== context?.optimisticMessage.id) || []
      }));
      setInput(variables.text); // Restore the message text to input on failure
      setIsSubmitting(false);
    }
  });
  
  useRealtime({
    channels:[roomId],
    events:["chat.message","chat.destroy"],
    onData:({event, data})=>{
      if(event==="chat.message"){
        queryClient.setQueryData<MessagesData>(["messages", roomId], (old) => {
          const exists = old?.messages.some((m) => m.id === data.id);
          if (exists) return old;
          return {
            messages: [...(old?.messages || []).filter((m) => !m.id.startsWith('temp-')), data]
          };
        });
      }
      if(event==="chat.destroy"){
        router.push("/?destroyed=true");
      }
    }
  });
   
  const {mutate:destroyRoom} = useMutation({
    mutationFn: async () => {
      await api.room.delete(null,{query:{roomId}});
    }
  });

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopyStatus("Copied");
    setTimeout(() => {
      setCopyStatus("Copy ID");
    }, 2000);
  };

  const handleSendMessage = () => {
    const now = Date.now()
    
    if (now - lastSubmitTime.current < 500) {
      return
    }
    
    const trimmedInput = input.trim()
    if (!trimmedInput) return
    
    lastSubmitTime.current = now;
    setInput(""); // Clear input immediately
    setIsSubmitting(true);
    sendMessage({text: trimmedInput});
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleInputFocus = () => {
    // Scroll to bottom when input is focused to prevent layout shifts hiding text
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 120);
  };

  return( 
    <div className="flex flex-col h-[100vh] h-[100dvh] w-full overflow-hidden bg-black text-zinc-100 font-sans selection:bg-white selection:text-black">
      <header className="shrink-0 h-12 sm:h-14 landscape:h-10 border-b border-zinc-900 bg-black/80 backdrop-blur-xl flex items-center justify-between pl-[calc(0.75rem+env(safe-area-inset-left,0px))] pr-[calc(0.75rem+env(safe-area-inset-right,0px))] sm:pl-[calc(1rem+env(safe-area-inset-left,0px))] sm:pr-[calc(1rem+env(safe-area-inset-right,0px))] md:px-6 z-20">
        <div className="flex items-center gap-2 sm:gap-6">
          <button 
            onClick={() => router.push('/')}
            className="font-bold tracking-tight text-sm sm:text-base text-white select-none hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-zinc-800 rounded px-1 -mx-1"
            aria-label="HiddenTalk Home"
          >
            HiddenTalk
          </button>
          
          <div className="hidden md:flex items-center gap-2 px-2 py-1 bg-zinc-900/50 rounded border border-zinc-800">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
            <span className="text-[10px] font-mono text-zinc-400">{roomId}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button 
            onClick={copyLink}
            aria-label={copyStatus}
            title={copyStatus}
            className="group flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500 hover:text-white bg-zinc-900/50 hover:bg-zinc-900 rounded border border-zinc-800/50 hover:border-zinc-800 transition-all focus:outline-none focus:ring-2 focus:ring-zinc-800 relative cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            <span className="hidden sm:inline ml-1.5">{copyStatus}</span>
          </button>
          
          <div className="h-4 w-px bg-zinc-900 mx-0.5"></div>

          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-1 sm:gap-0 mr-0.5 sm:mr-1 select-none bg-zinc-900/30 sm:bg-transparent px-1.5 py-1 sm:px-0 sm:py-0 rounded border border-zinc-800/30 sm:border-none">
            <span className="hidden sm:inline text-[9px] uppercase font-bold text-zinc-600 tracking-widest leading-none mb-0.5">Purge</span>
            <svg className="w-3 h-3 text-zinc-500 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className={`text-xs font-mono font-semibold sm:font-medium leading-none ${timeRemaining !== null && timeRemaining < 60 ? "text-red-500 animate-pulse" : "text-zinc-300 sm:text-white"}`}>
               {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : "--:--"}
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-900 mx-0.5"></div>

          <button 
            onClick={() => destroyRoom()} 
            aria-label="Close session and purge data"
            title="Close Room"
            className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 text-[10px] font-medium uppercase tracking-wider text-red-500 hover:text-red-400 bg-red-950/20 hover:bg-red-900/30 rounded border border-red-900/30 hover:border-red-800/50 transition-all focus:outline-none focus:ring-2 focus:ring-red-900 relative cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            <span className="hidden sm:inline ml-1.5">Close</span>
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pt-3 pb-3 sm:pt-4 sm:pb-4 pl-[calc(0.75rem+env(safe-area-inset-left,0px))] pr-[calc(0.75rem+env(safe-area-inset-right,0px))] sm:pl-[calc(1rem+env(safe-area-inset-left,0px))] sm:pr-[calc(1rem+env(safe-area-inset-right,0px))] md:px-6 md:py-6 bg-black relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-50"></div>
        
        <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4 md:space-y-6 landscape:space-y-2.5 relative z-10">
          {isMessagesPending ? (
            <div className="flex flex-col gap-4 animate-pulse py-12">
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800"></div>
                <div className="flex flex-col gap-2">
                  <div className="h-3 w-20 bg-zinc-900 rounded"></div>
                  <div className="h-8 w-48 bg-zinc-900 rounded"></div>
                </div>
              </div>
              <div className="flex gap-3 items-center flex-row-reverse">
                <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800"></div>
                <div className="flex flex-col gap-2 items-end">
                  <div className="h-3 w-16 bg-zinc-900 rounded"></div>
                  <div className="h-8 w-36 bg-zinc-900 rounded"></div>
                </div>
              </div>
            </div>
          ) : messages?.messages?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 sm:py-32 text-center select-none animate-in fade-in duration-300">
              <div className="w-12 h-12 bg-zinc-900/50 rounded-lg flex items-center justify-center mb-4 border border-zinc-800">
                <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              </div>
              <h3 className="text-sm font-medium text-white tracking-tight">Encrypted Room • Max 3 Users</h3>
              <p className="text-xs text-zinc-500 mt-2 max-w-[200px] leading-relaxed">This room and its contents will be permanently erased upon closure.</p>
            </div>
          ) : null}

          {messages?.messages?.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-2 sm:gap-3 group ${msg.sender === username ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded flex items-center justify-center text-[9px] sm:text-[10px] font-bold border transition-colors ${
                msg.sender === username 
                  ? "bg-white text-black border-white" 
                  : "bg-zinc-950 text-zinc-400 border-zinc-800 group-hover:border-zinc-700"
              }`}>
                {msg.sender.charAt(0).toUpperCase()}
              </div>

              <div className={`flex flex-col max-w-[88%] sm:max-w-[80%] md:max-w-[70%] ${msg.sender === username ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 px-0.5 select-none">
                  <span className={`text-[9px] sm:text-[10px] font-semibold truncate max-w-[120px] sm:max-w-[200px] ${msg.sender === username ? "text-white" : "text-zinc-400"}`} title={msg.sender === username ? "You" : msg.sender}>
                    {msg.sender === username ? "You" : msg.sender}
                  </span>
                  <span className="text-[8px] sm:text-[9px] font-mono text-zinc-600">{format(msg.timestamp, "HH:mm")}</span>
                </div>
                
                <div className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-sm leading-relaxed border transition-all break-words whitespace-pre-wrap ${
                  msg.sender === username 
                    ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
                    : "bg-zinc-900/80 text-zinc-200 border-zinc-800"
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <footer className="shrink-0 bg-black border-t border-zinc-900 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pl-[calc(0.75rem+env(safe-area-inset-left,0px))] pr-[calc(0.75rem+env(safe-area-inset-right,0px))] sm:pt-4 sm:pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:px-6 landscape:pt-1.5 landscape:pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] z-20">
        <div className="max-w-3xl mx-auto flex gap-2 sm:gap-3 items-center">
          <input 
            ref={inputRef}
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            type="text" 
            placeholder="Write a message..." 
            aria-label="Message input"
            className="flex-1 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 focus:border-zinc-600 focus:bg-black rounded-lg px-3.5 sm:px-4 text-sm sm:text-base text-white placeholder:text-zinc-600 transition-all outline-none h-10 sm:h-12"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!input.trim()} 
            aria-label="Send message"
            className="bg-white hover:bg-zinc-200 text-black rounded-lg transition-colors disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:min-w-[3rem] sm:self-stretch shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-black"
          >
            {isSubmitting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
              <svg className="w-4 h-4 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            )}
          </button>
        </div>
        <div className="max-w-3xl mx-auto mt-2 sm:mt-3 text-center select-none landscape:hidden">
             <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">## After the timer ends the chat vanishes ##</p>
        </div>
      </footer>
    </div>
  )
}

export default Page;