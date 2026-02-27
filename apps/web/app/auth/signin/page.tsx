"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Fingerprint } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  toast,
} from "@cursorcode/ui";

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [isLoading, setIsLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const handleBiometricSignIn = async () => {
    setBiometricLoading(true);
    try {
      const optionsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/webauthn/login/options`,
        { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include" }
      );

      if (!optionsRes.ok) throw new Error("Failed to start biometric login");

      const options = await optionsRes.json();

      const authResult = await startAuthentication({
        optionsJSON: options,
        useBrowserAutofill: true,
      });

      const verificationRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/webauthn/login/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(authResult),
          credentials: "include",
        }
      );

      const result = await verificationRes.json();

      if (verificationRes.ok && result.success) {
        toast.success("Biometric login successful", { description: "Welcome back!" });
        router.push(callbackUrl);
        router.refresh();
      } else {
        throw new Error(result.error || "Biometric verification failed");
      }
    } catch (err: any) {
      const msg = err.message?.includes("AbortError")
        ? "Biometric prompt was cancelled"
        : err.message || "Biometric login failed";
      toast.error("Biometric login failed", { description: msg });
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleOAuthSignIn = (provider: "google" | "github") => {
    setIsLoading(true);
    signIn(provider, { callbackUrl });
  };

  return (
    <div className="min-h-screen storyboard-grid bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-display text-5xl font-bold tracking-tighter neon-glow">
            CursorCode AI
          </h1>
          <p className="text-xl text-muted-foreground mt-3">
            Build Anything. Automatically. With AI.
          </p>
        </div>

        <Card className="cyber-card neon-glow border-brand-blue/30">
          <CardHeader className="space-y-2">
            <CardTitle className="text-display text-3xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center text-lg">
              Access your autonomous AI engineering platform
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Button
              onClick={handleBiometricSignIn}
              disabled={biometricLoading}
              className="w-full h-14 neon-glow text-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 font-medium"
            >
              {biometricLoading ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Waiting for biometrics...
                </>
              ) : (
                <>
                  <Fingerprint className="mr-3 h-6 w-6" />
                  Sign in with Biometrics
                </>
              )}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-4 text-muted-foreground">or continue with</span>
              </div>
            </div>

            <div className="grid gap-4">
              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn("google")}
                disabled={isLoading}
                className="h-12 neon-glow"
              >
                Continue with Google
              </Button>

              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn("github")}
                disabled={isLoading}
                className="h-12 neon-glow"
              >
                Continue with GitHub
              </Button>
            </div>
          </CardContent>

          <CardFooter>
            <p className="text-sm text-muted-foreground text-center w-full">
              New to CursorCode AI?{" "}
              <Link
                href="/auth/signup"
                className="text-brand-blue hover:underline font-medium"
              >
                Create free account
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
