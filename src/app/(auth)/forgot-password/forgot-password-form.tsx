"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { forgotPasswordAction, type ForgotPasswordState } from "../actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Sending..." : "Send reset link"}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ForgotPasswordState, FormData>(forgotPasswordAction, undefined);

  if (state && "success" in state) {
    return (
      <p className="rounded-md bg-success/10 p-3 text-sm text-success">
        If an account exists for that email, a reset link is on its way.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@shift.com" required />
      </div>
      {state?.error && <p className="text-sm font-medium text-destructive">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
