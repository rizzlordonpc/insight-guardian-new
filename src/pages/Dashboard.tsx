import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api";
import StatCard from "@/components/StatCard";
import RiskBadge from "@/components/RiskBadge";
import RiskScoreRing from "@/components/RiskScoreRing";
import { motion } from "framer-motion";
import { Users, AlertTriangle, FileWarning, Activity, TrendingUp, Shield } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type TimeSeriesRow = { date: string; low: number; medium: number; high: number; critical: number };
type HourlyRow = { hour: string; count: number; anomalies: number };

export default function Dashboard() {
  const { users, alerts, decoys } = useAppStore();
  const [timeSeries, setTimeSeries] = useState<TimeSeriesRow[]>([]);
  const [hourly, setHourly] = useState<HourlyRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [ts, h] = await Promise.all([api.dashboard.timeseries(), api.dashboard.hourly()]);
        if (cancelled) return;
        setTimeSeries(
          ts.series.map((s) => ({
            ...s,
            date: new Date(`${s.date}T12:00:00.000Z`).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
          })),
        );
        setHourly(
          h.hourly.map((row) => ({
            hour: `${String(row.hour).padStart(2, "0")}:00`,
            count: row.count,
            anomalies: row.anomalies,
          })),
        );
      } catch {
        /* leave charts empty on failure */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeUsers = users.filter(u => u.status === 'active').length;
  const highRiskUsers = users.filter(u => u.riskScore > 60).length;
  const openAlerts = alerts.filter(a => a.status === 'open' || a.status === 'investigating').length;
  const decoyHits = decoys.reduce((sum, d) => sum + d.accessCount, 0);

  const recentAlerts = alerts.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Threat Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Centralized insider threat monitoring console</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Monitored Subjects" value={activeUsers} icon={<Users className="h-4 w-4" />} change={`+${Math.floor(Math.random()*3)}`} />
        <StatCard label="High Risk Subjects" value={highRiskUsers} icon={<TrendingUp className="h-4 w-4" />} variant="danger" change={`+${Math.floor(Math.random()*2)}`} />
        <StatCard label="Open Alerts" value={openAlerts} icon={<AlertTriangle className="h-4 w-4" />} variant="warning" />
        <StatCard label="Decoy Interactions" value={decoyHits} icon={<FileWarning className="h-4 w-4" />} variant="danger" change={`+${Math.floor(Math.random()*4)}`} />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-4">Alert Trends (14 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timeSeries}>
              <defs>
                <linearGradient id="gCrit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(340,80%,55%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(340,80%,55%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gHigh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0,72%,55%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(0,72%,55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,18%)" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(215,12%,50%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(215,12%,50%)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(220,18%,10%)', border: '1px solid hsl(220,14%,18%)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="critical" stroke="hsl(340,80%,55%)" fill="url(#gCrit)" strokeWidth={2} />
              <Area type="monotone" dataKey="high" stroke="hsl(0,72%,55%)" fill="url(#gHigh)" strokeWidth={2} />
              <Area type="monotone" dataKey="medium" stroke="hsl(38,92%,55%)" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
              <Area type="monotone" dataKey="low" stroke="hsl(185,70%,50%)" fill="none" strokeWidth={1} strokeDasharray="2 2" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider mb-4">Hourly Activity &amp; Anomalies</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,18%)" />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'hsl(215,12%,50%)' }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(215,12%,50%)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'hsl(220,18%,10%)', border: '1px solid hsl(220,14%,18%)', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="hsl(185,70%,50%)" opacity={0.3} radius={[2, 2, 0, 0]} />
              <Bar dataKey="anomalies" fill="hsl(0,72%,55%)" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Recent Alerts */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Recent Alerts</h3>
          <a href="/alerts" className="text-xs text-primary hover:underline">View All →</a>
        </div>
        <div className="divide-y divide-border">
          {recentAlerts.map(alert => (
            <div key={alert.id} className="p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors">
              <RiskScoreRing score={alert.riskScore} size={40} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{alert.title}</p>
                <p className="text-xs text-muted-foreground">{alert.userName} · {new Date(alert.timestamp).toLocaleString()}</p>
              </div>
              <RiskBadge severity={alert.severity} />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Top Risk Users */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border">
          <h3 className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Highest Risk Subjects</h3>
        </div>
        <div className="divide-y divide-border">
          {[...users].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5).map(user => (
            <div key={user.id} className="p-4 flex items-center gap-4">
              <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full bg-secondary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{user.role} · {user.department}</p>
              </div>
              <RiskScoreRing score={user.riskScore} size={36} />
              <span className={`text-xs font-mono ${user.riskTrend === 'increasing' ? 'text-destructive' : user.riskTrend === 'decreasing' ? 'text-success' : 'text-muted-foreground'}`}>
                {user.riskTrend === 'increasing' ? '▲' : user.riskTrend === 'decreasing' ? '▼' : '─'}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
