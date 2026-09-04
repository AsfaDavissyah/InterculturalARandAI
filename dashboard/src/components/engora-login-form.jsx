import { Loader2, LockKeyhole } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
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
  onEmailChange,
  onPasswordChange,
  onSubmit,
  ...props
}) {
  return (
    <div className={cn("flex w-full max-w-md flex-col gap-4", className)} {...props}>
      <div className="flex items-center justify-center gap-3">
        <img src="/engora-logo.svg" alt="Engora" className="size-12 rounded-lg border border-border bg-card" />
        <div>
          <div className="text-xl font-bold leading-none text-foreground">Engora</div>
          <div className="mt-1 text-xs font-medium text-muted-foreground">Research &amp; Management Portal</div>
        </div>
      </div>

      <Card className="overflow-hidden border-border bg-card p-0 shadow-lg shadow-primary/5">
        <CardContent className="p-0">
          <form className="p-6 sm:p-8" onSubmit={onSubmit}>
            <FieldGroup>
              <div className="space-y-1 border-b border-border pb-5">
                <div className="flex items-center gap-2 text-primary">
                  <LockKeyhole className="size-4" />
                  <span className="text-xs font-semibold uppercase">Secure access</span>
                </div>
                <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
                <p className="text-sm text-muted-foreground">Use your administrator or lecturer account.</p>
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

            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <p className="text-center text-xs text-muted-foreground">Engora AR and AI</p>
    </div>
  )
}
