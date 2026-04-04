import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Eye, Server, ArrowRight, Fingerprint, Activity } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-semibold tracking-tight">INSIGHT-GUARDIAN</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary/10 text-primary text-xs font-mono hover:bg-primary/20 transition-colors border border-primary/20"
          >
            <Lock className="h-3.5 w-3.5" />
            Operator Login
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-[10px] font-mono text-primary tracking-wider">INTERNAL SECURITY SOFTWARE</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight tracking-tight">
              Insider Threat Detection
              <br />
              <span className="text-primary">Through Intent Verification</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
              A centralized Security Operations Console that identifies malicious insider 
              activity using deception-based detection. Synthetic resources act as intent 
              discriminators — legitimate workflows never require their access.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 px-6 py-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Access Console
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#about"
                className="flex items-center gap-2 px-6 py-3 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                About the System
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="max-w-6xl mx-auto px-6 py-16 md:py-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Fingerprint,
              title: 'Decoy-Driven Detection',
              desc: 'Synthetic assets indistinguishable from real resources serve as definitive intent signals. Access to a decoy is never required by legitimate workflows.',
            },
            {
              icon: Activity,
              title: 'Non-Linear Risk Escalation',
              desc: 'Decoy interactions produce categorical risk jumps that override historical behavioral baselines, escalating faster with repetition.',
            },
            {
              icon: Eye,
              title: 'Human-in-the-Loop Containment',
              desc: 'Automated detection supports analyst judgment. Movement to restricted state requires explicit confirmation, logged rationale, and deliberate action.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-lg border border-border bg-card p-6">
              <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
          <div className="max-w-3xl">
            <h2 className="text-[11px] font-mono uppercase tracking-widest text-primary mb-4">About the System</h2>
            <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-6">
              Enterprise Internal Security Software
            </h3>
            <div className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                Insight-Guardian is designed for deployment on SOC workstations, IT administration 
                systems, and internal enterprise servers. It operates as a centralized monitoring 
                console that ingests employee access events and identifies potential insider threats 
                through deception-based intent verification.
              </p>
              <p>
                The system places synthetic resources — files, database records, and API endpoints — 
                that are indistinguishable from legitimate assets within the enterprise environment. 
                Since no authorized workflow requires access to these resources, any interaction 
                constitutes a strong indicator of malicious intent.
              </p>
              <p>
                Risk scoring is user-relative and role-aware. Decoy interactions produce non-linear 
                risk escalations that override historical behavioral baselines. All containment 
                decisions require explicit analyst confirmation with logged rationale, preserving 
                human judgment authority in the detection pipeline.
              </p>
            </div>
          </div>

          {/* Deployment Info */}
          <div className="mt-12 rounded-lg border border-border bg-card/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Server className="h-5 w-5 text-primary" />
              <h4 className="text-sm font-semibold text-foreground">Deployment Requirements</h4>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 text-xs text-muted-foreground">
              <div className="space-y-1">
                <p className="font-mono text-foreground/70">Target Environment</p>
                <p>Internal enterprise network</p>
                <p>SOC workstations & IT systems</p>
              </div>
              <div className="space-y-1">
                <p className="font-mono text-foreground/70">Access Control</p>
                <p>Administrator & Analyst roles only</p>
                <p>No employee-facing components</p>
              </div>
              <div className="space-y-1">
                <p className="font-mono text-foreground/70">Detection Model</p>
                <p>Deception-based intent verification</p>
                <p>Human-in-the-loop containment</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Restricted Access Notice */}
      <section className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-12 text-center">
          <Lock className="h-6 w-6 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Access to this system is restricted to authorized security operations personnel.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Unauthorized access attempts are logged and monitored.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Lock className="h-3.5 w-3.5" />
            Operator Login
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary/60" />
            <span className="text-[10px] font-mono text-muted-foreground/60">INSIGHT-GUARDIAN v1.0</span>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground/50">
            © {new Date().getFullYear()} Pranay Mishra. Internal security software — not for public distribution.
          </p>
        </div>
      </footer>
    </div>
  );
}
