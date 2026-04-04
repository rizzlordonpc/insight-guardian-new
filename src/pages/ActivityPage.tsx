import { useState } from "react";
import { useAppStore } from "@/lib/store";
import RiskBadge from "@/components/RiskBadge";
import { Search, AlertTriangle } from "lucide-react";

export default function ActivityPage() {
  const { logs } = useAppStore();
  const [search, setSearch] = useState("");
  const [decoyOnly, setDecoyOnly] = useState(false);

  const filtered = logs
    .filter(l => !decoyOnly || l.isDecoy)
    .filter(l =>
      l.userName.toLowerCase().includes(search.toLowerCase()) ||
      l.resource.toLowerCase().includes(search.toLowerCase()) ||
      l.actionType.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Activity Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Immutable, structured event stream</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full h-9 rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Search logs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button onClick={() => setDecoyOnly(!decoyOnly)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${decoyOnly ? 'bg-destructive/20 text-destructive' : 'bg-secondary text-muted-foreground'}`}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Decoy Only
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card z-10">
              <tr className="border-b border-border bg-secondary/30">
                {["Timestamp", "User", "Action", "Resource", "Sensitivity", "IP", "Decoy"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-xs">
              {filtered.slice(0, 100).map(log => (
                <tr key={log.id} className={`transition-colors ${log.isDecoy ? 'bg-destructive/5 hover:bg-destructive/10' : 'hover:bg-secondary/20'}`}>
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-foreground">{log.userName}</td>
                  <td className="px-4 py-2.5">
                    <span className={log.isDecoy ? 'text-destructive font-bold' : 'text-foreground'}>{log.actionType}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground max-w-[200px] truncate">{log.resource}</td>
                  <td className="px-4 py-2.5"><RiskBadge severity={log.sensitivityLevel} /></td>
                  <td className="px-4 py-2.5 text-muted-foreground">{log.ip}</td>
                  <td className="px-4 py-2.5">
                    {log.isDecoy && <span className="text-destructive font-bold">⚠ YES</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
