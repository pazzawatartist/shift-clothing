import Link from "next/link";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="text-sm text-muted-foreground">Enter your credentials to access your dashboard.</p>
      </div>
      <LoginForm redirectTo={redirectTo} />
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/forgot-password" className="underline underline-offset-4 hover:text-foreground">
          Forgot your password?
        </Link>
      </p>
    </div>
  );
}
