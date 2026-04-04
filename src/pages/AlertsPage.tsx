import { useMemo, useState } from "react";
import { getData, type Severity, type Alert } from "@/lib/mock-data";
import RiskBadge from "@/components/RiskBadge";
import RiskScoreRing from "@/components/RiskScoreRing";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Clock, Shield, Brain, FileWarning, User } from "lucide-react";

function ReasonBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs font-mono text-foreground w-8 text-right">{value}</span>
    </div>
  );
}

export default function AlertsPage() {
  const { alerts } = useMemo(() => getData(), []);
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = alerts.filter(a => severityFilter === "all" || a.severity === severityFilter);
  const severities: (Severity | "all")[] = ["all", "critical", "high", "medium", "low"];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Alert Explorer</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} alerts · Explainable risk analysis</p>
      </div>

      <div className="flex gap-1">
        {severities.map(s => (
          <button key={s} onClick={() => setSeverityFilter(s)}
            className={`px-3 py-1.5 rounded-md text-xs font-mono capitalize transition-colors ${severityFilter === s ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
          >{s}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(alert => {
          const expanded = expandedId === alert.id;
          return (
            <motion.div key={alert.id} layout
              className={`rounded-lg border bg-card overflow-hidden transition-colors ${
                alert.severity === 'critical' ? 'border-threat-critical/30' :
                alert.severity === 'high' ? 'border-destructive/30' :
                alert.severity === 'medium' ? 'border-warning/30' : 'border-border'
              }`}
            >
              <button onClick={() => setExpandedId(expanded ? null : alert.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-secondary/20 transition-colors"
              >
                <RiskScoreRing score={alert.riskScore} size={40} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.userName} · {new Date(alert.timestamp).toLocaleString()}</p>
                </div>
                <RiskBadge severity={alert.severity} />
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  alert.status === 'open' ? 'bg-destructive/10 text-destructive' :
                  alert.status === 'investigating' ? 'bg-warning/10 text-warning' :
                  alert.status === 'resolved' ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'
                }`}>{alert.status}</span>
                {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="border-t border-border"
                  >
                    <div className="p-4 space-y-4">
                      <p className="text-sm text-muted-foreground">{alert.description}</p>

                      <div>
                        <h4 className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-3">Risk Score Breakdown (Explainability)</h4>
                        <div className="space-y-2">
                          <ReasonBar label="Time Anomaly" value={alert.reasons.timeAnomaly} icon={<Clock className="h-3.5 w-3.5" />} />
                          <ReasonBar label="Sensitivity Score" value={alert.reasons.sensitivityScore} icon={<Shield className="h-3.5 w-3.5" />} />
                          <ReasonBar label="Role Deviation" value={alert.reasons.roleDeviation} icon={<User className="h-3.5 w-3.5" />} />
                          <ReasonBar label="Behavior Deviation" value={alert.reasons.behaviorDeviation} icon={<Brain className="h-3.5 w-3.5" />} />
                          <ReasonBar label="Decoy Interaction" value={alert.reasons.decoyWeight} icon={<FileWarning className="h-3.5 w-3.5" />} />
                        </div>
                      </div>

                      {alert.actions.length > 0 && (
                        <div>
                          <h4 className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-2">Suspicious Activity Timeline</h4>
                          <div className="space-y-1">
                            {alert.actions.map(a => (
                              <div key={a.id} className="flex items-center gap-3 text-xs py-1.5 px-2 rounded bg-secondary/30">
                                <span className="font-mono text-muted-foreground w-36 shrink-0">{new Date(a.timestamp).toLocaleString()}</span>
                                <span className={`font-mono ${a.isDecoy ? 'text-destructive font-bold' : 'text-foreground'}`}>{a.actionType}</span>
                                <span className="text-muted-foreground truncate flex-1">{a.resource}</span>
                                <RiskBadge severity={a.sensitivityLevel} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
