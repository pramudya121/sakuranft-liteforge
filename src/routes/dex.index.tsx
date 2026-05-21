import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/dex/")({
  component: () => <Navigate to="/dex/swap" replace />,
});
