import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type Role, type Department } from "@/lib/mock-data";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    email: string;
    role: Role;
    department: Department;
    workingHours: { start: number; end: number };
    accessLevel: string;
  }) => void;
}

const roles: Role[] = ["Admin", "Manager", "Employee", "Intern"];
const departments: Department[] = ["Engineering", "Finance", "HR", "Marketing", "Legal", "Operations"];

export default function AddEmployeeModal({ open, onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("Employee");
  const [dept, setDept] = useState<Department>("Engineering");
  const [access, setAccess] = useState("Normal");
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(17);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      role,
      department: dept,
      workingHours: { start: startHour, end: endHour },
      accessLevel: access,
    });
    setName("");
    setEmail("");
    setRole("Employee");
    setDept("Engineering");
    setAccess("Normal");
    onClose();
  };

  const inputCls = "w-full h-9 rounded-md border border-border bg-secondary/50 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";
  const labelCls = "text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1 block";
  const selectCls = "w-full h-9 rounded-md border border-border bg-secondary/50 px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary appearance-none";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground font-semibold">Add Monitored Subject</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className={labelCls}>Full Name</label>
            <input className={inputCls} placeholder="John Doe" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input className={inputCls} type="email" placeholder="john.doe@corp.internal" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Subject Role</label>
              <select className={selectCls} value={role} onChange={e => setRole(e.target.value as Role)}>
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <select className={selectCls} value={dept} onChange={e => setDept(e.target.value as Department)}>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Access Level</label>
            <select className={selectCls} value={access} onChange={e => setAccess(e.target.value)}>
              <option value="Normal">Normal</option>
              <option value="Restricted">Restricted</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Work Start Hour</label>
              <select className={selectCls} value={startHour} onChange={e => setStartHour(+e.target.value)}>
                {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Work End Hour</label>
              <select className={selectCls} value={endHour} onChange={e => setEndHour(+e.target.value)}>
                {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1">Add Subject</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
