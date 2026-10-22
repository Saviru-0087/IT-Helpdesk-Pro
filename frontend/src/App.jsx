import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000/api";
const statusOptions = ["Open", "In Progress", "Resolved", "Closed"];

function App() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeNav, setActiveNav] = useState("Overview");
  const [form, setForm] = useState({ title: "", description: "", category: "Hardware", priority: "Medium", requester: "" });

  async function loadTickets() {
    try {
      setError("");
      const response = await fetch(`${API}/tickets`);
      if (!response.ok) throw new Error("Could not load tickets.");
      const data = await response.json();
      setTickets(Array.isArray(data) ? data : data.tickets || []);
    } catch {
      setError("Cannot connect to the backend. Make sure the Python API is running in its terminal.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTickets(); }, []);

  const stats = useMemo(() => ({
    total: tickets.length,
    open: tickets.filter(t => t.status === "Open").length,
    progress: tickets.filter(t => t.status === "In Progress").length,
    resolved: tickets.filter(t => t.status === "Resolved" || t.status === "Closed").length,
  }), [tickets]);

  const filteredTickets = useMemo(() => tickets.filter(ticket => {
    const term = search.toLowerCase().trim();
    const matchesSearch = [ticket.title, ticket.description, ticket.requester, ticket.category, String(ticket.id)]
      .some(value => String(value || "").toLowerCase().includes(term));
    return matchesSearch && (filter === "All" || ticket.status === filter);
  }), [tickets, search, filter]);

  const priorityCounts = useMemo(() => [
    { label: "Critical", value: tickets.filter(t => t.priority === "Critical").length, color: "#ef4444" },
    { label: "High", value: tickets.filter(t => t.priority === "High").length, color: "#f59e0b" },
    { label: "Medium", value: tickets.filter(t => !t.priority || t.priority === "Medium").length, color: "#3b82f6" },
    { label: "Low", value: tickets.filter(t => t.priority === "Low").length, color: "#10b981" },
  ], [tickets]);
  const maxPriority = Math.max(1, ...priorityCounts.map(item => item.value));

  async function createTicket(event) {
    event.preventDefault(); setSaving(true); setNotice("");
    try {
      const response = await fetch(`${API}/tickets`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(data.detail || "Unable to create ticket."); }
      setForm({ title: "", description: "", category: "Hardware", priority: "Medium", requester: "" });
      setShowForm(false); setNotice("Ticket created successfully."); await loadTickets();
    } catch (err) { setNotice(err.message || "Could not create ticket."); }
    finally { setSaving(false); }
  }

  async function updateStatus(ticket, status) {
    try {
      const response = await fetch(`${API}/tickets/${ticket.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!response.ok) throw new Error("Update failed.");
      setNotice(`Ticket #${ticket.id} updated to ${status}.`); await loadTickets();
    } catch { setNotice("Could not update ticket. Check the backend API."); }
  }

  async function deleteTicket(ticket) {
    if (!window.confirm(`Delete ticket #${ticket.id}? This cannot be undone.`)) return;
    try {
      const response = await fetch(`${API}/tickets/${ticket.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Delete failed.");
      setNotice(`Ticket #${ticket.id} deleted.`); await loadTickets();
    } catch { setNotice("Could not delete this ticket."); }
  }

  function changeField(event) { setForm(previous => ({ ...previous, [event.target.name]: event.target.value })); }
  const recentTickets = [...tickets].slice(-5).reverse();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => setActiveNav("Overview")}>
          <span className="brand-mark"><span>H</span></span>
          <span className="brand-copy"><strong>helpdesk<span>pro</span></strong><small>IT SERVICE PLATFORM</small></span>
        </a>
        <div className="workspace-switcher"><div className="workspace-avatar">N</div><div><strong>Northstar Workspace</strong><small>Free workspace</small></div><span className="chevron">⌄</span></div>
        <div className="nav-label">WORKSPACE</div>
        <button className={`nav-item ${activeNav === "Overview" ? "active" : ""}`} onClick={() => setActiveNav("Overview")}><span className="nav-icon">▦</span><span>Overview</span><span className="nav-active-dot" /></button>
        <button className={`nav-item ${activeNav === "Support tickets" ? "active" : ""}`} onClick={() => { setActiveNav("Support tickets"); document.getElementById("tickets")?.scrollIntoView({ behavior: "smooth" }); }}><span className="nav-icon">▤</span><span>Support tickets</span><span className="nav-count">{stats.open}</span></button>
        <button className={`nav-item ${activeNav === "Activity" ? "active" : ""}`} onClick={() => { setActiveNav("Activity"); document.getElementById("activity")?.scrollIntoView({ behavior: "smooth" }); }}><span className="nav-icon">◷</span><span>Recent activity</span></button>
        <div className="nav-label nav-label-spaced">PREFERENCES</div>
        <button className="nav-item" onClick={() => setNotice("Settings are planned for a future version.")}><span className="nav-icon">⚙</span><span>Settings</span></button>
        <div className="sidebar-grow" />
        <div className="sidebar-help"><div className="help-spark">✦</div><strong>Need a hand?</strong><p>Keep your support operations running smoothly.</p><button onClick={() => setNotice("Help centre is coming soon.")}>Visit help centre <span>↗</span></button></div>
        <div className="system-status"><span className="system-pulse" /><div><strong>All systems operational</strong><small>API connection status</small></div><span className="status-tick">✓</span></div>
        <div className="profile"><div className="avatar">IT</div><div className="profile-copy"><strong>IT Support</strong><small>Administrator</small></div><button className="profile-menu" aria-label="Profile menu">•••</button></div>
      </aside>

      <main className="main-area" id="overview">
        <header className="topbar"><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{activeNav}</strong></div><div className="topbar-right"><span className="live-indicator"><i /> Local environment</span><button className="icon-button" title="Notifications" onClick={() => setNotice("You are all caught up.")}>♧<span className="notification-dot" /></button><div className="avatar small-avatar">IT</div></div></header>
        <section className="page-content">
          <div className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> SERVICE DESK <span className="eyebrow-slash">/</span> OVERVIEW</div><h1>Good morning, team <span className="wave">✳</span></h1><p>Here’s what’s happening across your IT support workspace today.</p></div><div className="welcome-actions"><button className="secondary-button export-button" onClick={() => { const csv = ["ID,Title,Requester,Category,Priority,Status", ...tickets.map(t => [t.id,t.title,t.requester,t.category,t.priority,t.status].map(v => `"${String(v ?? "").replaceAll('"','""')}"`).join(","))].join("\n"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" })); const a = document.createElement("a"); a.href = url; a.download = "helpdesk-tickets.csv"; a.click(); URL.revokeObjectURL(url); }}>↧ <span>Export</span></button><button className="primary-button" onClick={() => { setShowForm(!showForm); setNotice(""); }}><span className="button-plus">＋</span> Create ticket</button></div></div>

          {notice && <div className="notice" role="status"><span className="notice-icon">✓</span>{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notification">×</button></div>}

          {showForm && <form className="ticket-form" onSubmit={createTicket}><div className="form-heading"><div><div className="eyebrow">NEW REQUEST</div><h2>Create a support ticket</h2><p>Provide a few details so your team can resolve the issue.</p></div><button type="button" className="close-button" onClick={() => setShowForm(false)}>×</button></div><div className="form-grid"><label>Issue title<input name="title" value={form.title} onChange={changeField} placeholder="e.g. Laptop will not start" required /></label><label>Requester name<input name="requester" value={form.requester} onChange={changeField} placeholder="Employee name" required /></label><label>Category<select name="category" value={form.category} onChange={changeField}><option>Hardware</option><option>Software</option><option>Network</option><option>Printer</option><option>Account Access</option><option>Other</option></select></label><label>Priority<select name="priority" value={form.priority} onChange={changeField}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></label><label className="full-field">Description<textarea name="description" value={form.description} onChange={changeField} placeholder="Describe the problem and any error messages..." rows="3" required /></label></div><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" disabled={saving}>{saving ? "Creating..." : "Create ticket →"}</button></div></form>}

          <div className="section-heading"><div><h2>Support overview</h2><p>A real-time snapshot of your service desk.</p></div><span className="updated-label"><i /> LIVE DATA</span></div>
          <div className="stats-grid">
            <div className="stat-card stat-total"><div className="stat-top"><span>Total tickets</span><span className="stat-icon blue">▤</span></div><div className="stat-bottom"><div className="stat-number">{stats.total}</div><span className="stat-caption">All requests</span></div><div className="stat-mini-line blue-line"><span /></div><div className="stat-foot"><span className="foot-symbol">↗</span> All recorded support requests</div></div>
            <div className="stat-card"><div className="stat-top"><span>Open tickets</span><span className="stat-icon orange">◷</span></div><div className="stat-bottom"><div className="stat-number">{stats.open}</div><span className="stat-pill orange-pill">Needs attention</span></div><div className="stat-mini-line orange-line"><span /></div><div className="stat-foot">Waiting for a team member</div></div>
            <div className="stat-card"><div className="stat-top"><span>In progress</span><span className="stat-icon violet">↗</span></div><div className="stat-bottom"><div className="stat-number">{stats.progress}</div><span className="stat-pill violet-pill">In motion</span></div><div className="stat-mini-line violet-line"><span /></div><div className="stat-foot">Currently being handled</div></div>
            <div className="stat-card"><div className="stat-top"><span>Resolved</span><span className="stat-icon green">✓</span></div><div className="stat-bottom"><div className="stat-number">{stats.resolved}</div><span className="stat-pill green-pill">Completed</span></div><div className="stat-mini-line green-line"><span /></div><div className="stat-foot">Successfully completed</div></div>
          </div>

          <div className="insights-grid"><section className="panel priority-panel"><div className="panel-heading"><div><h2>Tickets by priority</h2><p>Understand the urgency of incoming requests.</p></div><span className="panel-icon">◉</span></div><div className="priority-content"><div className="priority-bars">{priorityCounts.map(item => <div className="priority-row" key={item.label}><div className="priority-label"><span className={`priority-dot ${item.label.toLowerCase()}`} />{item.label}<strong>{item.value}</strong></div><div className="bar-track"><span style={{ width: `${(item.value / maxPriority) * 100}%`, background: item.color }} /></div></div>)}</div><div className="priority-summary"><div className="summary-ring"><span>{stats.total}</span><small>TOTAL</small></div><div><strong>{stats.total ? `${Math.round((stats.open / stats.total) * 100)}%` : "0%"} open</strong><p>of all support requests need attention.</p></div></div></div></section>
            <section className="panel status-panel"><div className="panel-heading"><div><h2>Workspace health</h2><p>Current service desk status.</p></div><span className="health-icon">✦</span></div><div className="health-banner"><div className="health-check">✓</div><div><strong>Everything looks good</strong><p>Your local workspace is ready to go.</p></div><span className="health-live"><i /> LIVE</span></div><div className="health-list"><div><span className="health-list-icon api-icon">⌘</span><span><strong>Backend API</strong><small>FastAPI service</small></span><b className="health-badge">Connected*</b></div><div><span className="health-list-icon db-icon">▤</span><span><strong>Ticket database</strong><small>Local SQLite storage</small></span><b className="health-badge">Active*</b></div></div><p className="health-footnote">* Status reflects the last successful ticket request.</p></section></div>

          <section className="panel tickets-panel" id="tickets"><div className="panel-heading tickets-heading"><div><div className="title-with-count"><h2>Support tickets</h2><span className="count-badge">{filteredTickets.length}</span></div><p>Review, prioritize and manage incoming IT requests.</p></div><button className="secondary-button refresh-button" onClick={loadTickets} disabled={loading}><span className={loading ? "spin" : ""}>↻</span> Refresh</button></div><div className="toolbar"><label className="search-box"><span>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, requester or ID..." aria-label="Search tickets" />{search && <button onClick={() => setSearch("")} aria-label="Clear search">×</button>}</label><div className="toolbar-right"><span className="filter-label">Status</span><select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)} aria-label="Filter tickets by status"><option>All</option>{statusOptions.map(s => <option key={s}>{s}</option>)}</select></div></div>
          {loading ? <div className="empty-state"><span className="loading-spinner" /><strong>Loading tickets</strong><p>Fetching the latest support requests...</p></div> : error ? <div className="error-state"><div className="error-symbol">!</div><strong>Couldn’t load tickets</strong><p>{error}</p><button className="secondary-button" onClick={loadTickets}>Try again</button></div> : filteredTickets.length === 0 ? <div className="empty-state"><div className="empty-icon">▤</div><strong>{search || filter !== "All" ? "No matching tickets" : "Your queue is clear"}</strong><p>{search || filter !== "All" ? "Try changing your search or status filter." : "Create your first support ticket to get started."}</p>{!search && filter === "All" && <button className="primary-button" onClick={() => setShowForm(true)}>＋ Create first ticket</button>}</div> : <div className="table-wrap"><table><thead><tr><th>TICKET</th><th>REQUEST</th><th>CATEGORY</th><th>PRIORITY</th><th>STATUS</th><th className="action-heading">ACTION</th></tr></thead><tbody>{filteredTickets.map(ticket => <tr key={ticket.id}><td><strong className="ticket-id">#{ticket.id}</strong><small className="date-cell">{ticket.created_at ? String(ticket.created_at).slice(0, 10) : "Recently"}</small></td><td><div className="request-cell"><span className="request-avatar">{String(ticket.requester || "U").trim().slice(0, 1).toUpperCase()}</span><span><strong>{ticket.title}</strong><small className="requester-cell">{ticket.requester || "Unknown requester"}</small></span></div></td><td><span className="category-label"><span className="category-dot" />{ticket.category || "General"}</span></td><td><span className={`priority-badge ${(ticket.priority || "Medium").toLowerCase()}`}><i />{ticket.priority || "Medium"}</span></td><td><select className={`status-select ${(ticket.status || "Open").toLowerCase().replace(" ", "-")}`} value={ticket.status || "Open"} onChange={e => updateStatus(ticket, e.target.value)} aria-label={`Change status for ticket ${ticket.id}`}>{statusOptions.map(s => <option key={s}>{s}</option>)}</select></td><td><button className="delete-button" title={`Delete ticket ${ticket.id}`} onClick={() => deleteTicket(ticket)}>Delete</button></td></tr>)}</tbody></table></div>}
          <div className="panel-footer"><span>Showing <strong>{filteredTickets.length}</strong> of <strong>{tickets.length}</strong> tickets</span><span className="footer-secure"><i /> Synced with local API</span></div></section>

          <section className="panel activity-panel" id="activity"><div className="panel-heading"><div><h2>Recent requests</h2><p>Your latest recorded support tickets.</p></div><button className="text-link" onClick={() => { setActiveNav("Support tickets"); document.getElementById("tickets")?.scrollIntoView({ behavior: "smooth" }); }}>View all tickets <span>→</span></button></div>{recentTickets.length === 0 ? <div className="activity-empty">New tickets will appear here when you create them.</div> : <div className="activity-list">{recentTickets.map((ticket, index) => <div className="activity-item" key={ticket.id}><div className={`activity-marker marker-${(ticket.status || "Open").toLowerCase().replace(" ", "-")}`}>{index === 0 ? "✦" : "•"}</div><div className="activity-copy"><strong>{ticket.title || "Untitled request"}</strong><p>{ticket.requester || "Unknown requester"} <span>·</span> {ticket.category || "General"}</p></div><span className={`activity-status status-text-${(ticket.status || "Open").toLowerCase().replace(" ", "-")}`}>{ticket.status || "Open"}</span><small className="activity-date">{ticket.created_at ? String(ticket.created_at).slice(0, 10) : "Recently"}</small></div>)}</div>}</section>
          <footer className="app-footer"><span>© 2026 HelpdeskPro</span><span>Designed for better IT support.</span><span>React <b>·</b> FastAPI <b>·</b> SQLite</span></footer>
        </section>
      </main>
    </div>
  );
}
export default App;
