-- Resume point for incremental, time-budgeted order sync.
ALTER TABLE "Shop" ADD COLUMN "receiptsCursor" TIMESTAMP(3);

-- Release anything left stuck by a run that was killed by the platform timeout
-- before it could record its outcome.
UPDATE "SyncJob"
SET status = 'FAILED', message = 'Timed out before finishing', "finishedAt" = CURRENT_TIMESTAMP
WHERE status = 'RUNNING' AND "startedAt" < NOW() - INTERVAL '6 minutes';

UPDATE "Shop" SET status = 'CONNECTED' WHERE status = 'SYNCING';
