// apps/web/app/projects/[id]/page.tsx
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Copy, ExternalLink, Eye, Loader2, Trash2, AlertCircle } from "lucide-react"
import { useCopyToClipboard } from "usehooks-ts"
import { useToast } from "@/components/ui/use-toast"
import TwoFASetup from "@/components/2FASetup"
import { formatDistanceToNow } from "date-fns"

export const dynamic = "force-dynamic" // Always fresh data

interface Project {
  id: string
  title: string
  prompt: string
  status: string
  error_message?: string
  logs: string[]
  deploy_url?: string
  preview_url?: string
  code_repo_url?: string
  created_at: string
  updated_at: string
  progress?: number
  current_agent?: string
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect("/auth/signin")
  }

  const projectId = params.id

  // Fetch project server-side
  const res = await fetch(`\( {process.env.NEXT_PUBLIC_API_URL}/projects/ \){projectId}`, {
    headers: {
      Cookie: `access_token=${session.accessToken || ""}`,
    },
    cache: "no-store",
  })

  if (!res.ok) {
    if (res.status === 404) notFound()
    throw new Error("Failed to fetch project")
  }

  const project: Project = await res.json()

  // Check ownership (server-side)
  if (project.user_id !== session.user.id) {
    throw new Error("Unauthorized")
  }

  const totpEnabled = session.user.totp_enabled ?? false

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight truncate max-w-[600px]">
            {project.title || "Untitled Project"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Created {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <Badge
            variant={
              project.status === "completed" || project.status === "deployed"
                ? "default"
                : project.status === "failed"
                ? "destructive"
                : project.status === "building"
                ? "secondary"
                : "outline"
            }
            className="text-base px-4 py-1"
          >
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </Badge>

          {project.deploy_url && (
            <Button variant="default" asChild>
              <a href={project.deploy_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Deployed App
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* 2FA Reminder (if not enabled) */}
      {!totpEnabled && (
        <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertTitle>Recommendation: Enable 2FA</AlertTitle>
          <AlertDescription className="mt-2">
            Protect your projects and generated code.{" "}
            <TwoFASetup onSuccess={() => window.location.reload()} />
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Left: Project Info & Prompt */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-medium mb-1">Original Prompt</h3>
              <div className="bg-muted p-4 rounded-md text-sm whitespace-pre-wrap">
                {project.prompt}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-1">Project ID</h3>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                    {project.id}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(project.id)
                      toast({ title: "Copied", description: "Project ID copied" })
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {project.code_repo_url && (
                <div>
                  <h3 className="font-medium mb-1">Code Repository</h3>
                  <Button variant="outline" size="sm" asChild>
                    <a href={project.code_repo_url} target="_blank" rel="noopener noreferrer">
                      View Repo
                    </a>
                  </Button>
                </div>
              )}
            </div>

            {/* Delete Button */}
            <div className="pt-4 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Project
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this project?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. All generated code, deployments, and history will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await fetch(`/api/projects/${project.id}`, { method: "DELETE" })
                        router.push("/dashboard")
                        toast({ title: "Project Deleted" })
                      }}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Right: Real-time Logs & Status */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Generation Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Stage</span>
                <span>{project.current_agent || "Waiting..."}</span>
              </div>
              <Progress value={project.progress || 0} className="h-3" />
            </div>

            <div>
              <h3 className="font-medium mb-2">Live Logs</h3>
              <div className="bg-muted rounded-md p-4 max-h-96 overflow-y-auto font-mono text-sm space-y-2">
                {project.logs?.length ? (
                  project.logs.map((log, i) => (
                    <div key={i} className="py-1 border-b border-border/50 last:border-0">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No logs yet... Generation in progress.
                  </div>
                )}
              </div>
            </div>

            {project.error_message && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Build Error</AlertTitle>
                <AlertDescription>{project.error_message}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-3">
              {project.preview_url && (
                <Button variant="outline" asChild>
                  <a href={project.preview_url} target="_blank" rel="noopener noreferrer">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </a>
                </Button>
              )}
              {project.deploy_url && (
                <Button asChild>
                  <a href={project.deploy_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Deployed App
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}