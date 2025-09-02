# Click Tracking System Test Suite

This test suite provides comprehensive testing for the click tracking system to ensure 99%+ click capture rate and reliable performance.

## Overview

The test suite includes:
- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test the complete click flow
- **Load Testing**: Test performance under high load
- **Monitoring**: Continuous validation of system health

## Quick Start

```bash
cd tests
npm install
npm test
```

## Test Types

### 1. Unit & Integration Tests (`click-tracking.test.js`)

Tests the core functionality of the click tracking system:

```bash
npm test                    # Run all tests
npm run test:watch          # Run in watch mode
npm run test:coverage       # Run with coverage report
```

**What it tests:**
- ✅ Successful redirects with click logging
- ✅ Error handling when logging fails
- ✅ Bot detection accuracy
- ✅ Rate limiting functionality
- ✅ UTM parameter handling
- ✅ Performance within acceptable limits

### 2. Load Testing (`load-testing.js`)

Tests system performance under various load conditions:

```bash
# Local testing
npm run load-test                              # 100 requests, 10 concurrent
node load-testing.js http://localhost:3000 50 1000  # Custom parameters

# Production testing
npm run load-test:production                   # 500 requests, 20 concurrent
```

**Load test parameters:**
- `baseUrl`: Target server URL
- `concurrency`: Number of concurrent connections
- `totalRequests`: Total requests to make
- `rampUpTime`: Time to gradually increase load

**Performance benchmarks:**
- ✅ Success rate > 99.5%
- ✅ Average response time < 200ms
- ✅ 95th percentile < 500ms

### 3. Monitoring & Validation (`monitoring-validator.js`)

Continuous monitoring to ensure click tracking reliability:

```bash
# Run continuous monitoring (Ctrl+C to stop)
npm run monitor

# Production monitoring with stricter thresholds
npm run monitor:production

# Single validation test
npm run validate

# Health check only
npm run health-check
```

**Monitoring features:**
- 🔄 Continuous validation every 30-60 seconds
- 📊 Real-time success rate tracking
- 🚨 Automatic alerts when success rate drops below threshold
- 🧹 Automatic cleanup of test data
- 📈 System health reporting

## Test Results Interpretation

### Load Test Results

```
LOAD TEST RESULTS
==========================================
Overall Performance:
  Total Requests: 1000
  Successful: 998 (99.80%)
  Failed: 2
  Total Time: 45.23s
  Requests/sec: 22.11

Response Times:
  Average: 85.32ms
  95th Percentile: 156.78ms
  99th Percentile: 234.12ms

Performance Assessment:
  ✅ EXCELLENT: 99.80% success rate
  ✅ EXCELLENT: 85.32ms average response time
  ✅ EXCELLENT: 156.78ms 95th percentile
```

### Monitoring Results

```
Batch Results: 5/5 successful (100.0%)
Average redirect time: 67.43ms

System Health: {
  "healthy": true,
  "recentActivity": {
    "totalClicks": 245,
    "humanClicks": 198,
    "botClicks": 47,
    "timeWindow": "1 hour"
  },
  "validationStats": {
    "totalTests": 150,
    "successRate": "99.33%",
    "lastAlert": null
  }
}
```

## Production Monitoring

For production environments, run continuous monitoring:

```bash
# Start monitoring as a background service
nohup npm run monitor:production > monitoring.log 2>&1 &

# Check monitoring status
tail -f monitoring.log
```

## Troubleshooting

### Common Issues

**Test failures in development:**
```bash
# Ensure development server is running
npm run dev

# Check Supabase configuration
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

**Load test failures:**
```bash
# Check if rate limiting is too aggressive
node load-testing.js http://localhost:3000 5 50  # Reduce load

# Verify server capacity
htop  # Check CPU/memory usage during tests
```

**Monitoring alerts:**
```bash
# Check recent system health
npm run health-check

# Run single validation to debug
npm run validate
```

### Performance Optimization

If load tests show performance issues:

1. **Check database performance**: Ensure proper indexing on `link_clicks` table
2. **Review rate limiting**: Adjust limits in `/app/go/[slug]/route.ts`
3. **Monitor server resources**: Check CPU, memory, and database connections
4. **Consider caching**: Increase `CACHE_TTL` for frequently accessed links

## Test Coverage

The test suite covers:

- ✅ **Route handlers**: All GET request scenarios
- ✅ **Click logging**: Synchronous logging function
- ✅ **UTM parameters**: Append and preserve logic
- ✅ **Bot detection**: Pattern matching accuracy
- ✅ **Rate limiting**: IP-based throttling
- ✅ **Error handling**: Database failures and network issues
- ✅ **Performance**: Response times under load
- ✅ **Data integrity**: Click capture rate validation

## Next Steps

1. **Set up monitoring** in production if needed
2. **Add more test scenarios** based on real-world usage patterns
3. **Create simple dashboard** for test results if desired

## Contributing

When adding new features to the click tracking system:

1. Add corresponding unit tests to `click-tracking.test.js`
2. Update load test scenarios if needed
3. Update this README with new test instructions

---

**Remember**: The goal is 99%+ click capture rate with acceptable performance. These tests help ensure we never lose valuable marketing attribution data.