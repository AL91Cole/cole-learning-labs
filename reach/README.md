# Aggregate activity reach — activation prepared, currently off

The owner confirmed the required privacy/provider/retention reviews on November
2, 2026 and requested activation preparation for review. This records that
confirmation; it is not independent legal certification. **No live activation,
database provisioning, or retention deployment has occurred in this change.**
The existing classroom and self-reported improvement gates are unchanged.

## What the counts mean

- `start`: a visible page received a trusted browser interaction with an
  activity control. Merely loading a URL, opening instructions, or pressing
  reset is insufficient.
- `complete`: the corresponding real controller finished its existing checks,
  after a start was sent in the same active page visit. Investigations require closing
  their verified investigation; quests require all eight lessons; elementary
  activities require all three challenges; Inbox Defender requires five rounds;
  beginner courses require the saved explanation; games require their modeled
  success result.
- All 100 bounded activities have fixed codes. Four open-ended tool groups
  (sandbox, network studio, coding studio and practice workbench) count use,
  without inventing a completion criterion.

Each activity can add at most one start and one completion per active page visit.
Leaving or reloading can add more; another person using the same active page may add none.
Completion and start totals are independent monthly signals, not a matched
cohort: month boundaries, privacy choices and failed requests can affect them.
They are **engaged-browser events, not unique people, students, grades, attendance
or independently verified human activity**. No retrospective lab counts can be
reconstructed from old requests: hash navigation and local work were not sent.

Trusted input excludes ordinary fetch-only crawlers and synthetic DOM events.
The client also excludes conventional WebDriver sessions; the receiver rejects
recognized bot user-agent strings and verified bots where Cloudflare supplies
that signal. A browser-driving bot can imitate interaction and user agents can
be forged. These signals reduce obvious automation; they cannot prove humanity.
Global quotas limit abuse, not count integrity. Do not use these data for
individual decisions or claim that all bots have been removed.

## Exact flow and retention

On the canonical HTTPS domains only, the client checks `/api/reach` once. An
unavailable/disabled receiver stops counting. Previews, localhost, private owner
builds, Global Privacy Control and Do Not Track make no request. A user can stop
counting for the page from Privacy. No cookie, browser-storage identifier,
referrer, queue, retry, replay, duration, student input or lab record is sent.

The only POST body is `{version:1,activity:"arcade/garden-rover",metric:"start"}`
(or a permitted activity and `complete`). Extra fields are rejected. The receiver
requires US edge geolocation, fixed same-origin HTTPS, JSON, no credentials,
bounded streaming input and a deadline. It stores no event row or connection
metadata. One atomic SQL statement increments a monthly activity/metric total
and global minute/day admission counters, capped at 100/minute and 5,000/day.
Cloudflare still processes ordinary connection/security metadata, including IP
addresses; application aggregates do not establish anonymous transport.

Retain only the current and preceding two calendar months. Global quota periods
retain today/yesterday and the last two UTC minutes. Collection first runs
cleanup; the separately scheduled daily worker also deletes expired rows even
when collection is off. Database recovery copies and downloaded exports require
the separately reviewed provider/owner deletion controls. The owner report
suppresses totals below ten, rounds down to five and uses completed retained
months. Thresholds are event totals, not a proof of anonymity or distinct people.

## Activation review and operator steps

1. Review this PR and its preview before merging. The two production variables
   `REACH_ENABLED` and `REACH_RETENTION_VERIFIED` are currently `false`, including
   in the repository's production configuration. Availability fails closed
   before any database access until both are `true`.
2. Provision a **separate** D1 database and apply `reach/0001_reach.sql`. Bind it
   as `LAB_REACH` to production Pages only. Do not reuse classroom or improvement
   databases. Leave preview bindings empty and both preview flags false.
3. Configure that same database in `reach/wrangler.retention.jsonc`. Deploy the
   cleanup worker with no public URL or route. Verify the daily cron and deletion
   of fictional expired rows. A configured schedule alone is not verification.
4. Reconfirm the reviewed provider logging/recovery, access, purpose and export
   retention controls. The public Privacy page explains fields, limits, signals,
   opt-out and the inability to remove an unlinked contribution individually.
5. After explicit owner approval of the preview and activation, enable the two
   production flags. Verify `/api/reach` availability from an eligible US browser,
   use a fictional activity, confirm only aggregate rows, and verify stopping
   counts. Record the activation revision and cron evidence. No step here opens
   classroom records or the optional self-reported improvement collector.
6. To stop new collection, set `REACH_ENABLED=false`. Keep the cleanup schedule
   running for existing counts. With these fields, no visitor's contribution can
   be identified or individually recalled. Contact/provider-held data rights
   remain separate responsibilities.

Export only `scope,period,activity,metric,n` from the separate aggregate table to
a **local** JSON file. Never include provider request logs. Run:

```
node reach/report.mjs path/to/counts.json path/to/reach-report.csv
```

The tool refuses to overwrite an existing report and does not contact a service.
Keep real exports outside Git and delete them on the approved schedule. No
public analytics read endpoint is added. This feature does not enable or depend
on the separately configured Cloudflare RUM JavaScript beacon.

## Bot verification

POST counts now require server-verified Turnstile proof before D1 access.
Configure the invisible widget and encrypted production Pages secret described
in [the Turnstile guide](../docs/TURNSTILE.md). Do not enable collection to test
Turnstile. This additional requirement does not replace the privacy, retention,
database, scheduled deletion, or separate activation checks in this guide.
