# LeetSuggest

A daily LeetCode plan built from Striver's SDE sheet, balanced across topics and scheduled with
spaced repetition. Accounts and progress are stored in [Neon](https://neon.tech) Postgres, so the
app is ready for multi-user deployment on Vercel.

## Local development

1. Create a Neon project and copy its **pooled** connection string.
2. Create `.env.local` from the example and set `DATABASE_URL`:

   ```bash
   cp .env.example .env.local
   ```

3. Install dependencies and start the app:

   ```bash
   npm install
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000), create an account, and finish onboarding.

The schema is created automatically on the first database request. No manual migration step is
required.

## Deploying to Vercel

1. Push this repository to GitHub and import it in Vercel.
2. Add a Neon database from the Vercel Marketplace, or add a `DATABASE_URL` environment variable
   with your Neon pooled connection string.
3. Deploy. The serverless Neon driver runs over HTTP, so no extra connection-pool configuration is
   needed.

The same `DATABASE_URL` should be present for Production, Preview, and Development environments if
you want preview deployments to share the database.

## Scripts

| Command           | Description                                      |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | Start the development server                     |
| `npm run build`   | Production build                                 |
| `npm run lint`    | Run ESLint                                       |
| `npm run typecheck` | Run TypeScript checks                          |
| `npm test`        | Run unit and PGlite-backed database integration tests |
| `npm run seed`    | Rebuild the local problem seed JSON from source  |

## Stack

- Next.js 16 App Router with Server Actions
- Neon Postgres via `@neondatabase/serverless`
- Email/password auth with scrypt hashing and database-backed sessions
- Tailwind CSS 4
