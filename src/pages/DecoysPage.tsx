import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useRole } from "@/lib/auth";
import { type DecoyAsset, type Severity } from "@/lib/mock-data";
import RiskBadge from "@/components/RiskBadge";
import { motion } from "framer-motion";
import { FileText, Database, Globe, Plus, Eye, Trash2 } from "lucide-react";
import DeployDecoyModal from "@/components/DeployDecoyModal";

const typeIcons = { file: FileText, database: Database, api: Globe };

export default function DecoysPage() {
  const { decoys, addDecoy } = useAppStore();
  const { isAdmin } = useRole();
  const [showDeploy, setShowDeploy] = useState(false);

  const totalHits = decoys.reduce((s, d) => s + d.accessCount, 0);
  const activeDecoys = decoys.filter(d => d.status === 'active').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Decoy Asset Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{activeDecoys} active decoys · {totalHits} total interactions</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowDeploy(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            Deploy Decoy
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {([['critical', 'High Sensitivity'], ['high', 'Medium Sensitivity'], ['medium', 'Low Sensitivity']] as [Severity, string][]).map(([sev, label]) => {
          const count = decoys.filter(d => d.sensitivityTag === sev).length;
          return (
            <div key={sev} className={`rounded-lg border border-border bg-card p-4 threat-gradient-${sev}`}>
              <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-semibold font-mono text-foreground mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Decoy Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {decoys.map((decoy, i) => {
          const Icon = typeIcons[decoy.type];
          return (
            <motion.div key={decoy.id}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="rounded-lg border border-border bg-card p-4 hover:bg-secondary/20 cursor-pointer transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground truncate max-w-[180px]">{decoy.name}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">{decoy.format.toUpperCase()} · {decoy.type}</p>
                  </div>
                </div>
                <RiskBadge severity={decoy.sensitivityTag} />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-muted-foreground">Beacon: {decoy.beacon}</span>
                <span className={`font-mono font-bold ${decoy.accessCount > 0 ? 'text-destructive' : 'text-success'}`}>
                  {decoy.accessCount} hits
                </span>
              </div>

              {decoy.lastAccessed && (
                <p className="text-[10px] font-mono text-muted-foreground mt-2">
                  Last accessed: {new Date(decoy.lastAccessed).toLocaleString()}
                </p>
              )}

              <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-secondary text-xs text-muted-foreground hover:text-foreground">
                  <Eye className="h-3 w-3" /> View
                </button>
                {isAdmin && (
                  <button className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded bg-destructive/10 text-xs text-destructive hover:bg-destructive/20">
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <DeployDecoyModal open={showDeploy} onClose={() => setShowDeploy(false)} onSubmit={addDecoy} />
    </div>
  );
}
