import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { AppConfigProvider } from "./context/AppConfigContext";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import App from "./App";
import LandingPage from "./pages/landing";
import AdminPage from "./pages/admin";
import NotFound from "./pages/not-found";
import "./index.css";

declare const Office: typeof import("@microsoft/office-js");

function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppConfigProvider>
        <Switch>
          <Route path="/landing" component={LandingPage} />
          <Route path="/admin"   component={AdminPage} />
          <Route path="/"        component={App} />
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </AppConfigProvider>
    </QueryClientProvider>
  );
}

function mountApp() {
  const root = document.getElementById("root")!;
  createRoot(root).render(<Root />);
}

if (typeof Office !== "undefined" && Office.initialize !== undefined) {
  Office.onReady(() => mountApp());
} else {
  mountApp();
}
