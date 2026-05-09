import { Navigate } from "react-router-dom";

// Settings/billing currently redirects to the rich profile billing tab.
export default function BillingSettings() {
  return <Navigate to="/profile?tab=billing" replace />;
}