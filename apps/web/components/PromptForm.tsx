// apps/web/components/PromptForm.tsx
"use client"

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Copy, Send, AlertCircle, CheckCircle2 } from "lucide-react"
import { useCopyToClipboard } from "usehooks-ts"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"

const formSchema = z.object({
  prompt: z.string().min(10, "Prompt must be at least 10 characters").max(2000, "Prompt too long"),
})

type FormData = z.infer<typeof formSchema>

type AgentStatus = {
  agent: string
  message: string
  progress: number // 0-100
}

export default function PromptForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [statusHistory, setStatusHistory] = useState<AgentStatus[]>([])
  const [isPolling, setIsPolling] = useState(false)
  const [copiedText, copyToClipboard] = useCopyToClipboard()
  const { toast } = useToast()
  const router = useRouter()
  const logsEndRef = useRef<HTMLDivElement>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { prompt: "" },
    mode: "onChange",
  })

  const promptValue = watch("prompt")

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [statusHistory])

  // Poll project status (once created)
  useEffect(() => {
    if (!projectId || !isPolling) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          credentials: "include",
        })

        if (!res.ok) throw new Error("Failed to fetch status")

        const data = await res.json()

        // Update status history
        setStatusHistory(prev => {
          const last = prev[prev.length - 1]
          if (last?.agent === data.current_agent) return prev

          return [
            ...prev,
            {
              agent: data.current_agent || "Unknown",
              message: data.status_message || "Processing...",
              progress: data.progress || 0,
            },
          ]
        })

        if (data.status === "completed" || data.status === "failed") {
          setIsPolling(false)
          toast({
            title: data.status === "completed" ? "Project Ready!" : "Build Failed",
            description: data.status === "completed"
              ? `Your project is complete. View it now.`
              : data.error_message || "An error occurred during generation.",
            variant: data.status === "completed" ? "default" : "destructive",
          })
        }
      } catch (err) {
        console.error("Status polling error:", err)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(interval)
  }, [projectId, isPolling, toast])

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setError(null)
    setStatusHistory([])
    setProjectId(null)
    setIsPolling(false)

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.detail || "Failed to start project")
      }

      const result = await res.json()
      setProjectId(result.project_id)

      // Start polling for real-time updates
      setIsPolling(true)

      toast({
        title: "Project Queued",
        description: `Generation started (ID: ${result.project_id}). We'll update you here.`,
      })

      reset()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyPrompt = () => {
    copyToClipboard(promptValue)
    toast({ title: "Prompt Copied", description: "Ready to reuse or edit" })
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="relative">
          <Textarea
            placeholder="Describe your app in detail... (e.g. 'Build a task manager SaaS with user auth, real-time updates, Stripe payments, and dark mode')"
            className="min-h-[140px] resize-y pr-12"
            {...register("prompt")}
            disabled={isSubmitting}
            aria-label="Project prompt"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 bottom-2"
            onClick={copyPrompt}
            disabled={!promptValue.trim()}
          >
            <Copy className="h-4 w-4" />
          </Button>
          {errors.prompt && (
            <p className="text-sm text-destructive mt-1">{errors.prompt.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !isValid}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting Generation...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Generate App
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Real-time Feedback Area */}
      {(isSubmitting || projectId) && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}
              Project Generation Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projectId && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Project ID:</span>
                <code className="bg-muted px-2 py-1 rounded text-xs">{projectId}</code>
              </div>
            )}

            {/* Progress & Logs */}
            <div className="space-y-3">
              {statusHistory.length > 0 ? (
                <>
                  <Progress value={statusHistory[statusHistory.length - 1]?.progress || 0} className="h-2" />
                  <div className="max-h-60 overflow-y-auto border rounded-md p-3 bg-muted/40 text-sm font-mono">
                    {statusHistory.map((step, i) => (
                      <div key={i} className="py-1">
                        <span className="font-semibold">{step.agent.toUpperCase()}:</span>{" "}
                        {step.message}
                        {step.progress > 0 && ` (${step.progress}%)`}
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground py-6">
                  Waiting for agents to start...
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              {projectId && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`/projects/${projectId}`}>View Project Details</a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsPolling(false)
                  setStatusHistory([])
                  setProjectId(null)
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prompt Examples (collapsible) */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Prompt Examples</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {[
            "Build a task manager SaaS with user authentication, real-time updates via WebSockets, and Stripe subscriptions",
            "Create a personal finance tracker with React frontend, FastAPI backend, PostgreSQL, and chart visualizations",
            "Develop a multi-tenant blog platform with admin dashboard, SEO optimization, and Markdown editor",
          ].map((example, i) => (
            <Button
              key={i}
              variant="outline"
              className="justify-start h-auto py-3 px-4 text-left"
              onClick={() => {
                reset({ prompt: example })
              }}
            >
              {example}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}