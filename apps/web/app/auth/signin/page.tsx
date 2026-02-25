// apps/web/app/auth/signin/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, AlertCircle, Eye, EyeOff, Fingerprint } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";

import {
  Button,
  Input,
  Label,
  Checkbox,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
  AlertTitle,
  toast,
} from "@cursorcode/ui";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
  // Fixed Zod schema for totp_code
  totp_code: z.union([
    z.literal(""),
    z.string().regex(/^\d{6}$/, "2FA code must be 6 digits"),
  ]).optional(),
  rememberMe: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [isLoading, setIsLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [show2FA, setShow2FA] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      totp_code: "",
      rememberMe: true,
    },
    mode: "onChange",
  });

  const { register, handleSubmit, formState: { errors } } = form;

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        totp_code: data.totp_code || undefined,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        if (result.error.includes("2FA") || result.error.includes("TOTP")) {
          setShow2FA(true);
          setError("Two-factor authentication required. Enter your 6-digit code.");
        } else {
          setError(result.error || "Invalid email or password");
        }
        return;
      }

      toast.success("Welcome back!", {
        description: "Redirecting to dashboard...",
        duration: 3000,
      });

      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const handleBiometricSignIn = async () => {
    setBiometricLoading(true);
    setError(null);

    try {
      const optionsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/webauthn/login/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!optionsRes.ok) throw new Error("Failed to start biometric login");

      const options = await optionsRes.json();

      const authResult = await startAuthentication({
        optionsJSON: options,
        useBrowserAutofill: true,
      });

      const verificationRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/webauthn/login/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authResult),
        credentials: "include",
      });

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
        : (err.message || "Biometric login failed");
      setError(msg);
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

          <CardContent className="space-y-8">
            {error && (
              <Alert variant="destructive" className="neon-glow">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>Sign In Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

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

            <div className="relative">
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

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  {...register("email")}
                  disabled={isLoading}
                  className="neon-glow"
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="/auth/forgot-password" className="text-sm text-brand-blue hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    {...register("password")}
                    disabled={isLoading}
                    className="neon-glow pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              {show2FA && (
                <div className="space-y-2">
                  <Label htmlFor="totp_code">Two-Factor Code</Label>
                  <Input
                    id="totp_code"
                    placeholder="123456"
                    maxLength={6}
                    {...register("totp_code")}
                    disabled={isLoading}
                    className="font-mono text-center tracking-[8px] neon-glow text-xl"
                  />
                  {errors.totp_code && <p className="text-sm text-destructive">{errors.totp_code.message}</p>}
                  <p className="text-xs text-muted-foreground text-center">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox id="rememberMe" {...register("rememberMe")} />
                <Label htmlFor="rememberMe" className="text-sm cursor-pointer">Remember me for 30 days</Label>
              </div>

              <Button type="submit" className="w-full h-12 neon-glow text-lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter>
            <p className="text-sm text-muted-foreground text-center w-full">
              New to CursorCode AI?{" "}
              <Link href="/auth/signup" className="text-brand-blue hover:underline font-medium">
                Create free account
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
