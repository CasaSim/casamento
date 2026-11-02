# Security review

Changes cover API input validation (including NoSQL operator rejection), owner-scoped expense access, shared MongoDB rate limits, password recovery, session revocation, security headers and local database exposure.

## Configuration

- Set a random NEXTAUTH_SECRET (at least 32 random bytes), MONGODB_URI and the canonical NEXTAUTH_URL. Production must use HTTPS.
- Password recovery sends a single-use link through the Resend HTTPS API. Configure RESEND_API_KEY, RESEND_FROM_EMAIL and the canonical NEXTAUTH_URL; the production URL must use HTTPS. Links expire after one hour, use 32 cryptographically random bytes and are stored only as SHA-256 hashes. Reset checks expiration and consumes the token atomically while changing the password and revoking sessions. Direct reset by email alone is no longer accepted. Requests are limited globally and by email/token. Unknown emails and rejected deliveries return the same generic response; provider failures are logged without credentials, recipients or tokens. A failed delivery removes only its own token, preserving newer concurrent requests. The Resend test sender only permits delivery to the account owner's email; verify an owned domain for real users.
- New passwords require 12 characters and at most 72 UTF-8 bytes (bcrypt limit). Existing shorter passwords can still log in.
- The authentication endpoint continues to support credentials, as before; APIs now use the same configuration. Changing a password revokes existing JWT sessions on their next validation.
- MongoDB must allow creation of the SecurityLimit collection/index. Counters are shared across application instances and use 15-minute windows; per-account and global limits also apply to unknown accounts. Tune the global limits for expected traffic. At the proxy, configure request size limits and IP-based throttling using only trusted client IP metadata. The application intentionally does not trust arbitrary X-Forwarded-For values.
- Configure MONGO_ROOT_USER, MONGO_ROOT_PASSWORD, MONGO_ADMIN_URL (URL-encoded credentials), MONGO_ADMIN_USER and MONGO_ADMIN_PASSWORD for Docker. Ports bind to loopback. The Mongo Express admin UI starts with `docker compose up -d` on http://localhost:8081 and requires the separate MONGO_ADMIN_USER/MONGO_ADMIN_PASSWORD credentials. Changing initialization credentials does not rotate credentials inside existing volumes; rotate those in MongoDB separately.

## Validation

Run `npm run test:security`, `npm run typecheck`, `npm run lint`, `npm run build` and `npm audit`. Regression tests cover malicious inputs, cross-origin writes, payload limits, ownership filters, token-based password recovery and Resend requests/failures. These tests mock database and delivery operations; exercise real Resend delivery, MongoDB indexes, concurrent rate limits and session revocation against a staging environment before deployment.

This is a source review, not a penetration test or a guarantee of full OWASP compliance. The CSP establishes framing/object/base/form restrictions; full script restrictions require nonce integration with Next.js. Infrastructure TLS, database privileges, secret rotation, monitoring and backup policies require deployment-specific verification.

## Dependency audit follow-up

The compatible dependency updates and overrides eliminate the high and critical findings observed in this review. npm still reports moderate findings originating in minimatch (<11.0.1), inherited through the lint tooling and ExcelJS archive dependencies. Do not force a global minimatch major override: older consumers depend on its callable CommonJS API. Resolving these findings requires upstream-compatible releases or replacing the affected tooling/archive path. The application exports generated spreadsheets; it does not accept uploaded archives for extraction.

The Docker configuration is for local development. The app runs as the unprivileged node user; MongoDB uses a separate readWrite application account initialized only for a fresh volume. Local `.env` credentials were generated with a cryptographic random number generator and are excluded from Git and Docker build context.

## Observed verification (2026-11-01)

- Production build completed successfully with Next.js 15.5.28.
- Type checking passed; lint passed with four existing warnings.
- Four security regression tests passed both on the host and inside Docker.
- The Docker application returned HTTP 200 for the homepage.
- `node tests/integration.cjs` passed against the local Docker MongoDB: signup/login, owner isolation for GET/PUT/DELETE, NoSQL input rejection, cross-origin rejection, password reset, token reuse rejection and revocation of the previous session. Temporary test users and their expenses were removed.
- The dependency audit reported 21 moderate findings and no high or critical findings. These are still open as described above.
- The former Mailgun flow was not exercised and has since been replaced with Resend delivery.

Before upgrading an existing database, normalize legacy email addresses to lowercase and resolve any resulting collisions; new registrations and credential logins use canonical lowercase emails.

## Public dashboard read access

At the owner's request, `GET /api/dashboards/[id]` deliberately allows anonymous read access by dashboard ID. The public page `/Dashboard/[id]` also works when logged into a different account and provides the existing Excel export. Anyone who knows an existing dashboard ObjectId can read its visible expense fields; this applies independently of clicking the share button. ObjectIds are not authentication secrets. These links have no expiry or revocation mechanism.

The endpoint selects visible expense fields only and filters by the dashboard owner. User/account fields and internal version fields are excluded. It does not populate arbitrary expense references, so stale foreign references cannot disclose another owner's expenses. The public endpoint defines only GET (and framework-provided HEAD/OPTIONS); mutation methods are rejected. Existing expense creation/update/delete APIs still require the owner's authenticated session. `POST /api/dashboards/share` requires authentication and same-origin JSON and always returns the current owner's dashboard ID.

Public pages/API responses request no indexing; API responses use no-store and links use the existing no-referrer policy. These headers do not make a shared link private.
