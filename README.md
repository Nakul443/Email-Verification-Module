## Email Verification Module

This project provides an HTTP API that verifies an email address using:

- **Syntax validation** (regex + basic length/format checks)
- **“Did you mean?” typo detection** for common domains (Levenshtein distance)
- **DNS MX lookup** for the domain
- **SMTP mailbox probe** against the highest-priority MX host

## Project layout

- `backend/`: Express + TypeScript API
  - `backend/src/routes/emailRoutes.ts`: API routes
  - `backend/src/controllers/emailController.ts`: orchestration + response mapping
  - `backend/src/utils/validator.ts`: syntax checks + domain extraction
  - `backend/src/services/typoService.ts`: typo suggestions
  - `backend/src/services/smtpService.ts`: DNS MX lookup + SMTP probe

## API

### `POST /api/verify`

**Request body**

```json
{ "email": "test@example.com" }
```

**Response fields (overview)**

- **email**: input email (or empty string)
- **result**: `valid` | `invalid` | `unknown`
- **resultcode**:
  - `1` = valid
  - `6` = invalid (hard failure)
  - `3` = unknown (soft failure / cannot be determined reliably)
- **subresult** (examples):
  - `invalid_syntax`
  - `typo_detected`
  - `no_mx_records`
  - `mailbox_exists`
  - `mailbox_does_not_exist` (SMTP `550`)
  - `greylisted` (SMTP `450`/`451`)
  - `smtp_rejected`
  - `connection_error`
  - `internal_error`
- **domain**: extracted domain from the email
- **mxRecords**: MX hosts (sorted by priority, lowest first)
- **didyoumean**: suggested corrected email or `null`
- **executiontime**: total time in seconds (float with 2 decimals)
- **error**: error message or `null`
- **timestamp**: ISO timestamp of the response

### `GET /health`

Returns a simple JSON health response.

## Configuration (environment variables)

At the repository root, there is a `.env` file. Common settings used by the backend:

- **PORT**: HTTP port for the backend (default: `5000`)
- **SENDER_EMAIL**: envelope sender used for the SMTP probe (default: `verify@example.com`)

## Running locally

### Backend

```bash
cd backend
npm install
node --loader ts-node/esm src/app.ts
```

Then call the API:

```bash
curl -sS -X POST "http://localhost:5000/api/verify" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## Testing

There is a Jest test suite in `backend/tests/emails.test.ts`. It mocks `smtpService` to avoid real DNS/SMTP traffic during tests.

## Important limitations (SMTP mailbox probing)

Mailbox probing over SMTP is inherently unreliable and can fail for reasons unrelated to the mailbox:

- **Port 25 access**: many networks/cloud providers block outbound TCP/25.
- **Catch-all domains**: some domains accept all recipients, so “exists” can be a false positive.
- **Greylisting / rate limits**: servers may temporarily reject (`450/451`) or throttle.
- **Anti-abuse protections**: some servers always return generic responses to prevent enumeration.
- **TLS behavior**: this code sets `tls.rejectUnauthorized: false` to be permissive; this is useful for broad compatibility but weakens certificate validation.

Treat `result="unknown"` as “could not determine safely,” not as invalid.
