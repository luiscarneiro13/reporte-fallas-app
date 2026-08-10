# IronFlow Frontend Architecture Analysis

## 1. Navigation Architecture
- **Root Stack**: Manages authentication vs. main application flow.
  - `AuthStack` → `LoginScreen`.
  - `AppStack` → main navigator for authenticated users.
- **App Stack**: Renders the appropriate drawer based on user roles (`OperadorDrawer` or `SupervisorDrawer`).
- **Drawer Implementation**: 
  - Shared `Sidebar` component used as drawer content.
  - Role‑based selection via `useAuthStore`.
- **Deep Linking**:
  - Config defined in `linking` with custom prefixes (`https://tryironflow.com`, `ironflow://`).
  - `DeepLinkHandler` parses URLs and navigates accordingly.
  - Pending route handling for unauthenticated deep links.

## 2. Global State Management
- **Zustand** is used exclusively; no Redux present.
  - `authStore.js`: Holds `token`, `roles`, `pendingRoute`, login/logout actions, and route redirection logic.
  - `configStore.js`: Manages non‑user configuration settings.
- **Store Access**: Hooks (`useAuthStore`) are used throughout components for reading and mutating state.

## 3. API Client & Data Fetching
- **Axios** (`src/api/client.js`): Centralized instance with interceptors for auth token injection.
- **React Query** (`QueryClient` in `App.js`):
  - Cached data with configurable `staleTime` and `gcTime`.
  - Global retry disabled (`retry: 1`).
- **Query Keys**: Imported constants (`QUERY_STALE_TIME`, `QUERY_CACHE_TIME`) centralize timing values.

## 4. Documentation & Diagrams
- Current documentation is fragmented; no single source covers the full architecture.
- A comprehensive diagram (see below) helps visualize navigation and state flow.

## 5. Scaling Recommendations
| Area | Recommendation |
|------|----------------|
| **Navigation** | • Extract role‑specific navigation logic into separate navigator modules to reduce duplication.<br>• Introduce a typed navigation schema (e.g., using `zod` or TypeScript interfaces) to enforce screen definitions and improve IDE support. |
| **State Management** | • Consider splitting large stores (e.g., `authStore`) into feature‑specific slices if the app grows.<br>• Add middleware for side‑effects (e.g., logging, analytics) to keep reducers pure. |
| **API Client** | • Centralize endpoint definitions and versioning in a dedicated `src/api/constants.ts` file.<br>• Enable automatic request/response logging in non‑production builds for easier debugging. |
| **Performance** | • Optimize React Query stale times per endpoint to reduce unnecessary refetches.<br>• Implement skeleton UI components for loading states to improve perceived performance. |
| **Testing** | • Add unit tests for navigation helpers (`DeepLinkHandler`) and store actions.<br>• Enforce coverage thresholds in CI to prevent regressions. |
| **Documentation** | • Generate an up‑to‑date architecture diagram (e.g., using Mermaid) and store it in `docs/architecture/`.<br>• Maintain a `README.md` section that explains the navigation flow, state stores, and API client setup. |
| **Code Quality** | • Adopt lint rules that enforce consistent import ordering and naming conventions.<br>• Use TypeScript strict mode across the project to catch type‑related bugs early. |

## 6. Suggested File Structure for Documentation
```
/docs
   /architecture
      - architecture.md          ← This file
      - diagrams/
         - navigation.mmd
         - state-flow.mmd
```

## 7. Next Steps
1. **Create missing diagrams** (navigation, state flow) and place them in `docs/architecture/diagrams/`.
2. **Update README** with a concise architecture overview and links to the diagrams.
3. **Refactor navigation** to extract duplicated drawer logic into reusable components.
4. **Review and possibly split large stores** if the codebase expands further.
5. **Add unit tests** for critical navigation and store functionalities.

*This analysis is intended to serve as a living document; keep it synchronized with code changes.*