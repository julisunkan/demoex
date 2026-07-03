import { createContext, useContext, ReactNode } from "react";

export interface AppConfig {
  name:    string;
  tagline: string;
  version: string;
}

const DEFAULT_CONFIG: AppConfig = {
  name:    "MailVault Pro",
  tagline: "Backup, restore, and manage your Outlook emails securely.",
  version: "1.0.0",
};

const AppConfigContext = createContext<AppConfig>(DEFAULT_CONFIG);

export function AppConfigProvider({ children }: { children: ReactNode }) {
  return (
    <AppConfigContext.Provider value={DEFAULT_CONFIG}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  return useContext(AppConfigContext);
}
