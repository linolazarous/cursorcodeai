"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button, Card } from "@cursorcode/ui";
import {
  Cpu,
  Cloud,
  ShieldCheck,
  CheckCircle,
  LogIn,
  ArrowRight,
} from "lucide-react";

/* =========================================================
   MAIN LANDING PAGE – Updated for full backend alignment
========================================================= */

export default function LandingPage() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ================= TOP NAV ================= */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between max-w-6xl">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="CursorCode AI"
              width={32}
              height={32}
              className="rounded"
            />
            <span className="font-bold text-xl tracking-tighter">CursorCode AI</span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm">
            <Link href="#architecture" className="hover:text-brand-blue transition-colors">
              Architecture
            </Link>
            <Link href="#demo" className="hover:text-brand-blue transition-colors">
              Live Demo
            </Link>
            <Link href="#security" className="hover:text-brand-blue transition-colors">
              Security
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="neon-glow">
              <Link href="/auth/signin" className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
            </Button>
            <Button size="sm" className="neon-glow" asChild>
              <Link href="/auth/signup">Get Started Free →</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* ================= HERO ================= */}
      <section className="pt-32 pb-32 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20 animate-pulse" />

        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          <Image
            src="/logo.png"
            alt="CursorCode AI"
            width={80}
            height={80}
            className="mx-auto mb-8"
          />

          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6 leading-tight">
            Build Anything.
            <br />
            <span className="text-gradient-brand">Automatically. With AI.</span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12">
            The world’s first self-directing AI engineering organization.<br />
            From plain English → production-ready → deployed globally.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="h-14 px-14 neon-glow text-lg" asChild>
              <Link href="/auth/signup">
                Deploy on CursorCode AI →
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-10 neon-glow text-lg" asChild>
              <Link href="/auth/signin">Sign in</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-6">No credit card required • Free tier available</p>
        </div>
      </section>

      {/* =========================================================
         INTERACTIVE ARCHITECTURE GRAPH
      ========================================================= */}
      <section id="architecture" className="py-32 border-t border-border text-center">
        <div className="container mx-auto px-6 max-w-5xl">
          <h2 className="text-5xl font-bold mb-16">Multi-Agent Architecture</h2>
          <ArchitectureGraph />
        </div>
      </section>

      {/* =========================================================
         LIVE DEPLOY TERMINAL
      ========================================================= */}
      <section id="demo" className="py-32 border-t border-border bg-black/40">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <h2 className="text-5xl font-bold mb-12">Live Autonomous Deployment</h2>
          <DeployTerminal />
        </div>
      </section>

      {/* =========================================================
         CREDIT METER PREVIEW
      ========================================================= */}
      <section className="py-32 border-t border-border text-center">
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="text-5xl font-bold mb-12">AI Credit Intelligence</h2>
          <CreditMeter />
        </div>
      </section>

      {/* =========================================================
         ENTERPRISE COMPLIANCE
      ========================================================= */}
      <section id="security" className="py-32 border-t border-border bg-card text-center">
        <div className="container mx-auto px-6 max-w-6xl">
          <h2 className="text-5xl font-bold mb-16">Enterprise-Grade Security & Compliance</h2>
          <div className="grid md:grid-cols-3 gap-12">
            <ComplianceCard
              icon={<ShieldCheck />}
              title="SOC 2 Ready Architecture"
              desc="Infrastructure designed for SOC 2 Type II readiness and audit workflows."
            />
            <ComplianceCard
              icon={<CheckCircle />}
              title="GDPR Compliant Data Handling"
              desc="Encrypted secrets, data isolation, right-to-erasure support."
            />
            <ComplianceCard
              icon={<Cloud />}
              title="Secure Cloud Infrastructure"
              desc="RBAC, JWT/OAuth, audit logs, rate limiting, isolated environments."
            />
          </div>
        </div>
      </section>

      {/* ================= FINAL CTA ================= */}
      <section className="py-32 border-t border-border text-center">
        <div className="container mx-auto px-6 max-w-3xl">
          <h2 className="text-6xl font-bold mb-8">The Autonomous Engineering Future.</h2>
          <Button size="lg" className="h-16 px-16 neon-glow text-xl" asChild>
            <Link href="/auth/signup">Start Building on CursorCode AI</Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border py-12 text-center text-sm text-muted-foreground">
        © {currentYear} CursorCode AI • https://cursorcode.ai • info@cursorcode.ai
      </footer>
    </div>
  );
}

/* =========================================================
   INTERACTIVE ARCHITECTURE GRAPH (unchanged)
========================================================= */
function ArchitectureGraph() {
  const nodes = [
    "Architect Agent",
    "Frontend Agent",
    "Backend Agent",
    "DevOps Agent",
    "Security Agent",
    "QA Agent",
    "Product Agent",
  ];

  const [active, setActive] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActive((prev) => (prev + 1) % nodes.length);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {nodes.map((node, index) => (
        <div
          key={node}
          className={`p-6 rounded-xl border transition-all duration-500 ${
            index === active
              ? "border-brand-blue bg-brand-blue/10 scale-105"
              : "border-border bg-card"
          }`}
        >
          {node}
        </div>
      ))}
    </div>
  );
}

/* =========================================================
   DEPLOY TERMINAL ANIMATION (updated demo URL)
========================================================= */
function DeployTerminal() {
  const lines = [
    "Analyzing prompt...",
    "Generating system architecture...",
    "Creating Next.js frontend...",
    "Provisioning PostgreSQL...",
    "Configuring Stripe billing...",
    "Running tests...",
    "Building Docker container...",
    "Deploying to CursorCode Cloud...",
    "Application live at https://your-project.cursorcode.ai",
  ];

  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= lines.length) return;
    const timeout = setTimeout(() => {
      setStep((prev) => prev + 1);
    }, 900);
    return () => clearTimeout(timeout);
  }, [step]);

  return (
    <Card className="p-8 bg-black text-green-400 font-mono text-left border border-border">
      {lines.slice(0, step).map((line, i) => (
        <div key={i}>✔ {line}</div>
      ))}
    </Card>
  );
}

/* =========================================================
   CREDIT METER (unchanged)
========================================================= */
function CreditMeter() {
  const total = 150;
  const used = 87;
  const percentage = (used / total) * 100;

  return (
    <Card className="p-8 border border-brand-blue/40 neon-glow">
      <div className="text-3xl font-bold mb-4">
        {used} / {total} AI Credits Used
      </div>

      <div className="w-full h-4 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-blue transition-all duration-1000"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="mt-4 text-muted-foreground">
        Credits automatically meter builds, deployments, and AI orchestration.
      </p>
    </Card>
  );
}

/* =========================================================
   COMPLIANCE CARD (unchanged)
========================================================= */
function ComplianceCard({ icon, title, desc }: any) {
  return (
    <div className="p-8 border border-border rounded-xl bg-background">
      <div className="mb-4 flex justify-center text-brand-blue">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground">{desc}</p>
    </div>
  );
}
