// apps/web/app/auth/signup/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";

// All UI components from the shared @cursorcode/ui package
import {
  Button,
  Input,
  Label,
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
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Must contain at least one special character"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof formSchema>;

export default function SignUpPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const { register, handleSubmit, formState: { errors }, watch } = form;
  const passwordValue = useWatch({ control: form.control, name: "password" }) || "";

  // Password strength calculation (fixed return type)
  const getPasswordStrength = (password: string) => {
    if (!password) {
      return {
        label: "",
        color: "bg-gray-700",
        bars: 0,
      };
    }

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const strengthMap = [
      { label: "Very Weak", color: "bg-red-500", bars: 1 },
      { label: "Weak", color: "bg-orange-500", bars: 2 },
      { label: "Medium", color: "bg-yellow-500", bars: 3 },
      { label: "Strong", color: "bg-emerald-500", bars: 4 },
      { label: "Very Strong", color: "bg-green-500", bars: 5 },
    ];

    return strengthMap[Math.min(score - 1, 4)];
  };

  const strength = getPasswordStrength(passwordValue);

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to create account");
      }

      setSuccess(true);

      toast.success("Account Created", {
        description: "Please check your email to verify your account.",
        duration: 6000,
      });

      setTimeout(() => router.push("/auth/signin"), 5000);
    } catch (err: any) {
      const message = err.message || "Something went wrong. Please try again.";
      setError(message);

      toast.error("Signup Failed", {
        description: message,
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleOAuthSignIn = (provider: "google" | "github") => {
    setIsLoading(true);
    signIn(provider, { callbackUrl: "/dashboard" });
  };

  // Success Screen
  if (success) {
    return (
      <div className="min-h-screen storyboard-grid bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md cyber-card neon-glow">
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-400" />
            <CardTitle className="text-display text-4xl mt-4">Account Created!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-muted-foreground text-lg">
              We’ve sent a verification link to{" "}
              <strong className="text-foreground">{watch("email")}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              Check your inbox (and spam folder). Click the link to activate your account.
            </p>
            <Button asChild className="neon-glow w-full" variant="outline">
              <Link href="/auth/signin">Go to Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen storyboard-grid bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo + Tagline */}
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
            <CardTitle className="text-display text-3xl text-center">Create Account</CardTitle>
            <CardDescription className="text-center text-lg">
              Join the future of software engineering
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Error */}
            {error && (
              <Alert variant="destructive" className="neon-glow">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>Signup Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* OAuth */}
            <div className="grid gap-4">
              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn("google")}
                disabled={isLoading}
                className="h-12 neon-glow"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.51h5.92c-.25 1.22-.98 2.26-2.07 2.95v2.6h3.35c1.96-1.81 3.08-4.47 3.08-7.81z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.35-2.6c-.93.63-2.12 1-3.93 1-3.03 0-5.6-2.05-6.52-4.8H2.18v3.02C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.48 14.54c-.23-.7-.36-1.45-.36-2.23s.13-1.53.36-2.23V6.86H2.18C1.43 8.38 1 10.15 1 12s.43 3.62 1.18 5.14l3.3-2.6z" />
                    <path fill="#EA4335" d="M12 5.38c1.69 0 3.2.58 4.39 1.72l3.28-3.28C17.46 1.94 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.86l3.3 2.6c.92-2.75 3.49-4.8 6.52-4.8z" />
                  </svg>
                )}
                Sign up with Google
              </Button>

              <Button
                variant="outline"
                onClick={() => handleOAuthSignIn("github")}
                disabled={isLoading}
                className="h-12 neon-glow"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <svg className="mr-3 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.03-1.61-4.03-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.1-.75.08-.74.08-.74 1.21.09 1.85 1.24 1.85 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.97 0-1.32.47-2.4 1.24-3.24-.12-.3-.54-1.54.12-3.21 0 0 1.01-.32 3.31 1.23 1-.28 2.08-.42 3.15-.42 1.07 0 2.15.14 3.15.42 2.3-1.55 3.31-1.23 3.31-1.23.66 1.67.24 2.91.12 3.21.77.84 1.24 1.92 1.24 3.24 0 4.64-2.81 5.67-5.48 5.97.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.28 0 .32.22.69.83.58C20.56 21.8 24 17.31 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                )}
                Sign up with GitHub
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-4 text-muted-foreground">or continue with email</span>
              </div>
            </div>

            {/* Form */}
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

              {/* Password Field + Strength */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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

                {/* Strength Meter */}
                {passwordValue && (
                  <div className="space-y-1 pt-1">
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-all ${
                            i < strength.bars ? strength.color : "bg-gray-800"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span>Password strength:</span>
                      <span className={`font-medium ${strength.color.replace("bg-", "text-")}`}>
                        {strength.label}
                      </span>
                    </p>
                  </div>
                )}

                {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    {...register("confirmPassword")}
                    disabled={isLoading}
                    className="neon-glow pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full h-12 neon-glow text-lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Free Account"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter>
            <p className="text-sm text-muted-foreground text-center w-full">
              Already have an account?{" "}
              <Link href="/auth/signin" className="text-brand-blue hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
