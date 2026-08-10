# Learning Is Fun ERP
## Fees Management — Payment Mode + WhatsApp Addendum

This addendum is mandatory and must be read together with:

`.codex/modules/MODULE_FEES_MANAGEMENT_CODEX.md`

If there is any ambiguity, these requirements extend the Fees specification. Do not remove or weaken the financial-integrity, RLS, receipt, reversal, Student, or Parent requirements in the main Fees specification.

Do not start Examinations. Do not commit or push unless explicitly instructed.

## 1. Payment Mode is mandatory for every posted payment

Reuse the existing `payment_modes` master. Do not create hard-coded payment-mode enums in the Fees module.

Every posted fee payment must reference a valid, active `payment_modes.id` belonging to the authenticated Administrator's institute.

The Collect Payment screen must require a Payment Mode before posting.

Examples can include whatever active records the institute configures, such as:

- Cash
- UPI
- Bank Transfer
- Cheque
- Card
- Other institute-defined modes

Do not assume these names exist; render the live active Payment Modes master.

For modes where a transaction/reference is appropriate, support an optional `reference_no`/transaction reference field. It should remain optional at the database level unless the institute later configures mode-specific rules.

Receipt, payment history, collection report, Student ledger, Student receipt view, and WhatsApp payment confirmation must display the recorded Payment Mode.

Reversed payments retain their original Payment Mode and reference for audit history.

## 2. WhatsApp is a delivery channel, not part of accounting atomicity

The financial transaction must be committed independently of WhatsApp delivery.

Correct architecture:

`post_fee_payment()`
→ commits payment + allocations + receipt atomically
→ creates/queues a WhatsApp confirmation job/outbox record after or as part of the same database transaction
→ delivery worker/service sends WhatsApp separately

If Meta/WhatsApp is unavailable, credentials are missing, a template is rejected, or delivery fails:

- the posted payment remains posted;
- receipt remains valid;
- allocation/balance remains correct;
- the message job records failed/pending status for retry;
- Administrator can see delivery status;
- do not reverse or roll back the payment because messaging failed.

Do not call Meta directly from a Client Component.

## 3. Reuse notification architecture where sensible

Inspect the existing Learning Planner `notifications` / `notification_recipients` architecture before adding messaging tables.

If that model can safely represent Fees WhatsApp jobs without creating ambiguous financial audit history, extend/reuse it.

If a dedicated outbox is cleaner, create a narrowly scoped table such as `fee_message_outbox` or a generic delivery-outbox consistent with repository conventions.

Minimum fields for a dedicated outbox should include concepts equivalent to:

- `id`
- `institute_id`
- `student_id`
- optional `parent_id` / recipient user relation where applicable
- `fee_payment_id` nullable
- `student_fee_due_id` nullable
- `message_type`
- `channel` = `whatsapp`
- recipient phone in normalized international format or a safe reference to the contact record
- template name/key
- template parameters / payload JSON
- `scheduled_for`
- `status`
- `attempt_count`
- provider message id nullable
- last safe error code/message nullable
- `sent_at` nullable
- `delivered_at` nullable where provider callbacks are later supported
- timestamps

Recommended statuses:

- `queued`
- `processing`
- `sent`
- `delivered`
- `failed`
- `cancelled`

Do not store Meta access tokens or secrets in database rows.

## 4. WhatsApp recipient priority

Inspect the existing Student and Parent data model for mobile numbers and linked-parent relationships.

For fee communications, support configurable recipient behavior:

- Parent only
- Student only
- Student + Parent

Default recommendation for school-age fee reminders: Parent when a valid linked Parent/mobile exists; otherwise fall back to Student if an authorized Student mobile exists.

Do not invent or guess phone numbers.

Normalize phone numbers before provider delivery and fail safely when no valid recipient exists.

The Administrator should be able to see `No WhatsApp recipient available` rather than silently pretending a reminder was sent.

## 5. Configurable overdue reminder rule

The institute must be able to configure when fee reminders start after the due date.

Provide a simple Fees settings/configuration model or equivalent server configuration with at least:

- `whatsapp_fee_reminders_enabled` boolean
- `reminder_after_due_days` integer, default recommendation 0 or a small institute-selected grace period
- optional `repeat_every_days` integer
- optional `max_reminders_per_due` integer
- recipient preference (`parent`, `student`, `both`)
- optional quiet-time/day controls can be deferred

Example behavior:

Due date: 10 August
`reminder_after_due_days = 5`
First reminder eligible: 15 August

The rule is based on the due's remaining outstanding balance, not merely the due date.

Never send an overdue reminder when:

- due is fully paid;
- due is waived;
- due is cancelled;
- effective outstanding is 0;
- Student fee assignment is no longer applicable in a way that invalidates the due;
- reminder feature is disabled;
- max reminder count has been reached.

Partial payment remains eligible for reminder only for the remaining outstanding amount.

## 6. Scheduled reminder processing

Implement reminder eligibility as an idempotent server/database operation suitable for a scheduled job.

Recommended operation:

`queue_overdue_fee_whatsapp_reminders(p_as_of_date date default current_date)`

It must:

- derive/validate tenant scope appropriately;
- identify overdue dues using the configured grace period;
- calculate authoritative outstanding from effective posted allocations;
- skip paid/waived/cancelled/reversed effects correctly;
- avoid duplicate reminder jobs for the same due + reminder cycle/date;
- queue messages only; do not make external Meta calls inside a long database transaction.

If a global scheduler is used later, it may iterate eligible institutes safely. Never allow one institute's scheduler context to expose another institute's fee data.

The module should be structurally ready for Supabase Cron / scheduled invocation, but actual Meta credentials and production scheduling may be deferred if not currently configured.

## 7. Manual reminder action

Administrator should also have a controlled manual action from:

- Student Fee detail
- Outstanding report
- Overdue dues panel

Action: `Send WhatsApp Reminder`

It must:

- validate Administrator role/institute;
- validate the due is still outstanding;
- show the recipient before queueing;
- avoid accidental double-click duplicates/idempotently protect repeated requests;
- record who initiated the manual reminder;
- queue the message rather than blocking the UI on Meta delivery.

## 8. WhatsApp overdue reminder content

Use approved WhatsApp template-message architecture when Meta integration is enabled.

Template parameters should support data such as:

- Student name
- Fee Head / installment description
- Due date
- Original/net due amount
- Amount already paid
- Current outstanding amount
- Institute name
- optional contact/support instruction

Do not expose unrelated Student data.

Example semantic message (not a hard-coded provider template):

`Fee reminder for {{student_name}}: {{fee_head}} due on {{due_date}} has an outstanding balance of {{outstanding_amount}}. Please contact {{institute_name}} if payment has already been made.`

The actual Meta-approved template name/text must be configurable and not assumed to be pre-approved.

## 9. Automatic WhatsApp payment confirmation

After a payment is successfully POSTED, automatically queue a WhatsApp payment confirmation when WhatsApp confirmations are enabled and a valid recipient exists.

Confirmation must be based only on committed payment/receipt data.

Include template parameters such as:

- Student name
- Receipt number
- Payment date
- Amount received
- Payment Mode
- optional transaction/reference number
- remaining total outstanding after payment
- Institute name

Example semantic message:

`Payment received for {{student_name}}. Amount: {{amount}} via {{payment_mode}}. Receipt: {{receipt_no}}. Remaining outstanding: {{remaining_outstanding}}. Thank you — {{institute_name}}.`

Do not mark the confirmation as sent merely because it was queued.

## 10. Reversal messaging

When a posted payment is reversed, do not delete or alter the earlier WhatsApp confirmation audit record.

Optionally queue a distinct reversal notification if enabled/configured, containing:

- original receipt number
- reversed amount
- reversal date
- safe reversal reason where appropriate
- corrected outstanding balance

This is optional for v1, but the data model must not make it impossible later.

## 11. WhatsApp configuration and secrets

Use server-side environment variables for Meta credentials when actual delivery is enabled, for example conceptually:

- WhatsApp/Meta access token
- phone-number ID
- business-account ID if needed by integration
- webhook verification secret/token if callbacks are later implemented

Do not expose credentials through `NEXT_PUBLIC_*` variables.

Do not commit secrets.

Do not log access tokens or complete sensitive provider payloads unnecessarily.

If credentials are absent, the Fees module must still work fully for accounting. Messaging UI should show `WhatsApp not configured` / queued-disabled state clearly rather than failing financial operations.

## 12. WhatsApp delivery service boundary

Create a server-only provider abstraction, for example:

`features/fees/services/whatsapp-service.ts`

Responsibilities:

- validate configuration;
- render mapped approved template parameters;
- invoke the provider only server-side;
- return sanitized provider result;
- update outbox status;
- never expose provider tokens to the browser.

Keep Meta-specific code behind an interface so another WhatsApp provider could be supported later without rewriting fee accounting.

## 13. UI requirements

Fees Dashboard:

- overdue dues count/amount
- WhatsApp reminder status summary if implemented
- link to overdue dues

Collect Payment:

- Payment Mode required
- after successful posting, show receipt first
- separately show WhatsApp confirmation state:
  - queued
  - sent
  - not configured
  - no recipient
  - failed/retry available

Outstanding / Student Fees:

- overdue rows indicate reminder eligibility
- show last reminder date/status where available
- manual `Send WhatsApp Reminder` action

Payment History / Receipt:

- show Payment Mode
- show WhatsApp confirmation status where available
- allow retry message delivery without reposting/recreating the payment

## 14. Reports

Collection report must continue to support Payment Mode filter/breakdown from the live `payment_modes` master.

Add a lightweight reminder-delivery report/filter if the outbox architecture makes it practical:

- date range
- message type (`fee_reminder`, `payment_confirmation`)
- status
- Student

Do not turn this into a full communications analytics module.

## 15. Security / RLS

Any messaging/outbox/config table must have RLS enabled.

Administrators:

- same-institute read/manage only.

Students/Parents:

- no direct mutation of delivery jobs;
- read of message status is optional and should only be own/linked-child if exposed.

Provider-delivery workers must use a trusted server context and still scope updates to the exact queued record.

Anonymous access denied.

## 16. Required tests

Add tests for at least:

### Payment Mode
- posting rejects missing/null mode;
- posting rejects inactive mode;
- posting rejects other-institute mode;
- posted payment/receipt preserves selected mode;
- report breakdown uses correct mode.

### Reminder eligibility
- no reminder before configured date;
- reminder becomes eligible after due date + grace days;
- fully paid due is skipped;
- partially paid due uses remaining outstanding;
- waived/cancelled due skipped;
- duplicate scheduler run does not duplicate same reminder cycle;
- other-institute due cannot be queued/read.

### Confirmation
- posted payment queues exactly one confirmation when enabled;
- repeated service retry does not create a second confirmation job;
- failed WhatsApp delivery does not alter payment, allocations, receipt, or balance;
- reversed payment remains historically linked to original confirmation.

### Recipient isolation
- Student A/Parent A cannot cause messages for Student B;
- invalid/missing mobile is handled safely.

## 17. Deferred external-service rule

If Meta WhatsApp Business credentials/templates are not configured during implementation:

- implement the queue/outbox, eligibility logic, provider abstraction, UI states, and tests that do not require a real provider;
- do not invent a successful live send;
- explicitly report live WhatsApp delivery as deferred;
- do not block completion of the accounting Fees module solely because external WhatsApp setup is pending.

## 18. Final report additions

In addition to the main Fees specification's final report, report:

1. Payment Mode implementation and validation.
2. Reminder configuration model.
3. Reminder eligibility rule and default/grace behavior.
4. Scheduler/idempotency strategy.
5. Manual reminder workflow.
6. Payment-confirmation queue behavior.
7. Recipient-selection behavior.
8. Outbox/notification tables reused or added.
9. Meta provider abstraction/configuration state.
10. Live WhatsApp test status (performed or deferred).
11. Proof that WhatsApp failure cannot corrupt or roll back a posted fee payment.

Read this addendum completely before implementing Fees.