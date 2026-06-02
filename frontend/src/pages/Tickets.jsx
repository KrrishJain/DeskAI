// pages/Tickets.jsx

import { useEffect, useState } from "react";
import api from "../utils/api";
import AddTicketModal from "../components/modals/AddTicketModal";
import { PlusIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { Link } from "react-router-dom";

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await api.get("/tickets");
      console.log("Tickets API response:", res.data);

      let ticketArray = [];

      if (Array.isArray(res.data)) {
        ticketArray = res.data;
      } else if (Array.isArray(res.data.data)) {
        ticketArray = res.data.data;
      } else if (res.data.data && typeof res.data.data === "object") {
        ticketArray = Object.values(res.data.data);
      }

      setTickets(ticketArray);
    } catch (err) {
      console.error(err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-surface-900">
          Tickets
        </h1>

        <button
          onClick={() => setOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Add Ticket
        </button>
      </div>

      {/* Tickets Grid */}
      {loading ? (
        <div className="card p-8 text-center text-surface-500">
          Loading tickets...
        </div>
      ) : tickets.length === 0 ? (
        <div className="card p-8 text-center text-surface-500">
          No tickets found.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              to={`/tickets/${ticket.id}`}
              className="card p-5 space-y-3 hover:shadow-md transition-shadow block"
            >
              <div className="flex justify-between items-start">
                <h3 className="font-semibold text-surface-900">
                  {ticket.subject}
                </h3>
                <span
                  className={clsx(
                    "px-2 py-1 text-xs rounded-full font-medium capitalize",
                    statusColor(ticket.status),
                  )}
                >
                  {ticket.status.replace("_", " ")}
                </span>
              </div>

              <p className="text-sm text-surface-500 line-clamp-2">
                {ticket.description}
              </p>

              <div className="flex justify-between text-xs text-surface-400">
                <span>#{ticket.ticket_no}</span>
                <span className="capitalize">{ticket.priority}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal */}
      <AddTicketModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={fetchTickets}
      />
    </div>
  );
}
