// apps/web/components/2FASetup.tsx
"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Copy, Loader2, CheckCircle2, XCircle, ShieldCheck } from "lucide-react"
import { useCopyToClipboard } from "usehooks-ts"
import { useSession } from "next-auth/react"

const formSchema = z.object({
  code: z.string().length(6, "Must be exactly 6 digits").regex(/^\d{6}$/, "Must be numeric"),
})

type FormData = z.infer<typeof formSchema>

type TwoFASetupProps = {
  onSuccess?: () => void
}

export default function TwoFASetup({ onSuccess }: TwoFASetupProps) {
  const { data: session, update } = useSession()
  const { toast } = useToast()
  const [copiedText, copyToClipboard] = useCopyToClipboard()

  const [isEnabled, setIsEnabled] = useState(session?.user?.totp_enabled || false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  })

  // Fetch 2FA setup data when enabling
  const enable2FA = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || "Failed to enable 2FA")
      }

      const data = await res.json()
      setQrCode(data.qr_code_base64)
      setSecret(data.secret)
      setBackupCodes(data.backup_codes)
      setShowBackupCodes(true)
      toast({
        title: "2FA Setup Ready",
        description: "Scan the QR code or enter the secret manually.",
      })
    } catch (err: any) {
      setError(err.message)
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Verify code to activate 2FA
  const onVerify = async (data: FormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: data.code }),
        credentials: "include",
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || "Invalid code")
      }

      // Update session (refresh user data)
      await update({ totp_enabled: true })

      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication is now active on your account.",
      })

      setIsEnabled(true)
      setQrCode(null)
      setSecret(null)
      setBackupCodes([])
      setShowBackupCodes(false)
      reset()

      if (onSuccess) onSuccess()
    } catch (err: any) {
      setError(err.message)
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: err.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Disable 2FA (with confirmation)
  const disable2FA = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const code = prompt("Enter your current 2FA code or a backup code to disable:")
      if (!code) return

      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "include",
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.detail || "Invalid code")
      }

      await update({ totp_enabled: false })

      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been turned off.",
      })

      setIsEnabled(false)
    } catch (err: any) {
      setError(err.message)
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message,
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Copy helper with toast
  const copySecret = () => {
    if (secret) {
      copyToClipboard(secret)
      toast({ title: "Secret Copied", description: "Secret key copied to clipboard" })
    }
  }

  const copyBackupCodes = () => {
    if (backupCodes.length) {
      copyToClipboard(backupCodes.join("\n"))
      toast({ title: "Backup Codes Copied", description: "All backup codes copied" })
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          Two-Factor Authentication (2FA)
        </CardTitle>
        <CardDescription>
          Add an extra layer of security to your account using an authenticator app.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Status</p>
            <p className="text-sm text-muted-foreground">
              {isEnabled ? (
                <span className="text-green-600 font-semibold">Enabled</span>
              ) : (
                <span className="text-amber-600 font-semibold">Disabled (recommended)</span>
              )}
            </p>
          </div>

          {isEnabled ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isLoading}>
                  Disable 2FA
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disable 2FA?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reduce your account security. You will need to enter a 2FA code or backup code to disable.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={disable2FA} disabled={isLoading}>
                    {isLoading ? "Disabling..." : "Disable"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button onClick={enable2FA} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enabling...
                </>
              ) : (
                "Enable 2FA"
              )}
            </Button>
          )}
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Setup Flow (when enabling) */}
        {!isEnabled && qrCode && (
          <div className="space-y-6 border-t pt-6">
            <div className="grid md:grid-cols-2 gap-8">
              {/* QR Code */}
              <div className="flex flex-col items-center space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              </div>

              {/* Manual Entry */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="secret">Or enter this key manually</Label>
                  <div className="flex mt-1">
                    <Input id="secret" value={secret || ""} readOnly className="font-mono" />
                    <Button variant="outline" size="icon" onClick={copySecret} className="ml-2">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Alert>
                  <AlertTitle>Save your backup codes!</AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>
                      These one-time codes can be used if you lose access to your authenticator app.
                    </p>
                    {showBackupCodes ? (
                      <div className="font-mono text-sm bg-muted p-3 rounded break-all">
                        {backupCodes.map((code, i) => (
                          <div key={i} className="py-1">
                            {code}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Button variant="secondary" onClick={() => setShowBackupCodes(true)}>
                        Reveal Backup Codes
                      </Button>
                    )}
                    {showBackupCodes && (
                      <Button variant="outline" size="sm" onClick={copyBackupCodes} className="mt-2">
                        Copy All Backup Codes
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            </div>

            {/* Verification Form */}
            <form onSubmit={handleSubmit(onVerify)} className="space-y-4 border-t pt-6">
              <div>
                <Label htmlFor="code">Verify by entering a code from your authenticator app</Label>
                <Input
                  id="code"
                  placeholder="123456"
                  maxLength={6}
                  {...register("code")}
                  className="mt-1 font-mono text-center text-lg tracking-widest"
                />
                {errors.code && <p className="text-sm text-destructive mt-1">{errors.code.message}</p>}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Enable 2FA"
                )}
              </Button>
            </form>
          </div>
        )}

        {/* 2FA is enabled - show status */}
        {isEnabled && !qrCode && (
          <Alert>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertTitle>2FA is Active</AlertTitle>
            <AlertDescription className="mt-2">
              Your account is protected with two-factor authentication.
              <br />
              <Button variant="link" className="px-0" onClick={disable2FA}>
                Disable 2FA
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}