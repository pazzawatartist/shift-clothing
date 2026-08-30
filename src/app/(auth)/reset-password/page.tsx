import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">Must be at least 8 characters.</p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
