# Landscape Friend

A modern scheduling and client management application built with Next.js.

## Tech Stack

- **Framework:** [Next.js 16+](https://nextjs.org/) (App Router)
- **Authentication:** [Clerk](https://clerk.com/)
- **Database:** [Neon DB](https://neon.tech/) (PostgreSQL)
- **Storage:** [Vercel Blob](https://vercel.com/storage/blob)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **UI Components:** [Radix UI](https://www.radix-ui.com/) & [Lucide React](https://lucide.dev/)
- **State Management:** [TanStack Query](https://tanstack.com/query/latest)
- **Form Management:** [TanStack Form](https://tanstack.com/form/latest)
- **Linting & Formatting:** [Biome](https://biomejs.dev/)

## Features

- User Authentication and Authorization via Clerk.
- Client and Job Scheduling management.
- Site map management with image uploads to Vercel Blob.
- Server Actions for data mutations.
- Type-safe database queries with Neon Serverless driver.

## Getting Started

### Prerequisites

- Node.js installed
- A Clerk account and project
- A Neon DB project
- A Vercel project with Blob storage enabled

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd scheduler
   ```

2. Install dependencies:

<details open>
<summary><b>npm</b></summary>

```bash
npm install
```
</details>

<details>
<summary><b>bun</b></summary>

```bash
bun install
```
</details>

<details>
<summary><b>yarn</b></summary>

```bash
yarn install
```
</details>

3. Configure environment variables (see [Environment Configuration Template](#environment-configuration-template)).

4. Run the development server:

<details open>
<summary><b>npm</b></summary>

```bash
npm run dev
```
</details>

<details>
<summary><b>bun</b></summary>

```bash
bun run dev
```
</details>

<details>
<summary><b>yarn</b></summary>

```bash
yarn dev
```
</details>

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Configuration Template

Create your environment configuration file and add the following variables:

```text
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Database (Neon DB)
DATABASE_URL=postgres://user:password@hostname/dbname?sslmode=require

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...

# Google Maps (Optional, for site map features)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

## Scripts

<details open>
<summary><b>npm</b></summary>

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs Biome linter.
- `npm run format`: Formats code with Biome.
</details>

<details>
<summary><b>bun</b></summary>

- `bun run dev`: Starts the development server.
- `bun run build`: Builds the application for production.
- `bun run start`: Starts the production server.
- `bun run lint`: Runs Biome linter.
- `bun run format`: Formats code with Biome.
</details>

<details>
<summary><b>yarn</b></summary>

- `yarn dev`: Starts the development server.
- `yarn build`: Builds the application for production.
- `yarn start`: Starts the production server.
- `yarn lint`: Runs Biome linter.
- `yarn format`: Formats code with Biome.
</details>
