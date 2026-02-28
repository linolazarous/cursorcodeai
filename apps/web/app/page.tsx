// apps/web/app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";

// UI components
import { Button, Card } from "@cursorcode/ui";

import { Sparkles, Play, X, Menu } from "lucide-react";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [demoPrompt, setDemoPrompt] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const examplePrompt = "Build a fitness tracking SaaS with Apple Watch sync, streak counters, and AI workout suggestions";

  // Typing animation
  useEffect(() => {
    if (isTyping) {
      let i = 0;
      const interval = setInterval(() => {
        setDemoPrompt(examplePrompt.slice(0, i));
        i++;
        if (i > examplePrompt.length) {
          clearInterval(interval);
          setIsTyping(false);
          setTimeout(() => setVideoPlaying(true), 800);
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isTyping]);

  const playDemo = () => setIsTyping(true);

  const toggleVideo = () => {
    if (videoRef.current) {
      if (videoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setVideoPlaying(!videoPlaying);
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <Image
                src="/logo.svg"
                alt="CursorCode AI"
                width={36}
                height={36}
                className="h-9 w-auto transition-transform group-hover:scale-110"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.parentElement;
                  if (fallback) {
                    const textFallback = document.createElement("span");
                    textFallback.className = "text-3xl font-black tracking-tighter text-brand-blue drop-shadow-[0_0_12px_#3b82f6]";
                    textFallback.textContent = "CC";
                    fallback.appendChild(textFallback);
                  }
                }}
              />
            </div>
            <span className="text-display text-2xl font-bold tracking-tighter">CursorCode AI</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="#demo" className="text-sm hover:text-brand-blue transition-colors">Live Demo</Link>
            <Link href="#how" className="text-sm hover:text-brand-blue transition-colors">How it works</Link>
            <Link href="/auth/signin" className="text-sm hover:text-brand-blue transition-colors">Sign in</Link>
            <Button asChild className="neon-glow text-sm h-10 px-6">
              <Link href="/auth/signup">Start Building Free</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-foreground hover:text-brand-blue transition-colors"
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl mobile-menu">
            <div className="flex flex-col px-6 py-6 space-y-4 text-center">
              <Link href="#demo" onClick={() => setIsMenuOpen(false)} className="text-base hover:text-brand-blue">Live Demo</Link>
              <Link href="#how" onClick={() => setIsMenuOpen(false)} className="text-base hover:text-brand-blue">How it works</Link>
              <Link href="/auth/signin" onClick={() => setIsMenuOpen(false)} className="text-base hover:text-brand-blue">Sign in</Link>
              <Button asChild className="w-full neon-glow text-base h-12">
                <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)}>Start Building Free</Link>
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-24 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1E88E520_0%,transparent_70%)]" />
        <div className="container mx-auto px-6 text-center max-w-5xl relative z-10">
          <div className="inline-flex items-center gap-3 mb-6 px-6 py-2 rounded-full border border-brand-blue/30 bg-card/50 animate-pulse">
            <Sparkles className="h-5 w-5 text-brand-glow" />
            <span className="text-sm font-medium text-brand-glow">Powered by xAI’s Grok • Public Beta</span>
          </div>

          <h1 className="text-display text-6xl md:text-8xl font-bold tracking-tighter leading-tight mb-6">
            Build Anything.<br />
            <span className="text-gradient-brand">
              Automatically.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            The world’s most powerful autonomous AI software engineering platform.<br />
            Natural language → full-stack app in minutes.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="neon-glow text-lg h-14 px-10" asChild>
              <Link href="/auth/signup">Start Building Free →</Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="neon-glow text-lg h-14 px-10"
              onClick={() => document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" })}
            >
              Watch Live Demo
            </Button>
          </div>
        </div>
      </section>

      {/* LIVE DEMO */}
      <section id="demo" className="py-24 border-t border-border bg-black/40">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <div className="text-brand-glow text-sm tracking-[4px] mb-3">EXACTLY AS SEEN IN THE VIDEO</div>
            <h2 className="text-display text-4xl md:text-5xl font-bold leading-tight">Watch CursorCode AI Build in Real Time</h2>
          </div>

          <Card className="cyber-card neon-glow overflow-hidden border-brand-blue/40">
            <div className="relative aspect-video bg-black video-container">
              <video
                ref={videoRef}
                src="/videos/demo-video.mp4"
                className="w-full h-full object-cover"
                loop
                muted
                playsInline
                onPlay={() => setVideoPlaying(true)}
                onPause={() => setVideoPlaying(false)}
              />

              {!videoPlaying && (
                <button
                  onClick={toggleVideo}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 hover:bg-black/40 transition-all group video-play-btn"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-white/80 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="h-8 w-8 md:h-10 md:w-10 ml-1 text-white" fill="white" />
                  </div>
                </button>
              )}

              <div className="absolute bottom-4 left-4 right-4 bg-black/80 border border-brand-blue/50 rounded-2xl p-4 md:p-6 backdrop-blur-md">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-brand-glow text-xs tracking-widest">LIVE DEMO</div>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-brand-blue to-transparent" />
                </div>

                <div className="font-mono text-sm text-brand-glow min-h-[40px] md:min-h-[52px] leading-relaxed">
                  {isTyping ? demoPrompt : "Type any idea below and watch the magic..."}
                </div>

                <button
                  onClick={playDemo}
                  disabled={isTyping}
                  className="mt-4 w-full h-10 md:h-11 bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isTyping ? "Building your app..." : "Try the exact prompt from the video"}
                </button>
              </div>
            </div>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            This is the exact 60-second demo from the advertising video • Click to replay
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 border-t border-border">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-display text-5xl md:text-6xl font-bold tracking-tighter mb-6 leading-tight">
              Ready to replace your entire dev team?
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 leading-relaxed">
              Join thousands of builders using CursorCode AI today.
            </p>
            <Button size="lg" className="neon-glow text-xl h-14 md:h-16 px-8 md:px-16" asChild>
              <Link href="/auth/signup">Start Free — No Credit Card Required</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 md:py-16 bg-card">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          © {currentYear} CursorCode AI • All rights reserved
        </div>
      </footer>
    </div>
  );
}
