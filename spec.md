Specification – "Directors Mail Alias Platform"
Date: 18 July 2025 Version 1.1

⸻

1 Purpose

Provide a cost-free, self-managed e-mail alias directors@bardonlodge.co.uk that
	•	forwards every inbound message to all current directors;
	•	lets authorised directors add / remove recipients through a small web UI;
	•	locks the UI behind Cloudflare Zero Trust single-sign-on (SSO);
	•	is deployed and maintained entirely by Infrastructure-as-Code (IaC) – no manual clicks.

⸻

2 Scope
	•	Inbound mail only: forwarding is required; sending from the alias is out-of-scope.
	•	Production + staging stacks hosted on the Cloudflare Free plan.

⸻

3 Glossary

Term	Definition
Alias	directors@bardonlodge.co.uk – public address directors publish.
Recipient	Personal mailbox of a director.
Worker	Unified Cloudflare Worker that fans out mail, exposes the REST API, and serves the SPA.
D1	Cloudflare SQLite-as-a-service used to store the recipient list.
Admin SPA	Single-page front-end (React) served by the Worker with static assets.
Zero Trust Access	Cloudflare access-control layer providing login & MFA.
IaC	Terraform + Wrangler source-controlled configuration and code.


⸻

4 Functional requirements

ID	Requirement
F-1	System shall accept mail sent to directors@bardonlodge.co.uk and forward to every active recipient within 2 s.
F-2	A director may add or remove a recipient using the Admin SPA; the change takes effect for the next inbound message without redeploying code.
F-3	Only users whose personal address is in the active recipient list may reach any /api/* endpoint or the SPA.
F-4	Alias must work with up to 25 recipients (far below Email Routing's 200-rule cap turn0search5).
F-5	All configuration and deployments shall be automated through CI/CD; no console click-ops are permitted.


⸻

5 Non-functional requirements

Category	Requirement
Availability	≥ 99.9 % (leverages Cloudflare's global edge).
Performance	P95 end-to-end forwarding latency < 2 s.
Cost	Stay inside Cloudflare Free limits (100 k Worker requests / day turn0search1; 5 M D1 reads + 100 k writes / day turn0search0).
Security	TLS 1.2+, MFA capable, no credentials stored in code.
Compliance	SPF/DKIM/DMARC records present for the domain.
Observability	Logs of every API call and mail forward kept 30 days in Cloudflare Logs (if enabled) or sent to external LogPush sink.


⸻

6 High-level architecture

Internet MTA
   │
   ▼
Cloudflare Email Routing (MX) ──► routing rule
                                  action = Worker
                                     │
                                     ▼
┌─────────────────────────────────────────┐
│ directors-worker (Unified)              │ ➊ Fan-out mail
│  ┌─────────────────────────────────────┐ │ ➋ REST API `/api/*`
│  │ Email Handler                       │ │ ➌ Serve SPA assets
│  └─────────────────────────────────────┘ │ ➍ SPA routing
│  ┌─────────────────────────────────────┐ │
│  │ API Routes (/api/*)                 │ │
│  └─────────────────────────────────────┘ │
│  ┌─────────────────────────────────────┐ │
│  │ Static Assets (React SPA)           │ │
│  └─────────────────────────────────────┘ │
└─────────────────┬───────────────────────┘
                  │ SQL
                  ▼
Cloudflare D1  (recipients table)
                  ▲
                  │ HTTPS (same-origin)
Admin Users ──────┘

All API and SPA requests flow through
Cloudflare Zero Trust Access for authentication.


⸻

7 Component design

7.1 DNS & Email Routing (Terraform)
	•	cloudflare_email_routing_settings "on".
	•	cloudflare_email_routing_rule:
	•	Matcher: literal to == directors@bardonlodge.co.uk
	•	Action: worker = "directors-worker" (recently supported in provider v5).
	•	Rationale: Email Routing UI forwards to only one destination; Worker action removes that limit turn0search2.

7.2 Cloudflare Worker directors-worker
	•	Bindings
	•	DB – D1 database.
	•	ASSETS – Static assets (SPA files from spa/dist/).
	•	Email handler
	1.	SELECT email FROM recipients WHERE active=1;
	2.	await message.forward(row.email);
	•	Fetch handler
	•	Read Cf-Access-Authenticated-User-Email header.
	•	Verify presence in recipients.
	•	Route `/api/*` requests to API handlers.
	•	Serve SPA for navigation requests.
	•	Implement CRUD:
	•	GET /api/recipients → JSON list.
	•	POST /api/recipients → body { email } adds row (if unique).
	•	DELETE /api/recipients/:id → deactivate.

7.3 Database – Cloudflare D1

CREATE TABLE recipients (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT UNIQUE NOT NULL,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

7.4 Admin SPA
	•	React front-end built with Vite + TypeScript (≈200 LoC).
	•	Calls underlying API; no authentication logic – Access handles it.
	•	Served by the Worker using static assets from spa/dist/.
	•	Single-page application routing handled by Worker's not_found_handling.

7.5 Cloudflare Zero Trust Access
	•	Application: api.bardonlodge.co.uk wildcard (covers both API and SPA).
	•	Policy: Allow any authenticated user whose email is in the recipients table.
	•	Login methods: Email-OTP or Google/Microsoft (configurable).
	•	Free plan covers up to 50 users turn0search3 turn0search13.

7.6 Infrastructure-as-Code

Tool	Purpose
Terraform (CF provider ≥ v5)	Zone records, Email Routing rule, Access app + policy.
Wrangler v3+	Worker build/deploy, D1 migrations, static assets serving.
GitHub Actions	Pipelines: terraform plan/apply, npm run build, wrangler deploy.
Secrets	CF_API_TOKEN, CF_ACCOUNT_ID, CF_ZONE_ID, etc. stored in GH Secrets.


⸻

8 API contract

Endpoint	Verb	Request	Response
/api/recipients	GET	–	[{ id, email, active }]
/api/recipients	POST	{ "email": "new@x.com" }	201 Created
/api/recipients/:id	DELETE	–	204 No Content

Errors: 401 Unauthenticated, 403 Forbidden, 422 for invalid mail.

⸻

9 Deployment workflow
	1.	Local
	•	wrangler d1 create building-aliases
	•	wrangler d1 migrations apply building-aliases
	•	npm run dev (starts Worker with SPA assets in dev mode).
	2.	CI
	•	PR → npm test, lint, Terraform plan (no apply).
	•	Merge → npm run build (builds SPA), terraform apply, then wrangler deploy (unified deployment).
	•	Tag v* → repeat for production environment (different zone or route prefixes).

⸻

10 Operational procedures

Action	How
Add / remove director	Use SPA; audited via Worker logs.
Backup list	Nightly wrangler d1 export pushed to repo artefacts.
Metrics	Enable Cloudflare Logs & Analytics; optional LogPush to R2.
Rate limiting	Not required; expected traffic ≤ 500 mails/day.
Alerting	GitHub Action dispatches on failed deploys; optional Slack webhook from LogPush errors.


⸻

11 Limitations & assumptions
	•	Free plan request cap: 100 k Worker requests/day – far above expected usage turn0search1.
	•	Free plan D1 caps (5 M reads / 100 k writes / 5 GB storage) turn0search0.
	•	Cloudflare Email Routing refuses messages > 25 MiB turn0search5.
	•	Directors must still click Cloudflare's one-time destination verification link the first time their address is added.

⸻

12 Implementation backlog (agent to execute)

Priority	Task	Acceptance criterion
1	Scaffold repo with described layout.	npm test passes, terraform validate clean.
2	Build Worker handlers & unit tests.	Can fan-out to stub SMTP in dev; CRUD works.
3	Write initial D1 migration.	Table created, wrangler dev starts.
4	Author Terraform for zone, MX, routing rule, Access.	terraform apply stands up staging stack w/o manual input.
5	Develop SPA (list + add/remove).	Works locally against wrangler dev.
6	Wire GitHub Actions CI/CD.	Push to main auto-deploys staging.
7	Produce infrastructure README & runbook.	New engineer can bootstrap from scratch.
8	Manual test: send mail → verify fan-out, verify Access gate.	All checks green.
9	Cut production release (v1.0).	Directors alias live.


⸻

13 Acceptance criteria
	1.	End-to-end demo: adding a recipient via SPA causes next test mail to reach the new inbox; removing blocks both mail & API.
	2.	Zero manual dashboard config: repository + secrets are the only inputs.
	3.	Free-tier compliance: automated test script shows daily usage < 1 % of limits under 500 mails.
	4.	Security: OWASP ZAP scan of API passes; unauthorised email address receives 403.
	5.	Docs: Onboarding guide, backup / restore guide, and upgrade path to paid Workers plan.

