# M&A Portal - Frontend (`internal_portal_ma_front`)

Enterprise Mergers & Acquisitions (M&A) Deal Pipeline portal frontend built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, and **shadcn/ui**. Provides deal sourcing, pipeline management via interactive Kanban boards, due diligence tracking, executive reporting, call tracking, and integrated wire transfer requests.

---

## System Architecture Diagram

```mermaid
flowchart TD
    subgraph BrowserClient [Browser / Desktop User]
        AppRoot[React 19 Root AppShell]
        Router[React Router v7 Navigation]
        Theme[Next Themes Light/Dark]
    end

    subgraph StateAndCache [Client State & Data Orchestration]
        AuthCtx[Auth Context & Role Permissions]
        QueryClient[TanStack React Query v5 Cache]
        SSEHook[useSSE Real-time Event Listener]
        DnDState[@dnd-kit Drag-and-Drop Kanban State]
    end

    subgraph ViewsAndModules [M&A Portal UI Modules]
        PipelineBoard[Pipeline Kanban Board & Deal Cards]
        PipelineList[Virtualized Deal List TanStack Table]
        CallTracker[Call Tracking & Log Import Modal]
        FollowUpCal[Follow-Up Calendar & Action Timeline]
        PurchasingView[Wire Transfers & Procurement Requests]
        MasterData[Master Data Manager: States, Industries]
        RBACPages[Users, Roles & Permission Assignments]
    end

    subgraph UIPrimitives [Design System & UI Components]
        ShadcnUI[shadcn/ui Radix Primitives]
        Charts[Recharts Valuation & Deal Metrics]
        Map[Leaflet Target Geographic Distribution]
        Toasts[Sonner Dynamic Toast Notifications]
    end

    subgraph BackendAPI [FastAPI Backend Service :8000]
        RESTEndpoints[/api/pipeline, /api/purchasing, /api/rbac]
        SSEStream[/api/notifications/stream]
    end

    BrowserClient --> Router
    Router --> ViewsAndModules
    ViewsAndModules --> UIPrimitives

    ViewsAndModules <--> StateAndCache
    AuthCtx -->|Permission Verification| Router
    QueryClient -->|REST Requests Axios/Fetch| RESTEndpoints
    SSEHook -->|EventSource Persistent Stream| SSEStream
    DnDState -->|Drag Deal Stage Mutation| RESTEndpoints
```

---

## Technologies & System Specifications

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Framework & Build** | [React 19](https://react.dev/), [Vite 8](https://vitejs.dev/) | Ultrafast HMR development server with production rollup bundling |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Strict type-safety across domain models and API shapes |
| **Styling & Theme** | [Tailwind CSS v4](https://tailwindcss.com/), `@shadcn/react`, `next-themes` | Modern CSS engine with dark mode tokens and responsive layouts |
| **Interactive Kanban** | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | Drag-and-drop pipeline deal stage advancement with collision detection |
| **Data Fetching & Cache**| [TanStack React Query v5](https://tanstack.com/query) | Stale-while-revalidate caching, optimistic updates, and background refetching |
| **Data Grids & Lists** | [TanStack React Table v8](https://tanstack.com/table), `react-window` | Virtualized data grids handling large deal catalogs with filtering and sorting |
| **Mapping & Geospatial** | [Leaflet](https://leafletjs.com/), `@types/leaflet` | Geographic mapping of acquisition target headquarters and physical assets |
| **Data Visualizations** | [Recharts](https://recharts.org/) | Deal valuation distributions, EBITDA multiples, and pipeline velocity charts |
| **Animations & UI Primitives** | [Framer Motion](https://www.framer.com/motion/), `vaul`, `sonner`, Radix UI | Fluid deal detail drawers, modal transitions, and action toasts |
| **Search & Utilities** | `fuzzysort`, `date-fns`, `clsx`, `tailwind-merge` | Client-side fuzzy search on deal titles and contact records |

---

## Key Modules & Features

1. **Pipeline Kanban View (`/pipeline/kanban`)**:
   - Drag-and-drop stage progression (Prospect, Contacted, NDA Signed, LOI Submitted, Due Diligence, Closed).
   - Deal valuation chips, lead analyst tags, and EBITDA metrics.
2. **Call Tracking & Activity Logs (`/pipeline/calls`)**:
   - Comprehensive communication records with executive leadership of target companies.
   - Batch import modal for processing spreadsheet call logs.
3. **Follow-Up Calendar (`/pipeline/follow-ups`)**:
   - Interactive calendar and list view for upcoming milestones and diligence deliverables.
4. **Master Data Configuration (`/master-data/*`)**:
   - Sourcing parameters, industry sectors, priority weights, state jurisdictions, and templates.
5. **Purchasing & Wire Requests (`/purchasing`)**:
   - Inter-portal integration for wire transfer requests, legal retainer fees, and diligence costs.
6. **Role & Permission Management (`/configurations/*`)**:
   - Granular RBAC and PBAC role-to-user assignments and API/Module policy matrix.

---

## Directory Structure

```text
internal_portal_ma_front/
├── public/                # Static assets, branding logos, icons
├── src/
│   ├── components/        # Layout and shared UI components
│   │   ├── ui/            # shadcn/ui Radix component library
│   │   └── AppShell/      # Navigation sidebar, topbar, and notifications
│   ├── hooks/             # Custom React hooks (useSSE, useAuth, usePipeline)
│   ├── pages/
│   │   ├── Pipeline/      # Kanban, Deal List, Call Tracking, Follow-ups
│   │   ├── MasterData/    # Industry, Priority, State, Template configs
│   │   ├── Purchasing/    # Wire transfers and procurement detail views
│   │   └── Configurations/# Users, Roles, and Permission assignments
│   ├── services/          # API client and domain-specific query wrappers
│   ├── types/             # TypeScript domain definitions and API schemas
│   ├── App.tsx            # Route registration and layout mounting
│   ├── main.tsx           # React root bootstrapping
│   └── index.css          # Tailwind CSS tokens
├── package.json
└── vite.config.ts         # Vite configuration with API reverse proxy (:8000)
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Run Development Server
```bash
npm run dev
```
Access the application at `http://localhost:5173`.

### 4. Build for Production
```bash
npm run build
```

### 5. Lint Codebase
```bash
npm run lint
```
