"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { Loader2, CheckCircle2, Eye, EyeOff, AlertCircle } from "lucide-react";

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

// Zod schema for reset password form
const formSchema = z.object({
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

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: "", confirmPassword: "" },
    mode: "onChange",
  });

  const { register, handleSubmit, formState: { errors }, control } = form;
  const passwordValue = useWatch({ control, name: "password" }) || "";

  // Password strength helper
  const getPasswordStrength = (password: string) => {
    if (!password) return { label: "", color: "bg-gray-700", bars: 0 };

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

  // Submit handler
  async function onSubmit(data: FormData) {
    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to reset password");
      }

      setSuccess(true);

      toast.success("Password Reset Successful", {
        description: "You can now sign in with your new password.",
        duration: 6000,
      });

      // Auto-redirect after 5 seconds
      setTimeout(() => router.push("/auth/signin"), 5000);
    } catch (err: any) {
      const message = err.message || "Something went wrong. Please try again.";
      setError(message);

      toast.error("Reset Failed", { description: message, duration: 5000 });
    } finally {
      setIsLoading(false);
    }
  }

  // Success Screen
  if (success) {
    return (
      <div className="min-h-screen storyboard-grid bg-background flex items-center justify-center px-4">
        <Card className="w-full max-w-md cyber-card neon-glow">
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto h-16 w-16 text-green-400" />
            <CardTitle className="text-display text-4xl mt-4">Password Reset!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-muted-foreground text-lg">
              Your password has been successfully reset.
            </p>
            <Button asChild className="neon-glow w-full" variant="outline">
              <Link href="/auth/signin">Back to Sign In</Link>
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
            <CardTitle className="text-display text-3xl text-center">Reset Password</CardTitle>
            <CardDescription className="text-center text-lg">
              Set a new password for your account
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {error && (
              <Alert variant="destructive" className="neon-glow">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
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

                {/* Password Strength */}
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

              {/* Confirm Password */}
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
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <div className="text-sm text-muted-foreground text-center">
              Remembered your password?{" "}
              <Link href="/auth/signin" className="text-brand-blue hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
