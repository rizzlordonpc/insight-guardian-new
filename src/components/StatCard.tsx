import { ReactNode } from "react";
import { motion } from "framer-motion";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  change?: string;
  variant?: "default" | "warning" | "danger" | "success";
}

const variants = {
  default: "border-border",
  warning: "border-warning/30 glow-warning",
  danger: "border-destructive/30 glow-danger",
  success: "border-success/30",
};

export default function StatCard({ label, value, icon, change, variant = "default" }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border bg-card p-4 ${variants[variant]}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-mono tracking-wider text-muted-foreground uppercase">{label}</span>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <p className="text-2xl font-semibold font-mono text-foreground">{value}</p>
      {change && (
        <p className={`text-xs mt-1 font-mono ${change.startsWith('+') ? 'text-destructive' : 'text-success'}`}>
          {change} vs last 24h
        </p>
      )}
    </motion.div>
  );
}
