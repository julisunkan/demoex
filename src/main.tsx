import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { AppConfigProvider } from "./context/AppConfigContext";
import { queryClient } from "./lib/queryClient";
import { initOutlook, startOutlookRetry } from "./lib/outlookContext";
import { Toaster } from "@/components/ui/toaster";
import App from "./App";
import LandingPage      from "./pages/landing";
import AdminPage        from "./pages/admin";
import DeploymentGuide  from "./pages/DeploymentGuide";
import EulaPage         from "./pages/eula";
import PrivacyPage      from "./pages/privacy";
import SupportPage      from "./pages/support";
import NotFound         from "./pages/not-found";
import "./index.css";

declare const Office: typeof import("@microsoft/office-js");

function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppConfigProvider>
        <Switch>
          <Route path="/landing"  component={LandingPage} />
          <Route path="/admin"    component={AdminPage} />
          <Route path="/deploy"   component={DeploymentGuide} />
          <Route path="/eula"     component={EulaPage} />
          <Route path="/privacy"  component={PrivacyPage} />
          <Route path="/support"  component={SupportPage} />
          <Route path="/"         component={App} />
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

async function bootstrap() {
  // Attempt token acquisition before mount (best-effort, short timeout).
  // If it fails we still mount and the retry loop below keeps trying.
  await Promise.race([
    initOutlook(),
    new Promise(r => setTimeout(r, 2_000)), // don't block mount for > 2 s
  ]);
  mountApp();

  // After the React tree is live, keep retrying until we have a token.
  // Once connected, invalidate all cached queries so they re-fetch with
  // the correct Outlook auth headers.
  startOutlookRetry(() => {
    queryClient.invalidateQueries();
  });
}

if (typeof Office !== "undefined" && Office.initialize !== undefined) {
  Office.onReady(() => bootstrap());
} else {
  bootstrap();
}
