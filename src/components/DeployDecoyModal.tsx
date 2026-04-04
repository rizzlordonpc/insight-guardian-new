import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type DecoyAsset, type Severity } from "@/lib/mock-data";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; type: DecoyAsset['type']; sensitivityTag: Severity; department?: string }) => void;
}

export default function DeployDecoyModal({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<DecoyAsset['type']>("file");
  const [sensitivity, setSensitivity] = useState<Severity>("high");
  const [dept, setDept] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), type, sensitivityTag: sensitivity, department: dept || undefined });
    setName("");
    setType("file");
    setSensitivity("high");
    setDept("");
    onClose();
  };

  const inputCls = "w-full h-9 rounded-md border border-border bg-secondary/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block";
  const selectCls = "w-full h-9 rounded-md border border-border bg-secondary/50 px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground font-semibold">Deploy New Decoy Asset</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className={labelCls}>Decoy Name</label>
            <input className={inputCls} placeholder="salary-master-2026.xlsx" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Asset Type</label>
              <select className={selectCls} value={type} onChange={e => setType(e.target.value as DecoyAsset['type'])}>
                <option value="file">File</option>
                <option value="database">Database Record</option>
                <option value="api">API Endpoint</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Sensitivity</label>
              <select className={selectCls} value={sensitivity} onChange={e => setSensitivity(e.target.value as Severity)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Department (Optional)</label>
            <input className={inputCls} placeholder="e.g., Finance" value={dept} onChange={e => setDept(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1">Deploy Decoy</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
