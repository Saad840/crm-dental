import { Navigate, createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppLayout } from "@/components/AppLayout";

export const Route = createFileRoute("/_app")({
  component: Gate,
  ssr: false,
});

function Gate() {
  const { loading, session } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (!session) {
    return <Navigate to="/auth" replace />;
  }
  return <AppLayout />;
}
