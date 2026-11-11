# Immediate matching job notifications

When an employer saves changes to a published job, reopens it, or an admin publishes it, the same SQL transaction queues a matching event. Pending, draft, closed and expired jobs and inactive employers cannot create matching alerts. If saving the job or its skills fails, the entire change and its queued event roll back.

After commit, the notification worker wakes immediately. It uses confirmed, verified skills from each candidate's latest **Ready** version of their active primary CV. Candidates must have an active Candidate account, enable job searching, and not already have applied to that job. No external AI request is made when matching notifications.

The existing matching rule is reused: mandatory skills have weight 2, optional skills weight 1, and the unrounded matched weight must reach 70%. The percentage describes overlap with the job's skills, not a guarantee of hiring or total suitability. Explicit job skills take priority; skill taxonomy matches in job text are used only when no explicit requirements exist.

All eligible candidates are evaluated, rather than only a top-three recommendation list. Each outbox transaction handles at most 100 candidate records. Its cursor and notifications commit together, so retrying a failed batch does not skip or duplicate recipients.

A normalized content and skill fingerprint deduplicates identical saves, whitespace-only edits, repeated approval and worker retries. A meaningful new revision replaces older alerts for that job. Closing/expiring a job, switching/archiving a primary CV, uploading a new unconfirmed CV, disabling search or applying hides stale alerts on the next inbox request. The ordinary top-three recommendation for the same job is hidden while a corresponding special alert is active.

The authenticated `/api/notifications/stream` endpoint sends only change signals, never CV text, notification content or a JWT in a URL. The browser immediately refreshes its own authenticated inbox and displays a highlighted opportunity and an accessible popup for newly received alerts. Offline candidates retain notifications in SQL. Connections reconnect, pause in hidden tabs, close on account changes, and keep the existing 30-second polling as a fallback. This is an in-app notification, not email or operating-system push.

The inbox response also includes `latestOpportunity`, independently of its current page, so readers can see new opportunities without losing their place in notification history. Both ordinary recommendations and special alerts require the latest CV version to be Ready. Late unauthorized stream responses are compared against the current token before reconnecting or stopping.

SSE subscribers and worker wake-ups are local to one Node process. Deployments with multiple API processes require a shared event bus for immediate signals across instances; polling remains the fallback without that shared bus.

## Validation

- `npm --prefix server run test:job-alerts`: scoring boundaries, batching, deduplication, superseded jobs, private signals and commit/rollback behaviour.
- `npm --prefix server run test:otp`: existing authentication regression tests.
- `npm --prefix client run test:notifications`: bell, popup, SSE framing, session isolation, navigation and existing admin reporting tests.
- `npm --prefix client run build`: production frontend build.
- `npm --prefix server run test:notifications`: complete SQL integration suite, including 105 recipients across multiple batches and actual authenticated SSE delivery. This creates and drops only a uniquely named, empty `JobtimizeNotificationsTest_<8 hex>` database and requires the documented local SQL credentials/Windows database-creation permission. Never point it at an application database.

`database/schema.sql` adds only the repeatable `IX_Notifications_JobAlerts` index. Normal server startup applies that index through the existing schema initializer; no reset or reseed is required.
