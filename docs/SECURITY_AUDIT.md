# Rescope Surveys Security Audit

**Audit date:** 2026-09-07  
**Scope:** React SPA, Fastify API, Prisma/PostgreSQL data layer, authentication and authorization, survey/response input handling, Docker Compose, nginx, Caddy, deployment scripts, and CI workflows.  
**Method:** Static source and configuration review plus `npm audit --omit=dev` against both lockfiles. This was not a penetration test, dynamic application scan, cloud configuration review, or legal/compliance assessment.

### Implementation status — 2026-09-07

- **Phase 0 repository baseline: completed.** Existing config, frontend, auth-cookie, RBAC, security, branding, build, Prisma schema, and Compose checks were executed locally. The working tree introduces no database migration or UI change.
- **Phase 0 production preflight: operator action required.** Before deployment, create and copy a fresh production backup off-host, record the currently deployed image/tag, and run the production smoke checklist after release. No production database or service was modified by this implementation session.
- **Phase 1 dependency/config hardening: implemented and locally verified.** `@fastify/jwt` is upgraded from 9.1.0 to 10.2.2, Fastify is upgraded to 5.12.3, JWT signing and verification are restricted to HS256, obsolete `JWT_EXPIRES_IN` configuration is removed, production PostgreSQL credentials are required by the Compose override, and strict production mode now rejects unsafe seed, migration, rate-limit, cookie, and Bearer-auth flags.
- **Verification:** frontend production audit reports zero vulnerabilities; the critical JWT and Fastify advisories are removed; production build and base/production Compose validation pass; all executed auth-cookie, API security, RBAC, config, frontend, permission, and branding tests pass.
- **Known residual tooling advisory:** Prisma 6.19.3 is the newest release on the current v6 line, but its Prisma CLI/config dependency still reports a high-severity recursive-merge denial-of-service advisory. The affected package is migration/build tooling rather than the request-handling ORM path. A Prisma 7 migration is intentionally deferred because it is a breaking change and must be tested as its own release.

## 1. Executive Summary

Rescope Surveys has a solid application-security baseline for an early Survey SaaS product. The code consistently applies organization and survey-owner scoping, verifies JWTs server-side, reloads authorization state from PostgreSQL, uses short-lived HttpOnly access cookies with rotating hashed refresh tokens, sanitizes rich text on both write and render, parameterizes database access through Prisma, limits request body size, constrains public routes, and provides a production topology that keeps PostgreSQL and the application port off the public network.

The platform is **not yet enterprise-ready**. The original audit identified critical advisories in the resolved `@fastify/jwt` / `fast-jwt` chain. Phase 1 remediation has upgraded the affected JWT and Fastify packages, restricted tokens to HS256, and passed the existing authentication, RBAC, and security regression suites. The remediated code must still pass the production backup, deployment, and smoke-test preflight before it is considered live.

The next highest risks are architectural:

- Cookie authentication relies on `SameSite=Lax` without explicit CSRF tokens or server-side Origin enforcement.
- The intended iframe origin policy is returned on the public survey JSON API response, not on the framed HTML document. `frame-ancestors` on a fetch response does not protect the SPA document, so the configured embed allowlist does not currently enforce framing.
- Public response validation is only structural and partial. It does not fully validate answer type, size, option membership, visibility, termination state, timestamps, fingerprints, or all completion rules against the survey definition.
- Rate limiting is per-process, in-memory, and IP-only. It is not effective as a global control across replicas or distributed attackers.
- Optional fingerprinting sends respondent IP and geolocation data to third-party services and collects a canvas fingerprint without an in-product consent or processor-control workflow.
- Security audit logging, MFA/SSO, mature account recovery, data retention/deletion controls, encrypted off-host backups, and production monitoring are absent.

Phase 1 corrects the README and Compose drift around HttpOnly cookie authentication and access/refresh-token lifetime settings. One limitation remains: role data is re-read through a two-second user cache, so a role change or revocation is not guaranteed to take effect on the very next request.

**Overall posture:** reasonable baseline controls, but **high residual risk for enterprise or sensitive CX/market-research data until the P0/P1 recommendations below are completed**.

## 2. Currently Implemented Security Controls

### Backend application controls

- **Bounded request bodies:** Fastify limits request bodies to 2 MiB, reducing oversized JSON and memory-exhaustion risk (`server/src/app.js`).
- **Safe production errors:** unexpected production errors return a generic message; body-limit errors are normalized to HTTP 413 (`server/src/app.js`, `server/src/lib/httpErrors.js`).
- **Parameterized database access:** application CRUD uses Prisma query builders. The few raw SQL calls use Prisma tagged-template `$queryRaw`, not unsafe string interpolation. No `$queryRawUnsafe` or `$executeRawUnsafe` use was found.
- **Survey write sanitization:** survey descriptions and text-block HTML are sanitized server-side using `isomorphic-dompurify` with restricted tags, attributes, and `text-align`-only styles (`server/src/lib/survey/sanitizeHtml.js`, `server/src/routes/surveys.js`).
- **Response hardening:** response IDs must be UUIDs; statuses are allowlisted; unknown question IDs are rejected; IDs cannot be reused across surveys or organizations; terminal responses cannot be changed back to partial; DNC status is resolved server-side (`server/src/routes/responses.js`).
- **Basic completion validation:** complete/DNC submissions must contain an answer, required questions must be non-empty, and configured email questions must contain a valid email (`server/src/lib/survey/completeValidation.js`).
- **Optimistic concurrency:** survey updates require an integer revision and use an atomic `updateMany` condition to prevent lost updates (`server/src/routes/surveys.js`).
- **Safer external redirects:** respondent redirect URLs are parsed and restricted to HTTP/HTTPS, then opened with `noopener,noreferrer` (`src/utils/survey/engines/externalRedirectEngine.js`).
- **Controlled development features:** local-library migration is not registered in production, and forced custom-domain verification is rejected outside development (`server/src/routes/migrate.js`, `server/src/routes/billing.js`).
- **Trusted-proxy intent:** Fastify is configured for one proxy hop, and nginx/Caddy overwrite `X-Forwarded-For` for the documented production path (`server/src/app.js`, `docker/nginx.conf`, `docker/caddy/Caddyfile`).

### Database and tenant-isolation controls

- **Application-level tenant scoping:** organization IDs are included throughout dashboard, users, platform lists, billing, response, export, and survey queries.
- **Owner-level survey scoping:** admins receive organization scope; editors receive organization plus `createdById` scope. Shared lookup helpers return 404 for inaccessible surveys to avoid existence disclosure (`server/src/lib/auth/authz.js`, `server/src/lib/auth/surveyAccess.js`).
- **Cross-tenant response protection:** reads and deletes include survey and organization conditions; public upserts reject an existing response ID owned by a different survey or organization (`server/src/routes/responses.js`).
- **Role-separated vendor access:** cross-organization vendor endpoints require the live `platform_owner` role; organization administration and billing endpoints require `admin` (`server/src/routes/billing.js`, `server/src/routes/platform.js`, `server/src/routes/admin.js`).
- **Relational integrity:** foreign keys and cascading behavior are defined in Prisma. Public survey paths, user emails, refresh-token hashes, and per-survey DNC addresses have uniqueness constraints (`server/prisma/schema.prisma`).
- **Atomic sensitive operations:** organization signup creates billing and the first admin in a transaction. Password changes/reset revoke refresh tokens in the same transaction (`server/src/routes/auth.js`, `server/src/routes/platform.js`).
- **No direct database publication in the production override:** PostgreSQL is only available on the Compose network; the web service is loopback-bound for Caddy (`docker-compose.yml`, `docker-compose.prod.yml`).

### API, authentication, and authorization controls

- **Central API authentication boundary:** all `/api` routes require authentication except explicitly listed login/signup/logout/refresh, public survey routes, and internal Caddy integration routes (`server/src/plugins/auth.js`).
- **Short-lived access JWTs:** production defaults to 15-minute access tokens. Production configuration requires a non-placeholder JWT secret of at least 32 characters (`server/src/config.js`, `docker-compose.prod.yml`).
- **HttpOnly cookie storage:** access and refresh credentials are in `HttpOnly`, `SameSite=Lax` cookies; production sets `Secure=true`. Tokens are not exposed in login/signup JSON (`server/src/lib/auth/cookies.js`, `server/src/routes/auth.js`).
- **Refresh-token protection:** refresh tokens are 256-bit random values, stored only as SHA-256 hashes, rotated on use, grouped into token families, and family-revoked when reuse is detected (`server/src/lib/auth/refreshTokens.js`).
- **Session revocation:** JWTs carry `tokenVersion`; password changes increment it and revoke existing refresh tokens. Deleted users, organization changes, and token-version changes invalidate sessions (`server/src/plugins/auth.js`).
- **Live authorization source:** the server uses the current database user role and organization rather than trusting role claims in the JWT. The user cache has a two-second TTL and write paths invalidate it (`server/src/plugins/auth.js`, `server/src/plugins/hotCache.js`).
- **Password hashing:** bcrypt is used with cost factor 10. Authentication failures use a generic invalid-credentials response (`server/src/lib/auth/password.js`, `server/src/routes/auth.js`).
- **Role and ownership checks:** reusable `preHandler` role guards and survey-scope helpers are applied to privileged routes.
- **Account safety checks:** role values are allowlisted at the API layer, organization admins cannot create `platform_owner` users, and last-admin/last-user protections are present (`server/src/routes/platform.js`).
- **CORS allowlist:** production requires explicit origins and rejects wildcard/reflect configurations while credentials are enabled (`server/src/config.js`, `server/src/app.js`).
- **Public route restrictions:** public reads only return live surveys belonging to active organizations. Login, signup, refresh, public fetch, DNC checks, and response submission have endpoint-specific rate limits (`server/src/routes/public.js`, `server/src/lib/survey/rateLimit.js`).
- **Security regression tests exist:** tests cover RBAC, survey/response ownership, cookie/refresh behavior, revision conflicts, rate limits, status/ID validation, completion checks, and XSS sanitization under `scripts/tests/integration/`.

### Frontend and infrastructure controls

- **Defense-in-depth XSS handling:** the frontend sanitizes rich HTML before editor insertion and immediately before every identified `dangerouslySetInnerHTML` render (`src/utils/sanitizeHtml.js`, `src/components/shared/forms/RichTextEditor.jsx`, `src/components/taker/screens/CoverPage.jsx`, `src/components/taker/SurveyPreview.jsx`).
- **React escaping:** ordinary survey titles, question text, profile data, and messages are rendered as React text rather than raw HTML.
- **No API-mode token in web storage:** API mode keeps only display/session metadata in `sessionStorage`; authentication credentials remain inaccessible to JavaScript in HttpOnly cookies (`src/utils/data/authStore.js`, `src/api/client.js`).
- **White-label path normalization:** generated public paths are slugified to lowercase ASCII, capped at 80 characters, globally unique, and locked while live (`shared/surveyUrl.js`, `server/src/lib/survey/surveyPublicPath.js`).
- **Custom-domain verification:** custom survey certificates are limited to verified Enterprise survey domains, and DNS TXT lookup uses an expected token (`server/src/lib/platform/caddyAsk.js`, `server/src/lib/platform/checkDomainVerificationDns.js`).
- **Browser headers:** nginx/Caddy set `X-Content-Type-Options`, `Referrer-Policy`, and a restrictive `Permissions-Policy`. nginx provides a CSP with self-only scripts, no objects, self-only forms/base URI, and restricted connection/font/image sources (`docker/nginx.conf`, `docker/caddy/Caddyfile`).
- **TLS termination:** Caddy provides automatic certificate issuance/renewal and HTTP-to-HTTPS behavior. On-demand custom certificates use an allow decision endpoint (`docker/caddy/Caddyfile`).
- **Network separation:** production binds nginx to `127.0.0.1`, leaves the API exposed only inside Compose, and does not publish PostgreSQL. Deployment verification checks for accidental public web-port binding.
- **Production secret workflow:** `init-env.sh` generates random database/JWT secrets under `umask 077`; `.env` is mode 600; deployment validation rejects known placeholders and missing values (`scripts/deploy/init-env.sh`, `scripts/deploy/common.sh`).
- **Production bootstrap safety:** the production override disables default account seeding, development migrations, Bearer-token acceptance, and relaxed rate limits (`docker-compose.prod.yml`).
- **Backups:** a nightly `pg_dump` workflow exists, stores local dumps with restrictive permissions, retains 14 days, and documents restore commands and the need for off-host copies (`scripts/deploy/backup.sh`, `docs/DEPLOY.md`).

## 3. Gaps & Missing Protections

### Resolved during Phase 1

#### 3.1 Vulnerable backend JWT dependency chain — resolved in working tree

The initial `npm audit --omit=dev` on 2026-09-07 reported **2 critical, 4 high, and 1 moderate package findings** in the backend lockfile. Most importantly, `@fastify/jwt <=9.1.0` resolved a vulnerable `fast-jwt` version with published advisories covering algorithm confusion, claim/cache confusion, critical-header handling, and an empty-secret authentication bypass scenario.

**Implemented:** upgraded `@fastify/jwt` to 10.2.2 (`fast-jwt` 6.3.3) and Fastify to 5.12.3, refreshed compatible transitive packages, pinned JWT signing and verification to HS256, regenerated the lockfile, and ran the full existing auth-cookie, API security, and RBAC suites successfully. The critical and Fastify/`fast-uri` findings are no longer reported.

**Residual:** the audit still reports three high findings in Prisma CLI/config tooling through `deepmerge-ts`. Prisma 6.19.3 is current on the existing major; upgrading to Prisma 7 is deferred to a separately tested compatibility release. Do not expose Prisma CLI tooling to untrusted input or production request paths.

### High

#### 3.2 Embed allowlist is not enforced on the framed document

`server/src/routes/public.js` adds `Content-Security-Policy: frame-ancestors ...` to the survey JSON response. CSP `frame-ancestors` must be delivered with the HTML document being framed; it does not become document policy when returned by `fetch`. The survey HTML from nginx has no `frame-ancestors`, and survey hosts intentionally omit `X-Frame-Options`. Consequently, any origin can currently frame the survey SPA despite the organization embed-origin setting.

**Action:** emit the per-survey `frame-ancestors` policy on the actual HTML navigation response (or serve a survey-specific HTML bootstrap through the API/reverse proxy). Default non-embed routes to `'none'`; apply the validated origin list only to `/embed/...`; add browser-level tests that attempt allowed and denied framing.

#### 3.3 No explicit CSRF defense for cookie-authenticated mutations

`HttpOnly`, `Secure`, `SameSite=Lax` cookies and restrictive CORS substantially reduce ordinary cross-site POST attacks, but they are not a complete CSRF policy. Same-site sibling-domain compromise, future cookie/domain changes, browser behavior differences, and endpoints accepting simple requests can reintroduce risk. CORS controls response reading, not whether every request is sent.

**Action:** enforce an exact `Origin`/`Sec-Fetch-Site` policy for authenticated unsafe methods and add a synchronizer or signed double-submit CSRF token. Reject missing/invalid Origin on browser mutation routes, with narrowly documented exceptions for non-browser clients. Scope the refresh cookie to `/api/auth/refresh` where practical.

#### 3.4 Public response payload validation is incomplete

The server validates IDs, statuses, known question keys, and basic completion, but it does not fully validate answers against question schemas. Examples include string/array/object shape, maximum lengths/counts, option membership, numeric/date bounds, matrix row/column IDs, ranking uniqueness, constant-sum totals, visibility/branch state, termination claims, `pageReached`, timestamp reasonableness, and fingerprint structure. `terminated` submissions do not receive the completion checks applied to `complete`/`dnc`. A forged but structurally accepted payload can corrupt analytics and store unexpected or excessive PII.

**Action:** define versioned JSON schemas per question type and for survey definitions/responses; reject unknown properties; set field-level limits; calculate trusted status/timestamp/termination metadata server-side; and rerun applicable visibility, branch, termination, and completion rules before finalization.

#### 3.5 Authentication and account lifecycle lacks enterprise controls

There is no MFA, SSO/SAML/OIDC, email verification, secure invitation flow, password reset/recovery, compromised-password screening, or user-visible session management. Signup is public and immediately creates an admin organization. The password policy is only eight characters, and admins set/receive temporary passwords directly through API responses. Refresh rotation creates a new 30-day expiry each time, with no separate absolute session lifetime.

**Action:** prioritize MFA for `admin` and `platform_owner`, verified-email/invite workflows, one-time expiring setup links instead of returned passwords, stronger password policy and breached-password checks, secure recovery, session/device inventory with revocation, and absolute plus idle session limits. Enterprise SSO should follow.

#### 3.6 No immutable security audit trail

Fastify request/error logging is not an audit log. The system does not durably record logins, failed authentication, password/role changes, user creation/deletion, survey publication/deletion, response/DNC exports or deletion, domain verification, plan changes, vendor cross-tenant actions, or organization deletion with actor, target, time, request ID, and source.

**Action:** add append-only, tenant-aware security audit events with restricted access and export, tamper resistance/remote shipping, PII-safe fields, retention policy, and alerts for high-risk events. Never log credentials, raw tokens, response bodies, or full DNC values.

#### 3.7 Data-governance and cryptographic controls are incomplete

Survey answers, DNC email addresses, user profiles, organization settings, and backups are stored without application-level encryption. Repository deployment guidance does not establish managed volume encryption, encrypted off-host backup automation, key management/rotation, retention schedules, respondent deletion/export workflows, legal holds, data residency, or restore testing. The local backup script only gzip-compresses dumps; compression is not encryption.

**Action:** define data classification and retention/deletion rules; encrypt disks and backups with KMS-managed keys; automate off-host versioned backups; test restores; minimize/pseudonymize fingerprints and DNC data; add tenant/respondent deletion/export workflows; and document subprocessor/data-residency controls.

#### 3.8 Optional fingerprinting creates an undisclosed third-party privacy flow

When survey fingerprinting is enabled, its default signal set includes IP/geolocation and canvas fingerprinting. The browser calls `https://ipapi.co/json/`, falling back to `https://api.ipify.org`, so respondent network data is disclosed to external services before being stored with the survey response (`src/utils/format/deviceSignals.js`, `src/components/taker/SurveyPreview.jsx`, `src/store/initialState.js`). No consent gate, data-processing configuration, regional routing, or self-hosted alternative was found.

**Action:** disable third-party IP lookup by default; collect only necessary server-observed fields; obtain and record appropriate consent where required; provide tenant controls and disclosures; execute processor agreements; honor Global Privacy Control/Do Not Track policy decisions; and define retention/deletion for IP, location, canvas, and device identifiers.

### Medium

#### 3.9 Rate limiting is local and easy to distribute around

The limiter is an in-memory fixed-window map keyed only by IP. Counters are not shared between processes/replicas, disappear on restart, and can be bypassed by distributed clients or large NAT populations. Responses do not include standard quota/`Retry-After` headers. Public reads, DNC membership checks, writes, signup, and login need different identity-aware abuse controls.

**Action:** move limits to Redis or an edge/WAF, combine IP with account/survey/email/device signals, add exponential login backoff and risk alerts, apply global and per-survey quotas, return standard rate-limit headers, and load-test enforcement.

#### 3.10 DNC endpoint is an email-membership oracle

Anyone who can identify a live survey can submit an email to the public DNC check and learn whether it is on that survey's suppression list. IP limiting reduces volume but does not remove the privacy leak.

**Action:** avoid returning raw membership where possible. Bind the check to a respondent invitation or signed survey token, return a generic flow outcome, and add distributed per-survey abuse detection.

#### 3.11 Client-supplied response IDs permit partial-response takeover if leaked

UUID entropy prevents guessing, and cross-survey conflicts are blocked. However, a leaked partial response UUID is sufficient for an unauthenticated caller to overwrite that partial response.

**Action:** issue response IDs server-side with a separate unguessable write secret/capability, or use a signed respondent session token. Store only a hash of that capability and require it for updates/finalization.

#### 3.12 Internal Caddy endpoint trusts network shape rather than strong identity

`/api/internal/*` bypasses global authentication. The Caddy ask route accepts loopback and broad Docker bridge (`172.16.0.0/12`) source addresses. Through the documented nginx path, external requests also arrive at the API from nginx's bridge address, so network-location logic alone does not prove the caller is Caddy. The endpoint still verifies the requested domain, limiting impact, but it exposes a database-backed operation and creates a fragile trust boundary.

**Action:** do not proxy `/api/internal/` from public nginx, bind a separate loopback-only listener, or require a Caddy-held shared secret/mTLS. Add strict rate limiting and cache verified-domain decisions.

#### 3.13 Host routing consumes a raw spoofable forwarding header

`clientDomainFromRequest()` prefers raw `X-Forwarded-Host`. nginx overwrites `Host` and `X-Forwarded-For` but does not explicitly overwrite or clear `X-Forwarded-Host`. A client can therefore influence custom-domain matching through that header. Public surveys are intentionally public, but this bypasses the expected host/domain boundary and can complicate certificate/routing assumptions.

**Action:** have each proxy overwrite `X-Forwarded-Host` from its validated host value, and only consume the framework's trusted hostname after an explicit allowed-host check. Remove the query-string client-domain fallback outside development.

#### 3.14 Role revocation is briefly stale and database roles are unconstrained strings

Authorization reload uses a two-second cache, despite comments/README statements that changes apply on the next request. In addition, role/status fields are plain strings without database enum/check constraints; the same applies to response, invoice, and subscription statuses.

**Action:** document the bounded two-second revocation window or remove caching for privileged actions. Require an uncached lookup/step-up check for vendor, user-management, export, billing, and destructive routes. Add database enum/check constraints and migration tests.

#### 3.15 Production safety depends on using the override and deployment script

The base Compose file declares `NODE_ENV=production` while defaulting to seeded `admin`/`vendor` accounts, a known JWT value, Bearer auth, insecure cookies, relaxed limits, and a publicly bound web port. These are intended for partner demos, but accidental use resembles production. The production override requires `JWT_SECRET` but does not itself require `POSTGRES_PASSWORD`; only the provided deployment script catches the default database password.

**Action:** make insecure demo settings an explicit development/demo override, keep the base production-safe, require the database password in production Compose interpolation, and make startup fail when incompatible production flags are enabled.

#### 3.16 Container and image hardening is limited

The API and nginx containers run with their image-default users; the API image includes compilers/build tooling and Prisma CLI; filesystems are writable; capabilities are not dropped; `no-new-privileges`, resource limits, and read-only root filesystems are absent. Images use mutable tags rather than digests.

**Action:** use a multi-stage API image, copy only production runtime dependencies, run both services as non-root, drop capabilities, enable `no-new-privileges`, use read-only filesystems/tmpfs where possible, add CPU/memory/PID limits, pin base/deploy images by digest, and scan/sign images with SBOM and provenance.

#### 3.17 CI does not enforce the existing security suite or vulnerability policy

The primary CI workflow builds images and runs selected unit/config tests, but does not start PostgreSQL/API and run auth/RBAC/security integration tests. It also lacks dependency audit enforcement, SAST, secret scanning, container/IaC scanning, SBOM generation, signed artifacts, and pinned action commit SHAs. After CI succeeds on `main`, CD builds, pushes, and deploys automatically without a protected-environment approval. The workflow can overwrite a fixed production tag such as `v0.1.0`, while Compose pulls by tag rather than verified digest, making releases non-reproducible and rollback provenance ambiguous.

**Action:** run the full security integration suite in CI; add Dependabot/Renovate, `npm audit` or OSV policy, CodeQL/Semgrep, Gitleaks, Trivy/Grype, Dockerfile/Compose linting, SBOM/provenance, image signing, and protected-branch review requirements. Publish immutable release tags, deploy verified image digests, and require production environment approval or release-tag promotion.

#### 3.18 Security monitoring and incident readiness are absent

There is no documented centralized log sink, metrics/alerts for auth failures, 403/429 spikes, DNC probing, response floods, vendor actions, certificate abuse, database anomalies, or backup failure. No incident-response, vulnerability-disclosure, key-rotation, or breach playbook was found.

**Action:** add structured/redacted logs, metrics and alerts, request correlation, uptime and synthetic checks, database/container monitoring, backup alerts, incident runbooks, security contacts, and periodic access/key reviews.

#### 3.19 Tenant isolation has no database-level backstop

Tenant separation is consistently implemented in the reviewed application queries, but PostgreSQL row-level security is not enabled. A future route, raw query, background job, or maintenance script that omits `organizationId` can cross tenant boundaries. The `Response` model also stores both `surveyId` and `organizationId` without a composite database constraint proving that the survey belongs to the same organization.

**Action:** evaluate PostgreSQL RLS with transaction-scoped tenant context, add composite foreign-key or equivalent consistency constraints, use tenant-required repository helpers, and add negative cross-tenant tests for every new data path and background job.

#### 3.20 Token configuration and documentation have drifted

Compose sets `JWT_EXPIRES_IN: 24h` and the README documents that variable, but `loadConfig()` uses `ACCESS_TOKEN_EXPIRES_IN` with a 15-minute default. The short effective lifetime is safer, but operators may make incorrect incident-response and session-lifetime assumptions.

**Action:** remove the obsolete variable or implement one clearly documented compatibility alias; validate unknown/deprecated security settings at startup; and test the effective production configuration in CI.

#### 3.21 Development import and rich-text state are not sanitized consistently

The rich-text editor sanitizes initial/external values and paste input, but emits its live `contentEditable.innerHTML` without sanitizing it first. Normal typed text and toolbar operations are low risk, and API-mode render/write paths sanitize again; however, local mode can retain untrusted markup in browser state. Separately, the development-only `/api/migrate/local` route writes imported survey JSON without the server survey sanitizers, creating a persistent-XSS regression path in development or any environment accidentally started with a non-production `NODE_ENV`.

**Action:** sanitize every editor emission before state storage, route local imports through the same survey normalization/sanitization pipeline as normal writes, and add migration/editor regression tests.

#### 3.22 Embed messaging uses a wildcard target origin

The embedded taker posts ready, resize, completion, and termination events with `window.parent.postMessage(..., '*')` (`src/hooks/useEmbedMessaging.js`). The protocol intentionally excludes answers and direct PII, which limits impact, but a malicious framing parent receives survey ID and lifecycle metadata. The bundled `public/embed-test.html` listener also validates only the message payload marker, not `event.origin` and `event.source`.

**Action:** pass the server-approved parent origin into the embed bootstrap and use it as `targetOrigin`; require integrators and the test harness to verify both `event.origin` and `event.source`; exclude the development embed harness from production artifacts.

#### 3.23 Host and operational access hardening is incomplete

The deployment bootstrap configures a deny-by-default firewall, but repository automation does not enforce key-only SSH, disable direct root login, add brute-force protection, or define periodic host patching. CD documentation supports a root VPS user. The DNS helper also calls `ifconfig.me` to discover the public IP, adding an avoidable third-party availability/privacy dependency. No `SECURITY.md` or coordinated vulnerability-disclosure channel was found.

**Action:** use an unprivileged deployment account with narrowly scoped sudo, disable password and root SSH login, add fail2ban or provider controls, automate security updates with maintenance policy, remove the external IP lookup where possible, document access review, and publish a private or public vulnerability-reporting process.

### Low / defense in depth

#### 3.24 Header policy can be strengthened

The static CSP still permits `'unsafe-inline'` styles and arbitrary HTTPS/data/blob images, and it does not set `frame-ancestors`. HSTS and COOP-related headers are not explicitly configured. Arbitrary remote brand logos can create third-party tracking of respondents.

**Action:** add HSTS after confirming HTTPS-only operation, deliver correct `frame-ancestors`, narrow image hosts or proxy uploaded logos, prefer uploaded/validated assets, evaluate nonce/hash-based style policy, and consider `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, and a CSP reporting endpoint.

#### 3.25 Uploaded image validation trusts prefixes

Avatar checks trust a `data:image/` prefix and approximate base64 length rather than restricting MIME type, decoding safely, checking magic bytes, and re-encoding. Brand logos are better restricted but still accept GIF and arbitrary remote HTTP/HTTPS URLs.

**Action:** accept only required raster formats, decode and inspect magic bytes/dimensions, re-encode server-side, cap pixels and bytes, malware-scan stored uploads where appropriate, serve from a dedicated asset origin, and disallow plaintext HTTP.

#### 3.26 Public response authenticity and anti-automation are limited

No invitation signature, CAPTCHA/bot challenge, replay-resistant respondent token, duplicate policy, or server-side device-risk control protects public submissions. Device fingerprint data is client-asserted and should not be treated as proof.

**Action:** support signed invitations/collector links, optional privacy-preserving bot challenges, deduplication rules, server-observed abuse signals, and transparent consent/retention for fingerprinting.

#### 3.27 Local mode is intentionally insecure

Local mode stores plaintext users/passwords, sessions, survey data, responses, DNC email addresses, and platform data in browser storage. Any script running on the origin can read it, and browser profiles/backups may retain it.

**Action:** ensure production builds fail unless `VITE_USE_API=true`; display a persistent development-only warning; prevent sensitive real data from being imported into local mode; and consider removing local authentication entirely in favor of an explicit single-user demo mode.

## 4. Prioritized Recommendations

1. **Completed in Phase 1 — Patch the authentication/runtime dependency chain.** JWT/Fastify dependencies and transitive URL packages are upgraded, the lockfile is regenerated, HS256 is explicit, and auth/RBAC/security tests pass. Prisma CLI’s remaining advisory is isolated for a separate major-version migration.
2. **P0 — Enforce iframe policy on HTML documents.** Move dynamic `frame-ancestors` to the framed `/embed/...` navigation response, deny framing elsewhere, restrict `postMessage` target/listener origins, and add real-browser allow/deny tests.
3. **P0 — Add CSRF enforcement.** Validate exact Origin/Fetch Metadata on unsafe authenticated requests and add CSRF tokens; narrow auth-cookie paths.
4. **P1 — Introduce authoritative schemas.** Add versioned Fastify JSON schemas and per-question answer validators, strict limits, trusted server timestamps/status, server-side completion/termination evaluation, and one normalization/sanitization path for normal writes and imports.
5. **P1 — Deploy shared abuse protection.** Put Redis/edge rate limiting and WAF controls in front of login, signup, refresh, public fetch, DNC, response writes, and Caddy ask; add per-account/survey and global quotas.
6. **P1 — Build immutable audit logging.** Cover authentication, admin/vendor actions, data exports/deletes, publication, billing/domain changes, and organization deletion; ship alerts off-host.
7. **P1 — Harden privileged identity.** Add MFA first for `platform_owner` and admins, verified invites/email, safe password reset, one-time setup links, session inventory/revocation, and absolute session lifetime.
8. **P1 — Establish data governance.** Disable third-party fingerprint lookups by default, classify and minimize PII/fingerprints/DNC storage, implement consent and retention/deletion/export, encrypt volumes and off-host backups, manage keys, and test restores.
9. **P1 — Close proxy/internal trust gaps.** Stop publicly proxying internal routes or authenticate them strongly; overwrite forwarding headers; validate hosts; remove production query fallbacks.
10. **P2 — Make production the safe default.** Separate demo settings, require all production secrets in Compose, fail startup on insecure flag combinations, remove stale JWT configuration, and align README claims with code.
11. **P2 — Harden containers and supply chain.** Non-root/minimal/read-only containers, dropped capabilities, resource limits, immutable release tags and image digests, SBOM, vulnerability scans, provenance, and signing.
12. **P2 — Enforce security in CI/CD.** Run database-backed auth/RBAC/security tests; gate on dependency, secret, SAST, container, and IaC findings; pin third-party actions; and require approval or release promotion before production deployment.
13. **P2 — Add monitoring and incident readiness.** Centralized redacted logs, auth/abuse/backup/certificate alerts, runbooks, disclosure process, and periodic access/key reviews.
14. **P3 — Strengthen browser/upload defenses.** HSTS, corrected CSP framing policy, narrower asset policy, safe image decoding/re-encoding, dedicated asset hosting, and CSP reporting.
15. **P3 — Add recurring assurance.** Harden and periodically review SSH/host access, publish a vulnerability-disclosure process, threat-model tenant isolation (including an RLS/database backstop), public collectors, vendor access, and custom domains, and commission penetration tests before enterprise launch and after major auth/data-flow changes.

