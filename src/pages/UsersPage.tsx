import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { useRole } from "@/lib/auth";
import { type User, type Role } from "@/lib/mock-data";
import RiskScoreRing from "@/components/RiskScoreRing";
import RiskBadge from "@/components/RiskBadge";
import { motion } from "framer-motion";
import { Search, Plus, Lock, UserPlus } from "lucide-react";
import AddEmployeeModal from "@/components/AddEmployeeModal";
import UserDetailDrawer from "@/components/UserDetailDrawer";

export default function UsersPage() {
  const { users, containment, addUser } = useAppStore();
  const { isAdmin, role } = useRole();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "All">("All");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = users
    .filter(u => (roleFilter === "All" || u.role === roleFilter))
    .filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.riskScore - a.riskScore);

  const roles: (Role | "All")[] = ["All", "Admin", "Manager", "Employee", "Intern"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Monitored Personnel</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} subjects under observation</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <UserPlus className="h-4 w-4" />
            Add Subject
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full h-9 rounded-md border border-border bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Search monitored personnel..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1">
          {roles.map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${roleFilter === r ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
            >{r}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["User", "Role", "Department", "Risk Score", "Trend", "Status", "Last Activity"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(user => {
                const isContained = !!containment[user.id];
                return (
                  <tr key={user.id} onClick={() => setSelectedUser(user)}
                    className="hover:bg-secondary/20 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img src={user.avatar} alt="" className="h-7 w-7 rounded-full bg-secondary" />
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="font-medium text-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
                          </div>
                          {isContained && <Lock className="h-3.5 w-3.5 text-destructive" />}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{user.role}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{user.department}</td>
                    <td className="px-4 py-3"><RiskScoreRing score={user.riskScore} size={32} /></td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-mono ${user.riskTrend === 'increasing' ? 'text-destructive' : user.riskTrend === 'decreasing' ? 'text-success' : 'text-muted-foreground'}`}>
                        {user.riskTrend === 'increasing' ? '▲ Rising' : user.riskTrend === 'decreasing' ? '▼ Falling' : '─ Stable'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isContained ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-destructive/20 text-destructive border border-destructive/30">
                          <Lock className="h-3 w-3" /> CONTAINED
                        </span>
                      ) : (
                        <RiskBadge severity={user.status === 'flagged' ? 'high' : user.status === 'frozen' ? 'critical' : 'low'} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                      {new Date(user.lastActivity).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AddEmployeeModal open={showAddModal} onClose={() => setShowAddModal(false)} onSubmit={addUser} />
      <UserDetailDrawer user={selectedUser} onClose={() => setSelectedUser(null)} />
    </div>
  );
}
