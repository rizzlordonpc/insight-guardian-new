import type { Severity } from "@/lib/mock-data";

const styles: Record<Severity, string> = {
  low: "bg-primary/10 text-primary border-primary/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  critical: "bg-threat-critical/10 text-threat-critical border-threat-critical/20",
};

export default function RiskBadge({ severity, className = "" }: { severity: Severity; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider font-medium border ${styles[severity]} ${className}`}>
      {severity}
    </span>
  );
}
