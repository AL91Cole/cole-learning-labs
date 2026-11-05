-- Aggregate counters only. No row for an individual attempt or receipt.
CREATE TABLE IF NOT EXISTS lab_telemetry_counts (
  event_date TEXT NOT NULL CHECK(length(event_date)=10),
  lab_id TEXT NOT NULL CHECK(length(lab_id) BETWEEN 2 AND 8),
  event_type TEXT NOT NULL CHECK(event_type IN ('start','complete','abandon')),
  duration_band TEXT NOT NULL CHECK(duration_band IN ('under1m','1to5m','5to15m','15to30m','30to60m','60mplus')),
  score_band TEXT NOT NULL CHECK(score_band IN ('none','0to49','50to69','70to89','90to99','100')),
  step_band TEXT NOT NULL CHECK(step_band IN ('1','2to3','4plus')),
  n INTEGER NOT NULL CHECK(typeof(n)='integer' AND n BETWEEN 1 AND 5000),
  PRIMARY KEY(event_date,lab_id,event_type,duration_band,score_band,step_band)
) WITHOUT ROWID;
