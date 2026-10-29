# Admin reporting, automatic Premium and moderation

Implemented in `Jobtimize_V2`, using its configured database only. No historical subscription records are converted into payment revenue.

## Reports

Open `/admin/dashboard`. Choose a preset, exact day, month, year, or an inclusive date range and click **Áp dụng**. The applied period is displayed beside the report. Dates use the Vietnam calendar (`Asia/Ho_Chi_Minh`); existing SQL `DATETIME` values are treated as application wall time. Deployments must keep the database/application timestamps consistent with this convention.

- Revenue uses `PaymentTransactions.Status='Success'` with a non-null `PaidAt`. It uses the amount stored on each transaction and the payment date, rather than the subscription's current package or creation date. Pending/unpaid orders and historical demo subscriptions are excluded.
- All timeline, package, method, category and location breakdowns use the selected period. Account/job/application totals are explicitly all-time; new counts, match-score average, paying employers and ARPU use the selected period.
- Month/year growth compares the preceding calendar month/year. Other modes compare the immediately preceding interval of the same number of days. When the preceding value is zero, growth is shown as **Chưa có kỳ gốc**.
- Date validation rejects impossible dates, reversed ranges and ranges over 1,830 days. Input years are 2000–2100. SQL ranges are half-open, so the last day's full time is included without including the next midnight. Longer periods use monthly chart buckets.
- **Xuất Báo Cáo** exports summary, KPI, timeline and distributions. **Xuất file** beside the transaction table exports **all matching successful transactions**, including records on other pages, with the current search/method/period. CSV contains UTF-8 BOM, escaped quotes/newlines and protection against spreadsheet formula execution. Exports over 50,000 transactions are rejected with a request to narrow the range; they are never silently truncated.
- Table search/pagination runs on the server. Requests are cancelled/discarded when filters change. Downloads release their object URLs. Date-indexed predicates avoid scanning history solely to discard unwanted chart buckets.

Admin-only API:

```text
GET /api/admin/analytics?timeRange=day&date=2024-02-29
GET /api/admin/analytics?timeRange=month&month=2024-02
GET /api/admin/analytics?timeRange=year&year=2024
GET /api/admin/analytics?timeRange=custom&fromDate=2024-02-01&toDate=2024-02-29
GET /api/admin/transactions?<same period>&search=...&paymentMethod=PayOS&page=1&limit=20
GET /api/admin/analytics/export?<same period>&kind=summary
GET /api/admin/analytics/export?<same period>&kind=transactions&search=...&paymentMethod=PayOS
```

## Automatic Premium

The Admin payment-approval tab, pending-payment prefetch and manual activation endpoints are removed. Employer receipt uploads and simulated/manual payment methods are removed from checkout. KYC review remains a separate legal-verification workflow.

The only paid activation paths are a signature-verified PayOS success webhook or a server-to-server PayOS status response confirming the same order and amount as paid. The browser's success URL, receipt or confirmation request cannot activate a package. Unconfigured gateways fail closed and do not return a simulated QR payment flow.

Payment success and subscription/quota updates commit in one SQL transaction. A payment-row lock deduplicates concurrent webhook/poll callbacks; an employer-row lock serializes separate simultaneous purchases for the same employer. A failed quota write rolls back payment success. The ledger retains every payment even when the active subscription is extended in place. A free trial is granted at most once per employer through this activation service.

Configure `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` and `FRONTEND_URL` in the ignored `server/.env`. Register the public HTTPS `/api/payments/payos-webhook` URL with PayOS. Valid signed registration probes without a matching local order are acknowledged without activating anything. Localhost alone is not a public webhook endpoint. The isolated development configuration has no live PayOS credentials; no real-money transfer was used for verification.

Retired routes: Admin pending/verify return 404; legacy Employer `/checkout` and `/payment/confirm` return 410 with guidance to use PayOS. Existing pending manual orders are preserved as unpaid; no bulk approval occurs.

## Confirmed violations

1. A user submits a report: it stays **Pending**, with no automatic punishment.
2. Admin checks evidence and enters a conclusion of 10–2,000 characters.
3. **Resolved** confirms the violation and automatically locks the correct account. For a job report, that account is the employer owning the job. Every non-closed job belonging to that employer is closed. For a Candidate, passive job discovery is disabled. **Dismissed** records the conclusion without a ban, even if a stale client sends an old `actionTaken` field.
4. The report, account status, audit entry and notification outbox commit together. Current JWTs fail authentication on their next API request. Public jobs and candidate search exclude locked accounts; Admin cannot publish a locked employer's job.
5. An identical replay is harmless. A different conclusion for a finalized report returns 409. Administrator accounts and the acting administrator are protected, including malformed legacy report targets.
6. Admin may review an appeal and use the existing account-unlock action. Unlock is audited. It does not republish closed jobs or re-enable candidate discovery; those require separate review/user action. Replaying an old report after an appeal cannot ban the account again.

`AccountModerationActions` records actor, target, reason, previous/new status, report and UTC audit time. `UserReports` records the reviewer and resolution time. Finalized report dialogs are read-only and show their reviewer and account action. No accounts are banned by the database migration itself.

## Migration and verification

`database/admin-enhancements.sql` is additive and rerunnable. It adds moderation audit fields/table, date indexes, missing PayOS columns and a unique non-null order-code index. Startup initialization and `db:init` include it. Existing installations can run:

```powershell
npm --prefix server run db:notifications
npm run test:notifications
npm --prefix server run test:otp
npm run test:ai
npm run test:cv
npm run build
```

The SQL suite creates and drops its own disposable database. Admin regression cases cover inclusive month/leap-day bounds, invalid filters, zero periods, complete multi-page export, role restrictions, retired approval routes, genuine SDK signature verification with isolated test keys, amount/ownership checks, duplicate/concurrent callbacks, atomic quota failure, confirmed/dismissed reports, concurrent replay, audit rollback, candidate discovery, protected administrators and appeals. React component tests cover date inputs/apply, full-export filters/pagination, removal of manual approval and explicit ban warnings. These are API/SQL/component checks, not browser end-to-end or live gateway certification.

### Responsive reporting follow-up

The report title, period form and action buttons occupy separate rows. Date inputs use a responsive grid, vertical labels and shrinkable full-width controls. Custom date ranges cannot squeeze the heading or push actions beyond the card. Reversed ranges are blocked before requests, and only the active date fields are sent. Empty application periods show no match-score data instead of the previous hardcoded 85% fallback.

Browser verification on the running Admin page covered custom-range widths 320, 375, 640, 768, 1024, 1280 and 1860 pixels: no overlapping header controls, no controls outside the report card and no horizontal page overflow. Keyboard date entry and Apply correctly selected 1–28 October 2026. No JavaScript console errors were observed. Frontend/component tests (11), OTP regression (13), and the frontend build passed. Local QA captures and measurement results are saved under ignored `.cache/admin-layout-qa/`.

### Existing sample revenue

The original startup code creates eight sample subscriptions (`TXN-202605-FPT01` through the specifically listed seed references) totaling 30,920,000 VND in this checkout. They remain in `EmployerSubscriptions`; the verified `PaymentTransactions` ledger is empty in the isolated local configuration. This is why changing reporting to the verified ledger made the old revenue chart zero.

Admin now has a **Nguồn doanh thu** selector. **Thanh toán đã xác nhận** remains the default. **Dữ liệu mẫu có sẵn** reads only the eight original seed references from existing subscriptions; it does not create a transaction, activate a subscription, or change any saved data. Unknown/unverified legacy subscriptions are not included. The chart, KPI, package/method breakdown, transaction table and CSV use the same selected source and period. Sample charts, table rows, CSV contents and filenames are labelled as demo data; account/job/application metrics keep their existing source. Empty verified reports explain the zero result and offer the available sample records for inspection. API query: `dataSource=payments|demo` on analytics, transactions and export routes.
