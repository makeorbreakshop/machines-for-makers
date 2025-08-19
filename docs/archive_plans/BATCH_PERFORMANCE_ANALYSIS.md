# Batch Job Performance Analysis

## Issue Summary

The batch jobs are exhibiting inconsistent performance, with many batches taking 2-4 hours to complete when they should take around 30-45 minutes based on the implemented optimizations.

## Key Findings

### 1. Cron Job vs Manual Performance Discrepancy

**Cron Job Configuration** (in `/app/api/cron/update-prices/route.ts`):
- `days_threshold: 7` (only updates machines older than 7 days)
- `limit: 50` (conservative limit)
- `max_workers: 3` (conservative concurrency)

**Manual Batch Configuration**:
- `days_threshold: 0` (forces update of all machines)
- `limit: null` (no limit)
- `max_workers: null` (defaults to 5 from config)

### 2. Actual Batch Performance Data

Looking at recent batches (July-August 2025):
- **Fast batches**: 7-15 seconds per machine (1,000-2,300 total seconds)
- **Slow batches**: 80-94 seconds per machine (12,000-15,000 total seconds)
- **Pattern**: Batches starting around 7:00 UTC are consistently slower

### 3. Critical Issue: No Cron Batches Running

**The cron job is NOT actually running!** Evidence:
- No batches found with `days_threshold=7` and `limit=50` (cron parameters)
- All batches show `days_threshold=0` (manual trigger parameter)
- All batches have `max_workers=null` instead of `3` (cron setting)

### 4. Performance Bottlenecks Identified

1. **Missing max_workers parameter**: When `max_workers=null`, it defaults to 5 concurrent workers
2. **No worker limiting on large batches**: The 7 AM batches process 150-165 machines with full concurrency
3. **Time-based pattern**: Batches at 7:00 UTC consistently take longer (possibly due to external API rate limiting)

## Root Causes

### 1. Cron Job Misconfiguration
The Vercel cron is scheduled for `0 0 * * *` (midnight UTC) but:
- No batches are running at midnight
- All large batches start around 7:00 UTC
- This suggests either:
  - The cron is failing silently
  - There's a timezone issue
  - The cron is disabled or misconfigured

### 2. Manual Trigger Overuse
All current batches appear to be manually triggered, which:
- Uses more aggressive parameters (`days_threshold=0`)
- Processes ALL machines instead of just outdated ones
- Creates unnecessary load

### 3. Missing Concurrency Control
The slow batches (94 seconds/machine) show classic signs of:
- Rate limiting from external APIs (Scrapfly)
- Resource contention with 5 concurrent workers
- No backoff or retry logic for rate-limited requests

## Recommendations

### 1. Fix the Cron Job
```typescript
// Update vercel.json to run at 7 AM UTC (when manual batches currently run)
"crons": [
  {
    "path": "/api/cron/update-prices?secret=$CRON_SECRET",
    "schedule": "0 7 * * *"  // 7 AM UTC instead of midnight
  }
]
```

### 2. Implement Adaptive Concurrency
```python
# In price_service.py, add rate limit detection
async def _process_machines_concurrently(self, machines, batch_id, results, max_workers):
    # Start with configured workers
    effective_workers = max_workers
    
    # Monitor response times and adjust
    if average_response_time > 30:  # seconds
        effective_workers = max(1, effective_workers - 1)
        logger.warning(f"Reducing workers to {effective_workers} due to slow responses")
```

### 3. Add Batch Type Tracking
```python
# Track whether batch is cron or manual
batch_metadata = {
    "trigger_type": "cron" if days_threshold == 7 and limit == 50 else "manual",
    "max_workers": max_workers,
    "machine_ids": machine_ids,
    "limit": limit
}
```

### 4. Implement Smart Scheduling
- Run cron jobs during off-peak hours for external APIs
- Use smaller batch sizes during peak hours
- Implement exponential backoff for rate-limited requests

### 5. Monitor External API Performance
Add logging to track:
- Scrapfly API response times
- Rate limit headers
- Error rates by hour of day

## Immediate Actions

1. **Verify Cron Status**: Check Vercel dashboard for cron job errors
2. **Update Cron Schedule**: Change to 7 AM UTC to match current manual pattern
3. **Add Monitoring**: Log batch trigger type and performance metrics
4. **Test Conservative Settings**: Run manual batch with cron parameters to verify performance

## Expected Outcomes

With these fixes:
- Cron jobs should run reliably with conservative settings
- Batch duration should be predictable (30-45 minutes for 50 machines)
- Manual batches can use aggressive settings when needed
- Clear distinction between scheduled and manual updates