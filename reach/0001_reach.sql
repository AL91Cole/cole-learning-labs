CREATE TABLE IF NOT EXISTS reach_counts (
  scope TEXT NOT NULL CHECK(scope IN ('month','day','minute')),
  period TEXT NOT NULL CHECK(length(period) BETWEEN 7 AND 16),
  activity TEXT NOT NULL CHECK(length(activity) BETWEEN 1 AND 64),
  metric TEXT NOT NULL CHECK(metric IN ('start','complete','admissions')),
  n INTEGER NOT NULL CHECK(typeof(n)='integer' AND n BETWEEN 1 AND 1000000),
  PRIMARY KEY(scope,period,activity,metric)
) WITHOUT ROWID;
