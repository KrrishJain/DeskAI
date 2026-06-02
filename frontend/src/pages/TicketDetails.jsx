// pages/TicketDetails.jsx

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import clsx from "clsx";

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    try {
      const messagesRes = await api.get(`/tickets/${id}/messages`);
      const messagesData = Array.isArray(messagesRes.data?.data)
        ? messagesRes.data.data
        : Array.isArray(messagesRes.data)
          ? messagesRes.data
          : [];
      setMessages(messagesData);
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const ticketRes = await api.get(`/tickets/${id}`);
      const ticketData = ticketRes.data?.data ?? ticketRes.data ?? null;
      setTicket(ticketData);

      await fetchMessages();
    } catch (err) {
      console.error(err);
      setTicket(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;

    try {
      setSending(true);
      await api.post(`/tickets/${id}/messages`, { message: reply });
      setReply("");
      await fetchMessages(); // ✅ only refresh messages, not the whole page
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const statusColor = (status) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-700";
      case "in_progress":
        return "bg-yellow-100 text-yellow-700";
      case "closed":
        return "bg-green-100 text-green-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!ticket) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-red-500">Ticket not found.</p>
        <button onClick={() => navigate("/tickets")} className="btn-primary">
          Back to Tickets
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate("/tickets")}
        className="text-sm text-surface-500 hover:text-surface-800 transition-colors"
      >
        ← Back to Tickets
      </button>

      {/* Ticket Info */}
      <div className="card p-6 space-y-4">
        <div className="flex justify-between items-start">
          <h2 className="text-xl font-semibold">{ticket.subject}</h2>
          <span
            className={clsx(
              "px-3 py-1 text-xs rounded-full font-medium capitalize",
              statusColor(ticket.status),
            )}
          >
            {ticket.status.replace("_", " ")}
          </span>
        </div>

        <p className="text-surface-600">{ticket.description}</p>

        <div className="flex justify-between text-sm text-surface-400">
          <span>#{ticket.ticket_no}</span>
          <span className="capitalize">{ticket.priority}</span>
        </div>
      </div>

      {/* Conversation */}
      <div className="card p-6 space-y-6">
        <h3 className="font-semibold text-surface-800">Conversation</h3>

        {messages.length === 0 ? (
          <p className="text-surface-400 text-sm">No replies yet.</p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="bg-surface-100 p-4 rounded-lg text-sm"
              >
                {/* ── Sender row ── */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-brand-500 flex items-center justify-center text-white text-xs font-semibold">
                    {msg.sender_name?.charAt(0).toUpperCase() ?? "?"}
                  </div>
                  <span className="font-medium text-surface-700 text-xs">
                    {msg.sender_name ?? "Unknown"}
                  </span>
                </div>

                {/* ── Message ── */}
                <p className="text-surface-800">{msg.message}</p>

                {/* ── Timestamp ── */}
                <p className="text-xs text-surface-400 mt-2">
                  {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Reply Box */}
        <form onSubmit={handleReply} className="pt-4 border-t">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            placeholder="Write your reply..."
            className="w-full border border-surface-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <div className="flex justify-end mt-3">
            <button
              type="submit"
              disabled={sending}
              className="btn-primary disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send Reply"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
