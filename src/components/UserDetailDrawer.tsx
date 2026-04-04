import { type User } from "@/lib/mock-data";
import { type ContainmentState, useAppStore } from "@/lib/store";
import { useAuth, useRole } from "@/lib/auth";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import RiskScoreRing from "@/components/RiskScoreRing";
import RiskBadge from "@/components/RiskBadge";
import { Lock, Unlock, FileText, Database, Globe, Clock, ShieldAlert, ShieldCheck, AlertTriangle } from "lucide-react";

interface Props {
  user: User | null;
  onClose: () => void;
}

export default function UserDetailDrawer({ user, onClose }: Props) {
  const { containment, setContainment, clearContainment, restrictUser, restoreUser, simulateAccessAttempt, accessEvents, adminActions } = useAppStore();
  const { user: authUser } = useAuth();
  const { isAdmin } = useRole();
  const [duration, setDuration] = useState<'1h' | '24h' | 'manual'>('1h');
  const [rationale, setRationale] = useState('');
  const [showRestrictConfirm, setShowRestrictConfirm] = useState(false);

  if (!user) return null;

  const c = containment[user.id];
  const isContained = !!c;
  const isRestricted = user.status === 'frozen' || isContained;

  // Get user's recent access events
  const userAccessEvents = accessEvents
    .filter(e => e.userId === user.id)
    .slice(0, 8);

  // Get admin actions for this user
  const userAdminActions = adminActions
    .filter(a => a.targetUserId === user.id)
    .slice(0, 5);

  const handleRestrict = () => {
    if (!rationale.trim()) return;
    restrictUser(user.id, authUser?.name || 'Unknown', rationale.trim());
    setShowRestrictConfirm(false);
    setRationale('');
  };

  const handleRestore = () => {
    restoreUser(user.id, authUser?.name || 'Unknown');
  };

  const handleSimulateAccess = () => {
    const resources = ['Q4-Report.xlsx', 'db/users_table', 'api/v2/payments', 'hr/reviews.docx', 'ops/credentials.txt'];
    const resource = resources[Math.floor(Math.random() * resources.length)];
    simulateAccessAttempt(user.id, resource);
  };

  const statusSeverity = user.status === 'frozen' ? 'critical' : user.status === 'flagged' ? 'high' : 'low';

  const handleToggle = (field: 'fileAccess' | 'dbAccess' | 'apiAccess') => {
    const current = c || { fileAccess: false, dbAccess: false, apiAccess: false, duration: '1h', appliedAt: null };
    const updated: ContainmentState = {
      ...current,
      [field]: !current[field],
      duration,
      appliedAt: new Date().toISOString(),
    };
    if (!updated.fileAccess && !updated.dbAccess && !updated.apiAccess) {
      clearContainment(user.id);
    } else {
      setContainment(user.id, updated);
    }
  };

  return (
    <Sheet open={!!user} onOpenChange={() => onClose()}>
      <SheetContent className="bg-card border-border w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <img src={user.avatar} alt="" className="h-10 w-10 rounded-full bg-secondary" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-foreground">{user.name}</SheetTitle>
                {isRestricted && <Lock className="h-4 w-4 text-destructive" />}
              </div>
              <p className="text-xs text-muted-foreground font-mono">{user.role} · {user.department}</p>
            </div>
            <RiskBadge severity={statusSeverity} />
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Risk Overview */}
          <section>
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Risk Overview</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-secondary/30 rounded-lg p-3 flex flex-col items-center">
                <RiskScoreRing score={user.riskScore} size={48} />
                <p className="text-[10px] font-mono text-muted-foreground mt-1">SCORE</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 text-center">
                <p className={`text-lg font-semibold font-mono ${user.riskTrend === 'increasing' ? 'text-destructive' : user.riskTrend === 'decreasing' ? 'text-success' : 'text-muted-foreground'}`}>
                  {user.riskTrend === 'increasing' ? '▲' : user.riskTrend === 'decreasing' ? '▼' : '─'}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {user.riskTrend === 'increasing' ? 'RISING' : user.riskTrend === 'decreasing' ? 'FALLING' : 'STABLE'}
                </p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3 text-center">
                <p className="text-lg font-semibold font-mono text-foreground">{(user.behaviorProfile.stabilityScore * 100).toFixed(0)}%</p>
                <p className="text-[10px] font-mono text-muted-foreground">STABILITY</p>
              </div>
            </div>
          </section>

          {/* Current Status Banner */}
          {isRestricted && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                <span className="text-xs font-mono text-destructive font-bold">ACCESS RESTRICTED BY ADMINISTRATOR</span>
              </div>
              <p className="text-[10px] font-mono text-muted-foreground ml-6">
                All system resource access is denied. Attempted access will be logged and escalate risk score.
              </p>
            </div>
          )}

          {/* Admin Quick Actions */}
          {isAdmin && (
            <section>
              <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Administrative Actions</h3>
              
              {!isRestricted && !showRestrictConfirm && (
                <Button 
                  variant="destructive" 
                  className="w-full" 
                  onClick={() => setShowRestrictConfirm(true)}
                >
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Restrict Access
                </Button>
              )}

              {showRestrictConfirm && !isRestricted && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="text-xs font-mono text-destructive font-bold">CONFIRM RESTRICTION</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This will deny all system resource access for {user.name}. A rationale is required.
                  </p>
                  <textarea
                    className="w-full h-16 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-destructive resize-none font-mono"
                    placeholder="Enter rationale for restriction..."
                    value={rationale}
                    onChange={e => setRationale(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" className="flex-1" onClick={handleRestrict} disabled={!rationale.trim()}>
                      <Lock className="h-3.5 w-3.5 mr-1.5" />
                      Confirm Restriction
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setShowRestrictConfirm(false); setRationale(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {isRestricted && (
                <Button variant="outline" className="w-full border-primary/30 text-primary hover:bg-primary/10" onClick={handleRestore}>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Restore Access
                </Button>
              )}

              {/* Simulate access attempt button (for demo) */}
              <Button variant="outline" size="sm" className="w-full mt-2 text-muted-foreground" onClick={handleSimulateAccess}>
                Simulate Access Attempt
              </Button>
            </section>
          )}

          {/* Access Event Timeline */}
          <section>
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Access Event Log</h3>
            <div className="space-y-1.5">
              {userAccessEvents.length === 0 && (
                <p className="text-xs text-muted-foreground font-mono py-2">No access events recorded</p>
              )}
              {userAccessEvents.map(event => (
                <div key={event.id} className={`flex items-start gap-3 py-2 px-2.5 rounded border-b border-border last:border-0 ${
                  event.accessType === 'denied' ? 'bg-destructive/5' : event.accessType === 'decoy' ? 'bg-warning/5' : ''
                }`}>
                  <Clock className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">
                      <span className={`font-mono font-bold ${
                        event.accessType === 'denied' ? 'text-destructive' : event.accessType === 'decoy' ? 'text-warning' : 'text-foreground'
                      }`}>{event.actionType}</span>
                      {' → '}{event.resource}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()} · {event.ip}
                    </p>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                    event.accessType === 'denied' ? 'bg-destructive/20 text-destructive' :
                    event.accessType === 'decoy' ? 'bg-warning/20 text-warning' :
                    'bg-secondary text-muted-foreground'
                  }`}>
                    {event.accessType.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Admin Action History */}
          {userAdminActions.length > 0 && (
            <section>
              <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Admin Action History</h3>
              <div className="space-y-1.5">
                {userAdminActions.map(action => (
                  <div key={action.id} className="flex items-start gap-3 py-2 px-2.5 rounded bg-secondary/20">
                    {action.actionType === 'USER_RESTRICTED' ? (
                      <Lock className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground">
                        <span className="font-mono font-bold">{action.actionType}</span>
                        {' by '}{action.operatorName}
                      </p>
                      {action.rationale && (
                        <p className="text-[10px] text-muted-foreground mt-0.5 italic">"{action.rationale}"</p>
                      )}
                      <p className="text-[10px] font-mono text-muted-foreground">{new Date(action.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Granular Access Control (Admin only) */}
          {isAdmin && (
            <section>
              <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Granular Access Control</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">File Access</span>
                  </div>
                  <Switch checked={c?.fileAccess ?? false} onCheckedChange={() => handleToggle('fileAccess')} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Database Access</span>
                  </div>
                  <Switch checked={c?.dbAccess ?? false} onCheckedChange={() => handleToggle('dbAccess')} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">API Access</span>
                  </div>
                  <Switch checked={c?.apiAccess ?? false} onCheckedChange={() => handleToggle('apiAccess')} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Duration</p>
                <div className="flex gap-2">
                  {([['1h', '1 Hour'], ['24h', '24 Hours'], ['manual', 'Until Restored']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setDuration(val)}
                      className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${duration === val ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Behavior Profile */}
          <section>
            <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-3">Behavior Profile</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="text-sm font-semibold font-mono text-foreground">{user.behaviorProfile.avgLoginHour}:00</p>
                <p className="text-[10px] font-mono text-muted-foreground tracking-wider">AVG LOGIN</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="text-sm font-semibold font-mono text-foreground">{user.behaviorProfile.avgDailyAccesses}</p>
                <p className="text-[10px] font-mono text-muted-foreground tracking-wider">DAILY ACCESSES</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="text-sm font-semibold font-mono text-foreground">{user.behaviorProfile.avgSessionMinutes}m</p>
                <p className="text-[10px] font-mono text-muted-foreground tracking-wider">AVG SESSION</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="text-sm font-semibold font-mono text-foreground">{user.behaviorProfile.commonFileTypes.join(', ')}</p>
                <p className="text-[10px] font-mono text-muted-foreground tracking-wider">FILE TYPES</p>
              </div>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
