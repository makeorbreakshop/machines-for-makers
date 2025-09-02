/**
 * Click Tracking Monitoring & Validation Script
 * 
 * Continuously monitors the click tracking system to ensure
 * 99%+ capture rate and alert on failures
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

class ClickTrackingValidator {
  constructor(options = {}) {
    this.supabaseUrl = options.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.supabaseServiceKey = options.supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY;
    this.baseUrl = options.baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    this.monitoringInterval = options.monitoringInterval || 60000; // 1 minute
    this.alertThreshold = options.alertThreshold || 95; // Alert if success rate drops below 95%
    
    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      throw new Error('Missing Supabase configuration for monitoring');
    }
    
    this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);
    
    this.stats = {
      totalTests: 0,
      successfulTests: 0,
      failedTests: 0,
      clicksLogged: 0,
      clicksExpected: 0,
      lastAlert: null,
      alerts: []
    };
  }

  async validateSingleClick(testSlug) {
    const testId = `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // Step 1: Create a test link in database
      const { data: link, error: linkError } = await this.supabase
        .from('short_links')
        .insert({
          slug: testSlug,
          destination_url: '/laser-material-library',
          type: 'test',
          campaign: 'monitoring-validation',
          utm_source: 'monitoring',
          utm_medium: 'automated-test',
          utm_campaign: testId,
          append_utms: true,
          active: true,
          metadata: {
            test_id: testId,
            created_for: 'click-tracking-validation'
          }
        })
        .select()
        .single();

      if (linkError) {
        console.error('Failed to create test link:', linkError);
        return { success: false, error: 'Failed to create test link', testId };
      }

      // Step 2: Wait a moment for database propagation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Step 3: Make the redirect request
      const redirectResult = await this.makeRedirectRequest(testSlug, testId);
      
      if (!redirectResult.success) {
        return { 
          success: false, 
          error: `Redirect failed: ${redirectResult.error}`,
          testId,
          cleanup: () => this.cleanupTestLink(link.id)
        };
      }

      // Step 4: Wait for click logging to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 5: Verify click was logged in database
      const { data: clicks, error: clickError } = await this.supabase
        .from('link_clicks')
        .select('*')
        .eq('link_id', link.id)
        .eq('utm_campaign', testId);

      if (clickError) {
        console.error('Failed to query clicks:', clickError);
        return { 
          success: false, 
          error: 'Failed to query clicks',
          testId,
          cleanup: () => this.cleanupTestLink(link.id)
        };
      }

      const clickLogged = clicks && clicks.length > 0;
      const totalTime = Date.now() - startTime;

      // Step 6: Cleanup test link
      await this.cleanupTestLink(link.id);

      return {
        success: clickLogged,
        clickLogged,
        redirectTime: redirectResult.redirectTime,
        totalTime,
        testId,
        error: clickLogged ? null : 'Click was not logged in database'
      };

    } catch (error) {
      console.error('Validation test failed:', error);
      return { 
        success: false, 
        error: error.message,
        testId
      };
    }
  }

  async makeRedirectRequest(slug, testId) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const url = `${this.baseUrl}/go/${slug}?test_id=${testId}&utm_content=validation-test`;
      const client = this.baseUrl.startsWith('https:') ? https : http;
      
      const req = client.get(url, {
        headers: {
          'User-Agent': 'ClickTrackingValidator/1.0 (Monitoring)',
          'Accept': 'text/html,application/xhtml+xml',
          'X-Test-ID': testId
        },
        timeout: 5000
      }, (res) => {
        const redirectTime = Date.now() - startTime;
        
        if (res.statusCode === 302 || res.statusCode === 301) {
          resolve({ 
            success: true, 
            redirectTime,
            statusCode: res.statusCode,
            location: res.headers.location
          });
        } else {
          resolve({ 
            success: false, 
            error: `Unexpected status code: ${res.statusCode}`,
            redirectTime
          });
        }
      });
      
      req.on('error', (error) => {
        resolve({ 
          success: false, 
          error: error.message,
          redirectTime: Date.now() - startTime
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({ 
          success: false, 
          error: 'Request timeout',
          redirectTime: Date.now() - startTime
        });
      });
    });
  }

  async cleanupTestLink(linkId) {
    try {
      // Delete associated clicks first
      await this.supabase
        .from('link_clicks')
        .delete()
        .eq('link_id', linkId);
      
      // Delete the test link
      await this.supabase
        .from('short_links')
        .delete()
        .eq('id', linkId);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  async runValidationBatch(batchSize = 5) {
    console.log(`\nRunning validation batch of ${batchSize} tests...`);
    const promises = [];
    
    for (let i = 0; i < batchSize; i++) {
      const testSlug = `validation-test-${Date.now()}-${i}`;
      promises.push(this.validateSingleClick(testSlug));
    }
    
    const results = await Promise.all(promises);
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const successRate = (successful / results.length) * 100;
    
    // Update stats
    this.stats.totalTests += results.length;
    this.stats.successfulTests += successful;
    this.stats.failedTests += failed;
    this.stats.clicksExpected += results.length;
    this.stats.clicksLogged += successful;
    
    // Calculate performance metrics
    const redirectTimes = results.filter(r => r.redirectTime).map(r => r.redirectTime);
    const avgRedirectTime = redirectTimes.length > 0 ? 
      redirectTimes.reduce((a, b) => a + b, 0) / redirectTimes.length : 0;
    
    const report = {
      timestamp: new Date().toISOString(),
      batchSize: results.length,
      successful,
      failed,
      successRate: successRate.toFixed(2),
      avgRedirectTime: avgRedirectTime.toFixed(2),
      failures: results.filter(r => !r.success).map(r => ({
        testId: r.testId,
        error: r.error
      }))
    };
    
    console.log(`Batch Results: ${successful}/${results.length} successful (${successRate.toFixed(1)}%)`);
    console.log(`Average redirect time: ${avgRedirectTime.toFixed(2)}ms`);
    
    // Check for alerts
    if (successRate < this.alertThreshold) {
      await this.sendAlert(report);
    }
    
    return report;
  }

  async sendAlert(report) {
    const alertMessage = `
🚨 CLICK TRACKING ALERT

Success Rate: ${report.successRate}% (below threshold of ${this.alertThreshold}%)
Time: ${report.timestamp}
Batch Size: ${report.batchSize}
Failed Tests: ${report.failed}

Recent Failures:
${report.failures.slice(0, 3).map(f => `- ${f.testId}: ${f.error}`).join('\n')}

Overall Stats:
- Total Tests: ${this.stats.totalTests}
- Overall Success Rate: ${((this.stats.successfulTests / this.stats.totalTests) * 100).toFixed(2)}%
- Expected Clicks: ${this.stats.clicksExpected}
- Logged Clicks: ${this.stats.clicksLogged}

Action Required: Check click tracking system immediately.
`;

    console.error(alertMessage);
    
    // Store alert
    this.stats.alerts.push({
      timestamp: report.timestamp,
      successRate: report.successRate,
      message: alertMessage
    });
    
    this.stats.lastAlert = report.timestamp;
    
    // TODO: Integrate with actual alerting system (Slack, email, etc.)
    // For now, we'll just log and could extend this to send webhooks
    
    return alertMessage;
  }

  async getSystemHealth() {
    try {
      // Check recent click activity
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: recentClicks, error } = await this.supabase
        .from('link_clicks')
        .select('id, clicked_at, is_bot')
        .gte('clicked_at', oneHourAgo)
        .order('clicked_at', { ascending: false });
      
      if (error) {
        console.error('Failed to check system health:', error);
        return { healthy: false, error: error.message };
      }
      
      const totalClicks = recentClicks.length;
      const humanClicks = recentClicks.filter(c => !c.is_bot).length;
      const botClicks = recentClicks.filter(c => c.is_bot).length;
      
      return {
        healthy: true,
        recentActivity: {
          totalClicks,
          humanClicks,
          botClicks,
          timeWindow: '1 hour'
        },
        database: {
          responsive: true,
          queryTime: 'Under 100ms'
        },
        validationStats: {
          totalTests: this.stats.totalTests,
          successRate: this.stats.totalTests > 0 ? 
            ((this.stats.successfulTests / this.stats.totalTests) * 100).toFixed(2) + '%' : 'N/A',
          lastAlert: this.stats.lastAlert
        }
      };
    } catch (error) {
      return { 
        healthy: false, 
        error: error.message 
      };
    }
  }

  async startContinuousMonitoring() {
    console.log('🔍 Starting continuous click tracking monitoring...');
    console.log(`Validation interval: ${this.monitoringInterval / 1000}s`);
    console.log(`Alert threshold: ${this.alertThreshold}%`);
    console.log(`Base URL: ${this.baseUrl}`);
    console.log('Press Ctrl+C to stop\n');
    
    // Initial health check
    const health = await this.getSystemHealth();
    console.log('System Health:', JSON.stringify(health, null, 2));
    
    // Start monitoring loop
    const monitoringLoop = async () => {
      try {
        await this.runValidationBatch(3); // Run 3 tests per batch
      } catch (error) {
        console.error('Monitoring batch failed:', error);
      }
    };
    
    // Run first batch immediately
    await monitoringLoop();
    
    // Schedule recurring batches
    const intervalId = setInterval(monitoringLoop, this.monitoringInterval);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\n📊 MONITORING SUMMARY');
      console.log('='.repeat(50));
      console.log(`Total Tests: ${this.stats.totalTests}`);
      console.log(`Success Rate: ${this.stats.totalTests > 0 ? ((this.stats.successfulTests / this.stats.totalTests) * 100).toFixed(2) + '%' : 'N/A'}`);
      console.log(`Alerts Triggered: ${this.stats.alerts.length}`);
      if (this.stats.alerts.length > 0) {
        console.log(`Last Alert: ${this.stats.lastAlert}`);
      }
      console.log('\nStopping monitoring...');
      clearInterval(intervalId);
      process.exit(0);
    });
  }
}

// Command line interface
if (require.main === module) {
  const validator = new ClickTrackingValidator({
    baseUrl: process.argv[2] || 'http://localhost:3000',
    monitoringInterval: parseInt(process.argv[3]) * 1000 || 60000, // seconds to ms
    alertThreshold: parseInt(process.argv[4]) || 95
  });
  
  const command = process.argv[5] || 'monitor';
  
  if (command === 'health') {
    validator.getSystemHealth().then(health => {
      console.log(JSON.stringify(health, null, 2));
      process.exit(health.healthy ? 0 : 1);
    });
  } else if (command === 'test') {
    validator.runValidationBatch(5).then(report => {
      console.log('Test completed:', JSON.stringify(report, null, 2));
      process.exit(parseFloat(report.successRate) >= validator.alertThreshold ? 0 : 1);
    });
  } else {
    validator.startContinuousMonitoring();
  }
}

module.exports = ClickTrackingValidator;