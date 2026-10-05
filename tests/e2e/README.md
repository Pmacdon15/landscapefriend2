# End-to-end tests

Playwright drives the golden path in a real browser: sign in, add a client,
set a schedule, see it on the cut list, complete the job with a photo, and
create an invoice.

They run against a **Clerk development instance** and a **throwaway
database** (a Neon branch works well), never production. Each run creates
a new client named `E2E Client <id>`, so reset the branch now and then.

## Setup

1. In the Clerk dev instance, create a user with a password, and an
   organization where that user is an **admin**.
2. Set these environment variables (in `.env.local`, or as GitHub Actions
   secrets for CI):

   | Variable | What |
   | --- | --- |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk dev instance keys |
   | `DATABASE_URL` | Throwaway database with `src/db/schema.sql` loaded |
   | `E2E_CLERK_USER_EMAIL`, `E2E_CLERK_USER_PASSWORD` | The test user |
   | `E2E_CLERK_ORG_ID` | The test organization (`org_...`) |
   | `BLOB_READ_WRITE_TOKEN` | Optional; without it the job still completes, just without the photo |
   | `E2E_BASE_URL` | Optional; test a running deployment instead of starting `bun run dev` |

3. Install the browser once: `bunx playwright install chromium`

## Run

```sh
bun run test:e2e          # headless
bun run test:e2e --ui     # watch it
```

Sending the invoice email is left out on purpose: it would send real mail
through SES.
