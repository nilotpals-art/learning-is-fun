# Learning Is Fun ERP
## Codex Addendum
### Learning Planner — India Holidays Integration

This addendum extends the existing Learning Planner implementation. It is mandatory when working on the planner calendar after this point.

Do not start Examinations. Preserve existing Attendance, Learning Planner, Practice Work, Fees, Student Dashboard, Dashboard/Navigation, and Authentication behavior. Do not commit or push unless explicitly instructed.

## Goal

The Learning Planner calendar must display Indian public holidays and optionally state/UT-specific holidays while preserving the institute's own holiday logic used by schedule materialization.

## Source of truth and provider strategy

Prefer authoritative Government of India holiday data where practical. The National Portal of India publishes central holidays and State/UT holiday calendars based on government circulars. A provider abstraction may be used if a machine-readable external source is required, but the implementation must not hard-code one commercial API into business logic.

Do not rely on Google Calendar as the authoritative application data source. Google Calendar may be considered only as an optional reference/provider if implementation constraints require it.

Use a server-only `holiday-service` abstraction so the external source can be changed later without rewriting the Learning Planner UI.

## Holiday scopes

Support at minimum:

1. India national / central public holidays.
2. Optional State or Union Territory holidays.
3. Existing institute-defined holidays.
4. Existing branch-specific holidays where supported by the current schema.

The UI should distinguish the source/scope, for example:

- India Holiday
- State Holiday
- Institute Holiday
- Branch Holiday

## Institute settings

Add or reuse a safe configuration source for:

- country code: default `IN`
- state / UT: optional
- include India national holidays: default true
- include state holidays: configurable

Do not infer a state from browser geolocation. The institute administrator must control the State/UT setting.

If there is no appropriate institute-settings table, use the smallest compatible settings extension following repository conventions. Do not create a large generic settings subsystem solely for this feature.

## External fetch behavior

Holiday fetching must be server-side only.

Requirements:

- fetch by year;
- cache/revalidate for a reasonable period, e.g. 12–24 hours;
- use an explicit timeout;
- sanitize and validate returned date/name/type values;
- deduplicate same-date/same-name results;
- fail gracefully if the external provider is unavailable;
- never make the entire Learning Planner calendar fail because holiday fetching failed.

Do not store external holidays in Supabase merely for display unless persistence is needed for schedule suppression or administrator overrides.

## Calendar display

Merge holiday records into the Learning Planner calendar read model.

Holiday entries must be read-only external/calendar decorations unless promoted to an institute holiday by an Administrator.

Display requirements:

- holiday name;
- date;
- national/state/institute/branch scope;
- visually distinct treatment from classes/events;
- no edit/reschedule controls on external government holidays;
- mobile and desktop support.

Avoid duplicate rendering when an institute holiday already exists for the same date/name.

## Schedule materialization behavior

Current Module 06B behavior already suppresses generated schedule events for institute-wide or matching-branch all-day holidays stored in the ERP.

Do NOT silently change this behavior so every externally fetched holiday automatically cancels classes.

Instead implement a clear policy:

### Display-only external holidays

By default, fetched India/state holidays appear on the calendar but do not alter generated schedules unless they are recognized by the institute's holiday policy.

### Holiday suppression option

Administrator must be able to choose whether configured national/state holidays should suppress recurring schedule generation.

If automatic suppression is enabled, do not make generation depend on a live external API call inside the transactional materialization RPC.

Instead synchronize/import the applicable holiday dates into the existing durable institute/branch holiday model or an equivalent durable cache before materialization.

This preserves deterministic schedule generation and protects it from provider outages.

## Suggested workflow

Learning Planner -> Holiday Settings

Administrator can choose:

- Show India National Holidays: ON/OFF
- State / UT: dropdown
- Show State Holidays: ON/OFF
- Treat selected public holidays as non-working days: ON/OFF

Optional actions:

- Preview holidays for selected year
- Import/sync holidays into institute holiday calendar
- Add institute-specific holiday
- Exclude/override a fetched holiday if the institute operates that day

## Overrides

Support institute-level override semantics without mutating the external source record.

Examples:

- `observed_as_holiday = false` for an external holiday the institute remains open on.
- custom institute holiday on a date not present in the external source.

Prefer durable override records keyed by institute + date + normalized external holiday identity if persistence is required.

## Student dashboard / schedule integration

The Student `My Schedule` and dashboard Upcoming/Today views should not show holidays as class events.

Where useful, show a small holiday indicator/banner such as:

`Holiday: Independence Day`

Do not count a holiday as a scheduled class, Practice Work, or attendance event.

## Security

Holiday provider credentials, if any, must be server-only environment variables.

Do not expose provider API keys to Client Components.

Only Administrator roles may change holiday settings/import/overrides.

Students may read the resulting holiday display relevant to their institute/branch but cannot mutate it.

## Testing

Cover at minimum:

- national holiday fetch/normalization;
- optional state holiday behavior;
- duplicate suppression;
- provider timeout/failure fallback;
- calendar merge ordering;
- Administrator-only settings mutation;
- Student read-only holiday display;
- external display-only holidays do not suppress materialization by default;
- imported/observed holidays do suppress generation using the existing deterministic holiday logic;
- institute override can keep a normally fetched holiday as a working day;
- no cross-institute holiday leakage.

Run:

```powershell
npm.cmd run lint
npx.cmd next typegen
npx.cmd tsc --noEmit
npm.cmd run build
git diff --check
```

Do not commit or push.
