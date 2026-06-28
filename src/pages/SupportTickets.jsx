import React, { useState, useEffect } from 'react';
import { 
  LifeBuoy, 
  Plus, 
  PlusCircle,
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle2, 
  HelpCircle,
  ArrowLeft
} from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function SupportTickets() {
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  
  // Forms
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [replyMsg, setReplyMsg] = useState('');
  
  // Loading
  const [loading, setLoading] = useState(false);

  const fetchTickets = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/support/tickets`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTicketDetails = async (ticketId) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/support/tickets/${ticketId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aura_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActiveTicket(data.ticket);
        setReplies(data.replies);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    const prefillSubject = sessionStorage.getItem('prefill_ticket_subject');
    const prefillDesc = sessionStorage.getItem('prefill_ticket_description');
    if (prefillSubject || prefillDesc) {
      setSubject(prefillSubject || '');
      setDescription(prefillDesc || '');
      setShowCreateForm(true);
      sessionStorage.removeItem('prefill_ticket_subject');
      sessionStorage.removeItem('prefill_ticket_description');
    }
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/support/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({ subject, description })
      });
      if (res.ok) {
        setSubject('');
        setDescription('');
        setShowCreateForm(false);
        fetchTickets();
        if (window.notify) window.notify('success', 'Support ticket opened successfully!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMsg.trim() || !activeTicket) return;
    try {
      const res = await fetch(`${API_BASE_URL}/support/tickets/${activeTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('aura_token')}`
        },
        body: JSON.stringify({ message: replyMsg })
      });
      if (res.ok) {
        setReplyMsg('');
        fetchTicketDetails(activeTicket.id);
        fetchTickets();
        if (window.notify) window.notify('success', 'Reply posted successfully!');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Open':
        return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-[#00832e]">Open</span>;
      case 'Replied':
        return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-600">Replied</span>;
      case 'Closed':
        return <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-neutral-100 text-neutral-500">Closed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Top bar */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h4 className="text-xl font-black text-neutral-800 tracking-tight uppercase">Support Helpdesk</h4>
          <p className="text-xs text-neutral-400 font-bold mt-1">Need help? Open a support ticket and our customer support team will assist you shortly.</p>
        </div>
        {!activeTicket && !showCreateForm && (
          <button 
            onClick={() => setShowCreateForm(true)}
            className="btn btn--primary px-4 py-2 dash-v2-cta-btn flex items-center gap-2 border-none active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            Open New Ticket
          </button>
        )}
      </div>

      {/* CREATE TICKET VIEW */}
      {showCreateForm && (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm max-w-2xl">
          <div className="flex items-center gap-2 mb-6">
            <button 
              onClick={() => setShowCreateForm(false)}
              className="p-2 rounded-xl hover:bg-neutral-50 text-neutral-500 transition-all border-none bg-transparent"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h5 className="text-sm font-black uppercase tracking-wider text-neutral-700">Open New Support Ticket</h5>
          </div>
          <form onSubmit={handleCreateTicket} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Ticket Subject</label>
              <input 
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your issue (e.g. WhatsApp Pairing failed)"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00832e]/20 focus:border-[#00832e] text-xs font-bold text-neutral-800"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Detailed Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the problem in detail so our team can help you solve it quickly."
                required
                rows={6}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00832e]/20 focus:border-[#00832e] text-xs font-bold text-neutral-800"
              />
            </div>
            <div className="pt-2 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-5 py-3 rounded-xl hover:bg-neutral-50 text-neutral-500 text-xs font-black uppercase tracking-wider transition-all border border-gray-200 bg-transparent"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-6 py-3 rounded-xl bg-[#00832e] text-white text-xs font-black uppercase tracking-wider hover:bg-[#006e26] transition-all shadow-md border-none"
              >
                Submit Ticket
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TICKET DETAILS THREAD VIEW */}
      {activeTicket && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Thread */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <button 
                  onClick={() => { setActiveTicket(null); fetchTickets(); }}
                  className="p-2 rounded-xl hover:bg-neutral-50 text-neutral-500 transition-all border-none bg-transparent"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h5 className="text-sm font-black text-neutral-800 uppercase tracking-wider">{activeTicket.subject}</h5>
                  <p className="text-[10px] text-neutral-400 font-bold mt-1">Ticket ID: #{activeTicket.id} • Created on {new Date(activeTicket.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Initial ticket message */}
              <div className="p-5 rounded-2xl bg-neutral-50 border border-neutral-100 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-neutral-600">My Description</span>
                  <span className="text-[9px] text-neutral-400 font-bold">{new Date(activeTicket.created_at).toLocaleString()}</span>
                </div>
                <p className="text-xs font-bold text-neutral-700 whitespace-pre-wrap leading-relaxed">{activeTicket.description}</p>
              </div>

              {/* Replies list */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 mb-6">
                {replies.length === 0 ? (
                  <div className="text-center py-6 text-neutral-400 text-xs font-bold uppercase tracking-wider">
                    No replies yet. Our support agents will reply soon!
                  </div>
                ) : (
                  replies.map(reply => (
                    <div 
                      key={reply.id} 
                      className={`p-5 rounded-2xl border ${reply.sender_role === 'admin' ? 'bg-[#00832e]/5 border-[#00832e]/10 self-end ml-12' : 'bg-white border-neutral-100 mr-12'}`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className={`text-xs font-black uppercase tracking-wider ${reply.sender_role === 'admin' ? 'text-[#00832e]' : 'text-neutral-600'}`}>
                          {reply.sender_role === 'admin' ? 'Customer Support Agent' : 'Me'}
                        </span>
                        <span className="text-[9px] text-neutral-400 font-bold">{new Date(reply.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs font-bold text-neutral-700 whitespace-pre-wrap leading-relaxed">{reply.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Reply Form */}
              {activeTicket.status !== 'Closed' ? (
                <form onSubmit={handleSendReply} className="flex gap-3">
                  <input 
                    type="text"
                    value={replyMsg}
                    onChange={(e) => setReplyMsg(e.target.value)}
                    placeholder="Type your message to support..."
                    required
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#00832e]/20 focus:border-[#00832e] text-xs font-bold text-neutral-800"
                  />
                  <button 
                    type="submit"
                    className="px-5 rounded-xl bg-[#00832e] text-white hover:bg-[#006e26] transition-all flex items-center justify-center border-none shadow-md"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="text-center py-4 bg-neutral-50 rounded-2xl text-neutral-400 text-xs font-bold uppercase tracking-wider border border-neutral-100">
                  This support ticket is closed. If you need further help, please open a new ticket.
                </div>
              )}
            </div>
          </div>

          {/* Ticket Meta Sidebar */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
            <h5 className="text-xs font-black uppercase tracking-widest text-neutral-500 border-b border-neutral-100 pb-3">Ticket Information</h5>
            
            <div className="space-y-4">
              <div>
                <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Status</span>
                <div className="mt-1.5">{getStatusBadge(activeTicket.status)}</div>
              </div>
              
              <div>
                <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Ticket Subject</span>
                <p className="text-xs font-black text-neutral-700 mt-1 uppercase tracking-wider">{activeTicket.subject}</p>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Created On</span>
                <p className="text-xs font-bold text-neutral-700 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  {new Date(activeTicket.created_at).toLocaleString()}
                </p>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Last Updated</span>
                <p className="text-xs font-bold text-neutral-700 mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  {new Date(activeTicket.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TICKETS LIST VIEW */}
      {!activeTicket && !showCreateForm && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {tickets.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="p-4 rounded-full bg-emerald-50 text-[#00832e]">
                <LifeBuoy className="w-8 h-8" />
              </div>
              <h5 className="text-sm font-black text-neutral-700 uppercase tracking-wider">No Support Tickets Yet</h5>
              <p className="text-xs text-neutral-400 font-bold max-w-sm">You haven't opened any support tickets. If you run into issues or have questions, open a ticket above!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-neutral-50/50 text-[10px] font-black uppercase tracking-wider text-neutral-400">
                    <th className="px-6 py-4">Ticket ID</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Last Updated</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tickets.map(ticket => (
                    <tr 
                      key={ticket.id} 
                      className="hover:bg-neutral-50/50 transition-all cursor-pointer"
                      onClick={() => fetchTicketDetails(ticket.id)}
                    >
                      <td className="px-6 py-4.5 text-xs font-black text-neutral-500">#{ticket.id}</td>
                      <td className="px-6 py-4.5">
                        <div className="text-xs font-bold text-neutral-800 uppercase tracking-wider">{ticket.subject}</div>
                        <p className="text-[10px] text-neutral-400 font-semibold mt-0.5 truncate max-w-md">{ticket.description}</p>
                      </td>
                      <td className="px-6 py-4.5">{getStatusBadge(ticket.status)}</td>
                      <td className="px-6 py-4.5 text-xs font-bold text-neutral-500">{new Date(ticket.updated_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => fetchTicketDetails(ticket.id)}
                          className="px-4 py-2 rounded-xl bg-neutral-100 hover:bg-[#00832e]/10 text-neutral-700 hover:text-[#00832e] text-[10px] font-extrabold uppercase tracking-wider transition-all border-none"
                        >
                          View Thread
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
