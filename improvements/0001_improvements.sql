-- Separate aggregate-only database. No event, summary, learner or session rows.
CREATE TABLE IF NOT EXISTS improvement_counts (
  scope TEXT NOT NULL CHECK(scope IN ('month','day','minute')),
  period TEXT NOT NULL,
  release TEXT NOT NULL CHECK(length(release) BETWEEN 1 AND 48),
  activity TEXT NOT NULL CHECK(length(activity) BETWEEN 1 AND 64),
  metric TEXT NOT NULL CHECK(metric IN ('reports','outcome','attempts','issue')),
  bucket TEXT NOT NULL,
  n INTEGER NOT NULL CHECK(typeof(n) = 'integer' AND n > 0 AND n <= CASE scope WHEN 'day' THEN 500 WHEN 'minute' THEN 30 ELSE 50000 END),
  PRIMARY KEY(scope,period,release,activity,metric,bucket),
  CHECK(
    (scope = 'month' AND length(period) = 7 AND period GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'
      AND date(period || '-01') IS NOT NULL AND date(period || '-01') = period || '-01'
      AND release != '*' AND activity != '*'
      AND ((metric = 'reports' AND bucket = 'all')
        OR (metric = 'outcome' AND bucket IN ('finished','needed_help','not_finished','exploring'))
        OR (metric = 'attempts' AND bucket IN ('one','two_or_three','four_plus','not_applicable'))
        OR (metric = 'issue' AND bucket IN ('none','instructions','controls','test_result','display','other'))))
    OR (scope = 'day' AND length(period) = 10 AND date(period) IS NOT NULL AND date(period) = period
      AND release = '*' AND activity = '*' AND metric = 'reports' AND bucket = 'all')
    OR (scope = 'minute' AND length(period) = 16 AND datetime(period) IS NOT NULL
      AND strftime('%Y-%m-%dT%H:%M',period) = period
      AND release = '*' AND activity = '*' AND metric = 'reports' AND bucket = 'all')
  )
) WITHOUT ROWID;
