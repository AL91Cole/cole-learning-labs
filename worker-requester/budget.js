/** Shared anonymous admission ledger. This limits this feature's starts; it is
 * not an account-wide provider billing cap. Re-review token/pricing assumptions
 * and other account usage separately before activation. */
const RESERVATION_NEURONS=25;
const BUCKET_CAP_NEURONS=6000;
const DAY_MS=86_400_000;

// Reserve 25 in BOTH today's and tomorrow's UTC bucket before any inference.
// This conservatively covers work crossing one UTC boundary. The MATERIALIZED
// capacity CTE makes the entire two-row admission decision before either write;
// a full bucket must not gradually consume the other bucket on rejected calls.
// One D1 write statement runs on the shared primary, without a read/check race.
// Each bucket is capped at 6000. Capacity varies with the preceding day's work:
// an initially empty window allows 240 starts; steady daily use is about 120.
// Never refund, reset at deploy, or delete/restore this ledger while AI is live.
export const REQUESTER_BUDGET_RESERVATION_SQL=`
WITH window_days(day) AS MATERIALIZED (
  SELECT date('now') UNION ALL SELECT date('now', '+1 day')
), capacity(ok) AS MATERIALIZED (
  SELECT 1 WHERE NOT EXISTS (
    SELECT 1 FROM requester_ai_budget AS budget
    JOIN window_days ON window_days.day = budget.day
    WHERE budget.reserved_neurons > 5975
  )
)
INSERT INTO requester_ai_budget(day, reserved_neurons)
SELECT window_days.day, 25 FROM window_days CROSS JOIN capacity WHERE capacity.ok = 1
ON CONFLICT(day) DO UPDATE
SET reserved_neurons = requester_ai_budget.reserved_neurons + excluded.reserved_neurons
WHERE requester_ai_budget.reserved_neurons + excluded.reserved_neurons <= 6000
RETURNING day, reserved_neurons`;

function validDay(day) {
  if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/u.test(day))return false;
  const time=Date.parse(day+'T00:00:00.000Z');
  return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===day;
}
function validWindow(day,nextDay) {
  return validDay(day)&&validDay(nextDay)&&Date.parse(nextDay+'T00:00:00.000Z')-Date.parse(day+'T00:00:00.000Z')===DAY_MS;
}
const unavailable=()=>({ok:false,error:'requester_budget_unavailable'});

/** Call exactly once per attempted inference, then check the returned day again
 * immediately before invoking AI. Unknown/failed commits remain consumed. This
 * function never retries or refunds and never sends any question or identity. */
export async function reserveRequesterBudget(db) {
  try{
    if(typeof db?.prepare!=='function')return unavailable();
    const result=await db.prepare(REQUESTER_BUDGET_RESERVATION_SQL).all();
    if(result?.success!==true||!Array.isArray(result.results))return unavailable();
    if(result.results.length===0)return {ok:false,error:'requester_budget_exhausted'};
    if(result.results.length!==2)return unavailable();
    const rows=[...result.results].sort((a,b)=>String(a?.day).localeCompare(String(b?.day)));
    for(const row of rows){
      if(!row||typeof row!=='object'||!Object.hasOwn(row,'day')||!Object.hasOwn(row,'reserved_neurons')||
        !Number.isSafeInteger(row.reserved_neurons)||row.reserved_neurons<RESERVATION_NEURONS||
        row.reserved_neurons>BUCKET_CAP_NEURONS||row.reserved_neurons%RESERVATION_NEURONS!==0)return unavailable();
    }
    const [day,nextDay]=rows.map(row=>row.day);
    if(!validWindow(day,nextDay))return unavailable();
    return {ok:true,day,nextDay};
  }catch{
    // An exception may follow a successful commit. Do not retry, expose errors,
    // assume nothing was charged, refund anything, or permit uncounted AI work.
    return unavailable();
  }
}

/** Recheck immediately before AI, after all awaited work. A reservation from an
 * earlier UTC day is spent but cannot authorize a later-day inference start. */
export function requesterBudgetReservationCurrent(reservation) {
  try{
    return reservation?.ok===true&&validWindow(reservation.day,reservation.nextDay)&&
      reservation.day===new Date(Date.now()).toISOString().slice(0,10);
  }catch{return false;}
}
