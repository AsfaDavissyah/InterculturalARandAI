import { BookOpen, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export function LoginForm({
  className,
  email,
  password,
  loading,
  errorMessage,
  apiBaseUrl,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  ...props
}) {
  return (
    <div className={cn("flex w-full max-w-4xl flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-[1.05fr_0.95fr]">
          <form className="p-5 md:p-8" onSubmit={onSubmit}>
            <FieldGroup>
              <div className="flex flex-col gap-3">
                <div className="flex size-11 items-center justify-center rounded-lg border bg-background">
                  <BookOpen className="size-5" />
                </div>
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold">Engora Portal</h1>
                  <p className="text-sm text-muted-foreground">
                    Log in as a lecturer or administrator to manage scenarios and practice data.
                  </p>
                </div>
              </div>

              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => onEmailChange(event.target.value)}
                  placeholder="lecturer@university.edu"
                  autoComplete="email"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </Field>

              {errorMessage && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}

              <Field>
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  {loading ? "Connecting..." : "Log in to Portal"}
                </Button>
              </Field>

              <FieldDescription>
                API Server: <span className="font-medium text-foreground">{apiBaseUrl}</span>
              </FieldDescription>
            </FieldGroup>
          </form>

          <div className="hidden border-l bg-muted/40 p-8 md:flex md:flex-col md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
                Engora AR and AI
              </p>
              <h2 className="max-w-sm text-3xl font-bold leading-tight">
                Research dashboard for scenario-based speaking practice.
              </h2>
            </div>
            <div className="grid gap-3 text-sm text-muted-foreground">
              <div className="rounded-lg border bg-background p-4">
                Manage scenarios, lecturer accounts, practice history, and student observations.
              </div>
              <div className="rounded-lg border bg-background p-4">
                Clean, neat layout consistent with Shadcn design.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
