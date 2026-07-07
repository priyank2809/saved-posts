import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { I18nProvider } from "./i18n/I18nProvider";
import { CurrentUserProvider } from "./context/CurrentUserContext";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (error?.status === 401 || error?.status === 403 || error?.status === 404) return false;
        return failureCount < 2;
      },
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <CurrentUserProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </CurrentUserProvider>
    </I18nProvider>
  </StrictMode>
);
