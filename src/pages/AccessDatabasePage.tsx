import { useState, useMemo } from "react";
import { useAppStore, type AccessType } from "@/lib/store";
import RiskBadge from "@/components/RiskBadge";
import { Search, Filter, List, LayoutGrid, User, FileText } from "lucide-react";

type ViewMode = 'timeline' | 'filtered';
type FilterBy = 'employee' | 'resource';

export default function AccessDatabasePage() {
  const { accessEvents, users } = useAppStore();
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [filterBy, setFilterBy] = useState<FilterBy>('employee');
  const [search, setSearch] = useState("");
  const [accessTypeFilter, setAccessTypeFilter] = useState<AccessType | 'all'>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedResource, setSelectedResource] = useState<string>('');

  // Unique resources for filter dropdown
  const uniqueResources = useMemo(() => {
    const set = new Set(accessEvents.map(e => e.resource));
    return Array.from(set).sort();
  }, [accessEvents]);

  // Filtered events
  const filtered = useMemo(() => {
    let events = accessEvents;

    if (accessTypeFilter !== 'all') {
      events = events.filter(e => e.accessType === accessTypeFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      events = events.filter(e =>
        e.employeeName.toLowerCase().includes(q) ||
        e.resource.toLowerCase().includes(q) ||
        e.actionType.toLowerCase().includes(q)
      );
    }

    if (viewMode === 'filtered') {
      if (filterBy === 'employee' && selectedEmployee) {
        events = events.filter(e => e.userId === selectedEmployee);
      }
      if (filterBy === 'resource' && selectedResource) {
        events = events.filter(e => e.resource === selectedResource);
      }
    }

    return events;
  }, [accessEvents, accessTypeFilter, search, viewMode, filterBy, selectedEmployee, selectedResource]);

  // Stats
  const stats = useMemo(() => ({
    total: accessEvents.length,
    normal: accessEvents.filter(e => e.accessType === 'normal').length,
    decoy: accessEvents.filter(e => e.accessType === 'decoy').length,
    denied: accessEvents.filter(e => e.accessType === 'denied').length,
    flagged: accessEvents.filter(e => e.riskFlag).length,
  }), [accessEvents]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Access Event Database</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Unified access tracking · {stats.total} events recorded</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Normal', value: stats.normal, color: 'text-muted-foreground' },
          { label: 'Decoy', value: stats.decoy, color: 'text-warning' },
          { label: 'Denied', value: stats.denied, color: 'text-destructive' },
          { label: 'Risk Flagged', value: stats.flagged, color: 'text-destructive' },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-lg p-3">
            <p className={`text-lg font-semibold font-mono ${s.color}`}>{s.value}</p>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* View Toggle + Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* View mode */}
        <div className="flex gap-1 bg-secondary/30 rounded-md p-0.5">
          <button onClick={() => setViewMode('timeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors ${viewMode === 'timeline' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <List className="h-3.5 w-3.5" /> Timeline
          </button>
          <button onClick={() => setViewMode('filtered')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors ${viewMode === 'filtered' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <Filter className="h-3.5 w-3.5" /> Filtered
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full h-9 rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Search events..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Access type filter */}
        <div className="flex gap-1">
          {(['all', 'normal', 'decoy', 'denied'] as const).map(t => (
            <button key={t} onClick={() => setAccessTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono capitalize transition-colors ${accessTypeFilter === t ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Filtered View Controls */}
      {viewMode === 'filtered' && (
        <div className="flex flex-wrap gap-3 items-center p-3 rounded-lg bg-secondary/20 border border-border">
          <div className="flex gap-1">
            <button onClick={() => { setFilterBy('employee'); setSelectedResource(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${filterBy === 'employee' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
              <User className="h-3.5 w-3.5" /> By Employee
            </button>
            <button onClick={() => { setFilterBy('resource'); setSelectedEmployee(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${filterBy === 'resource' ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
              <FileText className="h-3.5 w-3.5" /> By Resource
            </button>
          </div>

          {filterBy === 'employee' && (
            <select
              value={selectedEmployee}
              onChange={e => setSelectedEmployee(e.target.value)}
              className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">All Employees</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          )}

          {filterBy === 'resource' && (
            <select
              value={selectedResource}
              onChange={e => setSelectedResource(e.target.value)}
              className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary max-w-xs"
            >
              <option value="">All Resources</option>
              {uniqueResources.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Events Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border bg-secondary/30">
                {["Timestamp", "Employee", "Action", "Resource", "Access Type", "Risk Flag", "IP", "Source"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-xs">
              {filtered.slice(0, 200).map(event => (
                <tr key={event.id} className={`transition-colors ${
                  event.accessType === 'denied' ? 'bg-destructive/5 hover:bg-destructive/10' :
                  event.accessType === 'decoy' ? 'bg-warning/5 hover:bg-warning/10' :
                  'hover:bg-secondary/20'
                }`}>
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{new Date(event.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-foreground">{event.employeeName}</td>
                  <td className="px-4 py-2.5">
                    <span className={`font-bold ${
                      event.accessType === 'denied' ? 'text-destructive' :
                      event.accessType === 'decoy' ? 'text-warning' : 'text-foreground'
                    }`}>{event.actionType}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">{event.resource}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      event.accessType === 'denied' ? 'bg-destructive/20 text-destructive' :
                      event.accessType === 'decoy' ? 'bg-warning/20 text-warning' :
                      'bg-secondary text-muted-foreground'
                    }`}>{event.accessType.toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    {event.riskFlag && <span className="text-destructive font-bold">⚠ FLAG</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{event.ip}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{event.triggeredBy || 'SYSTEM'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
