// apps/web/app/dashboard/page.tsx
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { CreditMeter } from "@/components/CreditMeter"
import PromptForm from "@/components/PromptForm"
import ProjectList from "@/components/ProjectList"
import TwoFASetup from "@/components/2FASetup"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ShieldCheck, AlertCircle, PlusCircle } from "lucide-react"
import { Suspense } from "react"

export const dynamic = "force-dynamic" // Server-side rendering every request

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/auth/signin")
  }

  const user = session.user
  const credits = user.credits ?? 10
  const plan = user.plan ?? "starter"
  const totpEnabled = user.totp_enabled ?? false

  // Server-side initial projects fetch
  const projectsRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
    headers: {
      Cookie: `access_token=${session.accessToken || ""}`,
    },
    cache: "no-store",
  })

  const initialProjects = projectsRes.ok ? await projectsRes.json() : []

  return (
    <div className="container mx-auto space-y-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">CursorCode AI Dashboard</h1>
        <div className="flex items-center gap-4 flex-wrap">
          <CreditMeter credits={credits} plan={plan} />
          <Button variant="outline" asChild>
            <a href="/billing">Upgrade Plan</a>
          </Button>
        </div>
      </div>

      {/* 2FA Status & Setup */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totpEnabled ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span>2FA is enabled — your account is more secure</span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">Disable 2FA</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disable 2FA?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reduce your account security. You'll need to confirm with a current 2FA code or backup code.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <TwoFASetup onSuccess={() => window.location.reload()} /> {/* Re-render on disable */}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert variant="default">
                <AlertCircle className="h-5 w-5" />
                <AlertTitle>Recommendation: Enable 2FA</AlertTitle>
                <AlertDescription>
                  Add an extra layer of security to protect your account and generated projects.
                </AlertDescription>
              </Alert>
              <TwoFASetup onSuccess={() => window.location.reload()} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create New</TabsTrigger>
          <TabsTrigger value="projects">Your Projects</TabsTrigger>
        </TabsList>

        {/* Create Tab */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Build Something New</CardTitle>
              <CardDescription>
                Describe your app in plain English — CursorCode AI will generate, test, and deploy it automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PromptForm />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects">
          <Suspense fallback={<div className="text-center py-12">Loading projects...</div>}>
            <ProjectList initialProjects={initialProjects} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}