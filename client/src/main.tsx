import { trpc } from "@/lib/trpc";
import { SCHEDULE_PROFILE_HEADER, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { appPath } from "./lib/appRoutes";
import {
  ACTIVE_SCHEDULE_PROFILE_KEY,
  SCHEDULE_PROFILE_CHANGE_EVENT,
  getStoredScheduleProfileId,
  syncStoredScheduleProfileIdFromStorage,
} from "./lib/scheduleProfile";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;
  
  // LOGGED OUT: No longer automatically redirecting to appPath() to avoid infinite reload loops.
  // The DashboardLayout now handles unauthenticated state by rendering the login form.
  console.log("[Auth] Unauthorized access detected. Handling via UI component state.");
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

if (typeof window !== "undefined") {
  const resetProfileAwareCache = () => {
    void queryClient.invalidateQueries();
  };

  window.addEventListener(SCHEDULE_PROFILE_CHANGE_EVENT, resetProfileAwareCache);
  window.addEventListener("storage", event => {
    if (event.key === ACTIVE_SCHEDULE_PROFILE_KEY) {
      syncStoredScheduleProfileIdFromStorage();
      resetProfileAwareCache();
    }
  });
}

const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        const headers = new Headers(init?.headers);
        const scheduleProfileId = getStoredScheduleProfileId();

        if (scheduleProfileId) {
          headers.set(SCHEDULE_PROFILE_HEADER, String(scheduleProfileId));
        } else {
          headers.delete(SCHEDULE_PROFILE_HEADER);
        }

        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
          headers,
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
