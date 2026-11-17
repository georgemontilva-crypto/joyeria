import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, httpLink, splitLink } from "@trpc/client";
import "@fontsource-variable/bodoni-moda/opsz.css";
import "@fontsource-variable/jost";
import "./styles/site.css";
import { trpc } from "./trpc";
import { I18nProvider } from "./lib/i18n";
import { BagProvider } from "./lib/bag";
import { App } from "./App";

function Root() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false } } }),
  );
  const [client] = useState(() =>
    trpc.createClient({
      links: [
        // Mutations go one per request so the server can rate-limit them by name.
        splitLink({
          condition: (op) => op.type === "mutation",
          true: httpLink({ url: "/api/trpc" }),
          false: httpBatchLink({ url: "/api/trpc" }),
        }),
      ],
    }),
  );
  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <BagProvider>
            <App />
          </BagProvider>
        </I18nProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
