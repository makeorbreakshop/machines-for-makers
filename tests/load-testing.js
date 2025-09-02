/**
 * Load Testing Script for Click Tracking System
 * 
 * Tests the system under various load conditions to ensure
 * reliability and performance at scale
 */

const https = require('https');
const http = require('http');
const { performance } = require('perf_hooks');

class LoadTester {
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl;
    this.concurrency = options.concurrency || 10;
    this.totalRequests = options.totalRequests || 1000;
    this.rampUpTime = options.rampUpTime || 5000; // 5 seconds
    this.testSlugs = options.testSlugs || ['test-load-1', 'test-load-2', 'test-load-3'];
    
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      redirectTimes: [],
      clickTrackingFailures: 0
    };
  }

  async makeRequest(slug) {
    const startTime = performance.now();
    
    return new Promise((resolve) => {
      const url = `${this.baseUrl}/go/${slug}?utm_source=load-test&utm_medium=automated&test_id=${Date.now()}`;
      const client = this.baseUrl.startsWith('https:') ? https : http;
      
      const req = client.get(url, {
        headers: {
          'User-Agent': 'LoadTester/1.0 (Automated Testing)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 10000
      }, (res) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        this.results.totalRequests++;
        this.results.responseTimes.push(responseTime);
        
        if (res.statusCode === 302 || res.statusCode === 301) {
          this.results.successfulRequests++;
          this.results.redirectTimes.push(responseTime);
          
          // Check if redirect happened quickly (indicates successful flow)
          if (responseTime > 1000) {
            console.warn(`Slow redirect: ${responseTime}ms for slug ${slug}`);
          }
        } else {
          this.results.failedRequests++;
          this.results.errors.push({
            slug,
            statusCode: res.statusCode,
            responseTime
          });
        }
        
        resolve({
          success: res.statusCode === 302 || res.statusCode === 301,
          responseTime,
          statusCode: res.statusCode
        });
      });
      
      req.on('error', (error) => {
        const endTime = performance.now();
        this.results.totalRequests++;
        this.results.failedRequests++;
        this.results.errors.push({
          slug,
          error: error.message,
          responseTime: endTime - startTime
        });
        resolve({ success: false, error: error.message });
      });
      
      req.on('timeout', () => {
        const endTime = performance.now();
        this.results.totalRequests++;
        this.results.failedRequests++;
        this.results.errors.push({
          slug,
          error: 'Request timeout',
          responseTime: endTime - startTime
        });
        req.destroy();
        resolve({ success: false, error: 'timeout' });
      });
    });
  }

  async runConcurrentTest() {
    console.log(`Starting load test: ${this.totalRequests} requests with ${this.concurrency} concurrent connections`);
    console.log(`Target URL: ${this.baseUrl}`);
    console.log(`Test slugs: ${this.testSlugs.join(', ')}`);
    console.log(`Ramp-up time: ${this.rampUpTime}ms\n`);

    const startTime = performance.now();
    const requestsPerBatch = Math.ceil(this.totalRequests / this.concurrency);
    const batches = [];

    for (let i = 0; i < this.concurrency; i++) {
      const batch = [];
      for (let j = 0; j < requestsPerBatch && (i * requestsPerBatch + j) < this.totalRequests; j++) {
        const slug = this.testSlugs[Math.floor(Math.random() * this.testSlugs.length)];
        batch.push(this.makeRequest(slug));
      }
      batches.push(batch);
    }

    // Execute batches with ramp-up
    const batchPromises = batches.map((batch, index) => {
      const delay = (this.rampUpTime / this.concurrency) * index;
      return new Promise(resolve => {
        setTimeout(async () => {
          console.log(`Starting batch ${index + 1}/${this.concurrency} with ${batch.length} requests`);
          const results = await Promise.all(batch);
          resolve(results);
        }, delay);
      });
    });

    await Promise.all(batchPromises);
    const endTime = performance.now();
    
    this.generateReport(endTime - startTime);
  }

  generateReport(totalTime) {
    const avgResponseTime = this.results.responseTimes.reduce((a, b) => a + b, 0) / this.results.responseTimes.length;
    const p95ResponseTime = this.results.responseTimes.sort((a, b) => a - b)[Math.floor(this.results.responseTimes.length * 0.95)];
    const p99ResponseTime = this.results.responseTimes.sort((a, b) => a - b)[Math.floor(this.results.responseTimes.length * 0.99)];
    const requestsPerSecond = this.results.totalRequests / (totalTime / 1000);
    const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;

    console.log('\n' + '='.repeat(60));
    console.log('LOAD TEST RESULTS');
    console.log('='.repeat(60));
    
    console.log(`\nOverall Performance:`);
    console.log(`  Total Requests: ${this.results.totalRequests}`);
    console.log(`  Successful: ${this.results.successfulRequests} (${successRate.toFixed(2)}%)`);
    console.log(`  Failed: ${this.results.failedRequests}`);
    console.log(`  Total Time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`  Requests/sec: ${requestsPerSecond.toFixed(2)}`);

    console.log(`\nResponse Times:`);
    console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  95th Percentile: ${p95ResponseTime.toFixed(2)}ms`);
    console.log(`  99th Percentile: ${p99ResponseTime.toFixed(2)}ms`);
    console.log(`  Min: ${Math.min(...this.results.responseTimes).toFixed(2)}ms`);
    console.log(`  Max: ${Math.max(...this.results.responseTimes).toFixed(2)}ms`);

    if (this.results.redirectTimes.length > 0) {
      const avgRedirectTime = this.results.redirectTimes.reduce((a, b) => a + b, 0) / this.results.redirectTimes.length;
      console.log(`\nRedirect Performance:`);
      console.log(`  Average Redirect Time: ${avgRedirectTime.toFixed(2)}ms`);
      console.log(`  Redirects >100ms: ${this.results.redirectTimes.filter(t => t > 100).length}`);
      console.log(`  Redirects >500ms: ${this.results.redirectTimes.filter(t => t > 500).length}`);
    }

    console.log(`\nPerformance Assessment:`);
    if (successRate >= 99.5) {
      console.log(`  ✅ EXCELLENT: ${successRate.toFixed(2)}% success rate`);
    } else if (successRate >= 95) {
      console.log(`  ⚠️  GOOD: ${successRate.toFixed(2)}% success rate`);
    } else {
      console.log(`  ❌ POOR: ${successRate.toFixed(2)}% success rate - Investigation needed`);
    }

    if (avgResponseTime <= 50) {
      console.log(`  ✅ EXCELLENT: ${avgResponseTime.toFixed(2)}ms average response time`);
    } else if (avgResponseTime <= 200) {
      console.log(`  ⚠️  ACCEPTABLE: ${avgResponseTime.toFixed(2)}ms average response time`);
    } else {
      console.log(`  ❌ SLOW: ${avgResponseTime.toFixed(2)}ms average response time - Optimization needed`);
    }

    if (p95ResponseTime <= 100) {
      console.log(`  ✅ EXCELLENT: ${p95ResponseTime.toFixed(2)}ms 95th percentile`);
    } else if (p95ResponseTime <= 500) {
      console.log(`  ⚠️  ACCEPTABLE: ${p95ResponseTime.toFixed(2)}ms 95th percentile`);
    } else {
      console.log(`  ❌ POOR: ${p95ResponseTime.toFixed(2)}ms 95th percentile - Performance issues`);
    }

    if (this.results.errors.length > 0) {
      console.log(`\nErrors:`);
      const errorSummary = {};
      this.results.errors.forEach(error => {
        const key = error.error || `HTTP ${error.statusCode}`;
        errorSummary[key] = (errorSummary[key] || 0) + 1;
      });
      
      Object.entries(errorSummary).forEach(([error, count]) => {
        console.log(`  ${error}: ${count} occurrences`);
      });
      
      if (this.results.errors.length <= 5) {
        console.log(`\nFirst few errors:`);
        this.results.errors.slice(0, 5).forEach((error, i) => {
          console.log(`  ${i + 1}. Slug: ${error.slug}, Error: ${error.error || error.statusCode}, Time: ${error.responseTime?.toFixed(2)}ms`);
        });
      }
    }

    console.log('\n' + '='.repeat(60));
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'http://localhost:3000';
  const concurrency = parseInt(args[1]) || 10;
  const totalRequests = parseInt(args[2]) || 100;

  console.log('Click Tracking Load Tester');
  console.log('Usage: node load-testing.js [baseUrl] [concurrency] [totalRequests]');
  console.log(`Using: ${baseUrl} with ${concurrency} concurrent connections for ${totalRequests} total requests\n`);

  const tester = new LoadTester(baseUrl, {
    concurrency,
    totalRequests,
    rampUpTime: 2000,
    testSlugs: [
      'test-load-1',
      'test-load-2', 
      'test-load-3',
      'yt-test-video-deals',
      'newsletter-signup'
    ]
  });

  tester.runConcurrentTest().catch(error => {
    console.error('Load test failed:', error);
    process.exit(1);
  });
}

module.exports = LoadTester;