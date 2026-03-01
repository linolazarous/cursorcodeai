"use client";

import { useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

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
  email: z.string().email("Please enter a valid email address"),
});

type FormData = z.infer<typeof formSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
    mode: "onChange",
  });

  const { register, handleSubmit, formState: { errors } } = form;

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // consistency with all other auth calls
          body: JSON.stringify({ email: data.email }),
        }
      );

      // Backend always returns 200 (even for non-existent emails) → always success
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to send reset link");
      }

      setSubmittedEmail(data.email);
      setSuccess(true);

      toast.success("Reset Link Sent", {
        description: `Check your inbox (and spam) for the password reset link.`,
        duration: 6000,
      });
    } catch (err: any) {
      const message = err.message || "Something went wrong. Please try again.";
      setError(message);

      toast.error("Failed to Send Reset Link", {
        description: message,
        duration: 5000,
      });
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
            <CardTitle className="text-display text-4xl mt-4">Reset Link Sent</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-muted-foreground text-lg">
              We’ve sent a password reset link to{" "}
              <strong className="text-foreground">{submittedEmail}</strong>
            </p>
            <p className="text-sm text-muted-foreground">
              The link is valid for 1 hour. Please check your inbox and spam folder.
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
            <CardTitle className="text-display text-3xl text-center">Forgot Password?</CardTitle>
            <CardDescription className="text-center text-lg">
              No worries — we’ll send you a reset link
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8">
            {/* Error */}
            {error && (
              <Alert variant="destructive" className="neon-glow">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

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
                  autoFocus
                  className="neon-glow"
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>

              <Button type="submit" className="w-full h-12 neon-glow text-lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Sending Reset Link...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <div className="text-sm text-muted-foreground text-center">
              Remember your password?{" "}
              <Link href="/auth/signin" className="text-brand-blue hover:underline font-medium">
                Sign in
              </Link>
            </div>

            <Button variant="ghost" size="sm" asChild className="w-full neon-glow">
              <Link href="/auth/signin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
