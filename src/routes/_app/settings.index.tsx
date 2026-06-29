import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/settings/")({
  component: () => <Navigate to="/settings/workspace" replace />,
});
