  import { useState, useEffect, useRef } from "react";
  import { useAuth } from "../context/AuthContext";
  import ReactMarkdown from "react-markdown";
  import remarkGfm from "remark-gfm";

  const OFFICEGPT_API = import.meta.env.VITE_OFFICEGPT_API || "http://localhost:7000";
  // const OFFICEGPT_API = import.meta.env.VITE_OFFICEGPT_API || "http://officegpt:7000";

  const TOOLS = [
    { id: "auto",   label: "Auto",   icon: "✨", description: "Let AI decide",                         intent: null,     color: "blue"    },
    { id: "hrms",   label: "HRMS",   icon: "👥", description: "Employees, salary, attendance, leaves", intent: "erp",    color: "violet"  },
    { id: "policy", label: "Policy", icon: "📋", description: "Company policies & documents",          intent: "policy", color: "emerald" },
  ];

  const SUGGESTIONS = {
    auto:   ["Show all employees", "What is the leave policy?", "Who joined this month?", "List departments"],
    hrms:   ["Show all employees", "List employees in software dept", "Show details of kaushik jain", "Who joined this month?"],
    policy: ["What is the leave policy?", "How many casual leaves per year?", "What is the WFH policy?", "Explain PTO policy"],
  };

  const COLOR_MAP = {
    blue:    { active: "bg-blue-600 text-white border-blue-600",       idle: "border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50" },
    violet:  { active: "bg-violet-600 text-white border-violet-600",   idle: "border-slate-200 text-slate-500 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50" },
    emerald: { active: "bg-emerald-600 text-white border-emerald-600", idle: "border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50" },
  };

  // ── Icons ─────────────────────────────────────────────────────────────────────
  const SendIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
  const BotIcon     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 11V7"/><circle cx="12" cy="5" r="2"/><path d="M8 15h.01M12 15h.01M16 15h.01"/></svg>;
  const UserIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>;
  const PlusIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
  const TrashIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>;
  const EditIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
  const PanelIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>;

  function TypingDots() {
    return (
      <div className="flex items-center gap-1 px-1 py-0.5">
        {[0,1,2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
          />
        ))}
      </div>
    );
  }

  function Sources({ sources }) {
    const [open, setOpen] = useState(false);
    if (!sources?.length) return null;
    return (
      <div className="mt-2 border border-slate-100 rounded-xl overflow-hidden text-xs">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <span className="font-medium">📎 {sources.length} source{sources.length > 1 ? "s" : ""}</span>
          <span className="text-xs">{open ? "▲" : "▼"}</span>
        </button>
        {open && (
          <div className="divide-y divide-slate-100">
            {sources.map((s, i) => (
              <div key={i} className="px-3.5 py-2">
                <div className="font-medium text-slate-700">{s.source}</div>
                {s.page && <div className="text-slate-400 text-xs">Page {s.page}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function Message({ role, text, sources, isTyping, tool }) {
    const isUser = role === "user";
    const toolInfo = tool && TOOLS.find(t => t.id === tool);

    return (
      <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center text-white shadow-sm
          ${isUser ? "bg-slate-700" : "bg-blue-600"}`}>
          {isUser ? <UserIcon /> : <BotIcon />}
        </div>

        <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
          {isUser && toolInfo && toolInfo.id !== "auto" && (
            <span className="text-xs text-slate-400">{toolInfo.icon} {toolInfo.label}</span>
          )}

          <div
            className={`px-4 py-3 rounded-2xl text-[15px] leading-relaxed prose prose-slate max-w-none
              ${isUser
                ? "bg-slate-800 text-white rounded-tr-none shadow-md"
                : "bg-white border border-slate-200 shadow-sm rounded-tl-none"}`}
          >
            {isTyping ? (
              <TypingDots />
            ) : isUser ? (
              text
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto my-3 border border-slate-200 rounded-lg">
                      <table className="min-w-full text-sm border-collapse" {...props} />
                    </div>
                  ),
                  th: ({ node, ...props }) => (
                    <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold text-slate-700" {...props} />
                  ),
                  td: ({ node, ...props }) => (
                    <td className="border border-slate-200 px-3 py-2 text-slate-600" {...props} />
                  ),
                  p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                  ul: ({ node, ...props }) => <ul className="mb-3 list-disc divide-y divide-slate-200 pl-5" {...props} />,
                  ol: ({ node, ...props }) => <ol className="mb-3 list-decimal divide-y divide-slate-200 pl-5" {...props} />,
                  li: ({ node, ...props }) => <li className="py-2 text-slate-700" {...props} />,
                  code: ({ node, inline, ...props }) =>
                    inline ? (
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
                    ) : (
                      <code className="block bg-slate-50 p-3 rounded-lg text-sm font-mono overflow-x-auto border border-slate-200 my-2" {...props} />
                    ),
                }}
              >
                {text}
              </ReactMarkdown>
            )}
          </div>

          {!isUser && <Sources sources={sources} />}
        </div>
      </div>
    );
  }

  function ToolSelector({ selected, onChange }) {
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {TOOLS.map(tool => {
          const active = selected === tool.id;
          const colors = COLOR_MAP[tool.color] || COLOR_MAP.blue;
          return (
            <button
              key={tool.id}
              onClick={() => onChange(tool.id)}
              title={tool.description}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-all
                ${active ? colors.active : colors.idle}`}
            >
              <span>{tool.icon}</span>
              <span>{tool.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  function groupByDate(convs) {
    const groups = { Today: [], Yesterday: [], "This Week": [], Older: [] };
    const now = new Date();
    convs.forEach(c => {
      const diff = Math.floor((now - new Date(c.updated_at)) / 86400000);
      if (diff === 0) groups["Today"].push(c);
      else if (diff === 1) groups["Yesterday"].push(c);
      else if (diff <= 7) groups["This Week"].push(c);
      else groups["Older"].push(c);
    });
    return groups;
  }

  function ConvPanel({ convs, activeThread, onSelect, onNew, onDelete, onRename }) {
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState("");
    const groups = groupByDate(convs);

    const startEdit = (e, conv) => {
      e.stopPropagation();
      setEditingId(conv.thread_id);
      setEditTitle(conv.title || "");
    };

    const submitEdit = (tid) => {
      if (editTitle.trim()) onRename(tid, editTitle.trim());
      setEditingId(null);
    };

    return (
      <div className="flex h-full min-h-0 w-80 flex-shrink-0 flex-col overflow-hidden border-l border-slate-200/70 bg-white">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200">
          <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Chats</span>
          <button
            onClick={onNew}
            className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors text-white shadow-sm"
          >
            <PlusIcon /> New
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto py-2 px-2 min-h-0">
          {convs.length === 0 && (
            <p className="text-center text-slate-500 text-sm py-10 px-4 leading-relaxed">
              No conversations yet.<br />Start by asking something!
            </p>
          )}

          {Object.entries(groups).map(([label, items]) =>
            items.length === 0 ? null : (
              <div key={label}>
                <p className="px-3 pt-4 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {label}
                </p>
                {items.map(conv => (
                  <div
                    key={conv.thread_id}
                    onClick={() => onSelect(conv.thread_id)}
                    className={`
                      group relative mx-1 my-1 px-3.5 py-3 rounded-xl cursor-pointer transition-all duration-150
                      border
                      ${activeThread === conv.thread_id
                        ? "bg-blue-50 border-blue-200 shadow-sm"
                        : "border-transparent hover:bg-slate-50 active:bg-slate-100 hover:border-slate-200"}
                    `}
                  >
                    {editingId === conv.thread_id ? (
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onBlur={() => submitEdit(conv.thread_id)}
                        onKeyDown={e => e.key === "Enter" && submitEdit(conv.thread_id)}
                        onClick={e => e.stopPropagation()}
                        className="w-full bg-white text-sm font-medium text-slate-900 rounded-lg border border-blue-400 px-3 py-2 outline-none shadow-sm"
                      />
                    ) : (
                      <div className="flex flex-col gap-1 pr-14">
                        <p
                          className={`
                            text-sm font-semibold truncate leading-tight
                            ${activeThread === conv.thread_id ? "text-blue-800" : "text-slate-800"}
                          `}
                        >
                          {conv.title || "New conversation"}
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-snug">
                          {conv.preview || "No messages yet..."}
                        </p>
                      </div>
                    )}

                    {!editingId && (
                      <div
                        className={`
                          absolute right-2 top-1/2 -translate-y-1/2 flex gap-1
                          opacity-0 group-hover:opacity-100
                          ${activeThread === conv.thread_id ? "opacity-100" : ""}
                          transition-opacity duration-150
                        `}
                      >
                        <button
                          onClick={e => startEdit(e, conv)}
                          className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                          title="Rename"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onDelete(conv.thread_id);
                          }}
                          className="p-2 rounded-lg hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  // ── Main Component ────────────────────────────────────────────────────────────
  export default function OfficeGPT() {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [activeTool, setActiveTool] = useState("auto");
    const [activeThread, setActiveThread] = useState(null);
    const [convs, setConvs] = useState([]);
    const [panelOpen, setPanelOpen] = useState(true);
    const [config, setConfig] = useState({ assistant_name: "OfficeGPT", client_name: "Company" });

    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    const newThreadId = () => `${user?.id || "guest"}-${Date.now().toString(36)}`;

    useEffect(() => {
      fetch(`${OFFICEGPT_API}/config`)
        .then(r => r.json())
        .then(setConfig)
        .catch(() => {});

      loadConversations();
    }, []);

    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    const loadConversations = async () => {
      try {
        const res = await fetch(`${OFFICEGPT_API}/conversations`, { credentials: "include" });
        const data = await res.json();
        setConvs(data.conversations || []);
      } catch {}
    };

    const loadConversation = async (thread_id) => {
      try {
        const res = await fetch(`${OFFICEGPT_API}/conversations/${thread_id}`, { credentials: "include" });
        const data = await res.json();
        setMessages((data.messages || []).map(m => ({ role: m.role, text: m.content, sources: [] })));
        setActiveThread(thread_id);
      } catch {}
    };

    const startNewChat = () => {
      setMessages([]);
      setActiveThread(null);
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 50);
    };

    const deleteConv = async (thread_id) => {
      await fetch(`${OFFICEGPT_API}/conversations/${thread_id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (activeThread === thread_id) startNewChat();
      loadConversations();
    };

    const renameConv = async (thread_id, title) => {
      await fetch(`${OFFICEGPT_API}/conversations/${thread_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title }),
      });
      loadConversations();
    };

    const send = async (question) => {
      const q = (question || input).trim();
      if (!q || loading) return;

      const tool = TOOLS.find(t => t.id === activeTool);
      const threadId = activeThread || newThreadId();
      if (!activeThread) setActiveThread(threadId);

      setMessages(prev => [...prev, { role: "user", text: q, tool: activeTool }]);
      setInput("");
      setLoading(true);

      try {
        const res = await fetch(`${OFFICEGPT_API}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            question: q,
            thread_id: threadId,
            forced_intent: tool?.intent || null,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Request failed");

        setMessages(prev => [...prev, { role: "assistant", text: data.answer || "No response.", sources: data.sources || [] }]);
        loadConversations();
      } catch (err) {
        setMessages(prev => [...prev, { role: "assistant", text: `⚠️ ${err.message}`, sources: [] }]);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    };

    const currentTool = TOOLS.find(t => t.id === activeTool);
    const suggestions = SUGGESTIONS[activeTool] || SUGGESTIONS.auto;

    return (
      <div className="flex h-full min-h-0 w-full overflow-hidden bg-slate-50">
        {/* Main chat area */}
        <div className="flex min-h-0 flex-1 min-w-0 flex-col">
          {/* Header */}
          <div className="flex-shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm">
                <BotIcon />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">{config.assistant_name}</p>
                <p className="text-xs text-slate-500">{config.client_name} · AI Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full font-medium">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Online
              </span>

              <button
                onClick={() => setPanelOpen(o => !o)}
                title={panelOpen ? "Hide chats" : "Show chats"}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900
                  border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-lg
                  bg-white hover:bg-slate-50 transition-all shadow-sm"
              >
                <PanelIcon />
                <span>{panelOpen ? "Hide" : "Chats"}</span>
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
            <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col">
              {messages.length === 0 && !loading && (
                <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-4 text-3xl shadow-sm">
                    {currentTool?.icon || "✨"}
                  </div>
                  <h2 className="text-xl font-semibold text-slate-800 mb-2">
                    Hi, I'm {config.assistant_name}
                  </h2>
                  <p className="text-base text-slate-500 max-w-md mb-8">
                    {currentTool?.id === "auto"
                      ? "Ask me anything — I'll figure out where to look."
                      : `${currentTool?.label} — ${currentTool?.description}`}
                  </p>

                  <div className="flex flex-col items-center gap-3 mb-8">
                    <p className="text-sm text-slate-500 font-medium uppercase tracking-wide">Select a tool</p>
                    <ToolSelector selected={activeTool} onChange={setActiveTool} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                    {suggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-left text-sm px-4 py-3 bg-white border border-slate-200 rounded-xl
                          hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700
                          text-slate-700 transition-all shadow-sm"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(messages.length > 0 || loading) && (
                <div className="space-y-6">
                  {messages.map((msg, i) => (
                    <Message key={i} {...msg} />
                  ))}

                  {loading && <Message role="assistant" text="" isTyping />}
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 pt-2.5 pb-3">
            <div className="max-w-4xl mx-auto w-full space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Tool:</span>
                <ToolSelector selected={activeTool} onChange={setActiveTool} />
              </div>

              <div className="flex gap-3 items-end">
  <div
    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl
      focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100
      transition-all flex items-end px-4 py-2.5"
  >
    {activeTool !== "auto" && (
      <span className="text-xl mr-3 flex-shrink-0 mb-0.5">{currentTool?.icon}</span>
    )}
    <textarea
      ref={inputRef}
      rows={1}
      value={input}
      onChange={e => {
        setInput(e.target.value);
        const el = e.target;
        el.style.height = "auto";
        el.style.height = Math.min(el.scrollHeight, 160) + "px";
        el.style.overflowY = el.scrollHeight > 160 ? "auto" : "hidden";
      }}
      onKeyDown={e => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          send();
        }
      }}
      placeholder={
        activeTool === "auto"   ? "Ask anything..." :
        activeTool === "hrms"   ? "Ask about employees, salary, attendance..." :
        activeTool === "policy" ? "Ask about company policies..." :
        `Ask about ${currentTool?.label}...`
      }
      disabled={loading}
      className="flex-1 bg-transparent text-base text-slate-900 placeholder:text-slate-400
        outline-none disabled:opacity-50 resize-none overflow-hidden leading-relaxed"
      style={{ maxHeight: "160px" }}
    />
  </div>

  <button
    onClick={() => send()}
    disabled={loading || !input.trim()}
    className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300
      disabled:text-slate-400 text-white rounded-xl flex items-center justify-center
      transition-all active:scale-95 flex-shrink-0 shadow-sm"
  >
    <SendIcon />
  </button>
</div>
            </div>
          </div>
        </div>

        {/* Right sidebar - Chats */}
        {panelOpen && (
          <ConvPanel
            convs={convs}
            activeThread={activeThread}
            onSelect={loadConversation}
            onNew={startNewChat}
            onDelete={deleteConv}
            onRename={renameConv}
          />
        )}
      </div>
    );
  }