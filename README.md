# Internal Portal Administration - Frontend

An enterprise internal portal frontend built with React, TypeScript, Vite, Tailwind CSS, and shadcn/ui. This application serves as the administrative interface for managing various accounting and internal workflows, such as banking, chart of accounts, general ledger (GL), and document uploads.

## Tech Stack

- **Framework**: React 19 with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **State Management & Data Fetching**: TanStack React Query
- **Data Grids & Virtualization**: TanStack React Table, TanStack React Virtual
- **Routing**: React Router
- **Charts**: Recharts
- **Excel Processing**: exceljs, xlsx

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd internal_portal_administration_front
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Environment Setup:
   Copy `.env.example` to `.env` and fill in the required environment variables.
   ```bash
   cp .env.example .env
   ```

### Running the App

Start the development server:
```bash
npm run dev
```

### Build and Lint

- **Build for production**:
  ```bash
  npm run build
  ```
- **Lint the codebase**:
  ```bash
  npm run lint
  ```
- **Preview production build**:
  ```bash
  npm run preview
  ```