import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PagePending } from "./components/market/PagePending";

export const getRouter = () => {
  // One client per request: a module-level QueryClient leaks cached data between SSR requests.
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Show a placeholder at once on navigation so the old page never lingers under the new URL.
    defaultPreload: "intent",
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
    defaultPendingComponent: PagePending,
    // Lets Query own freshness; set caching defaults on the QueryClient, not the router.
    defaultPreloadStaleTime: 0,
  });

  return router;
};
