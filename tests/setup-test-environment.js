/**
 * Test Environment Setup Script
 * 
 * Creates test links and cleans up after test runs
 * Ensures isolated test environment
 */

const { createClient } = require('@supabase/supabase-js');

class TestEnvironmentSetup {
  constructor() {
    this.supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!this.supabaseUrl || !this.supabaseServiceKey) {
      throw new Error('Missing Supabase configuration for test setup');
    }
    
    this.supabase = createClient(this.supabaseUrl, this.supabaseServiceKey);
  }

  async createTestLinks() {
    const testLinks = [
      {
        slug: 'test-load-1',
        destination_url: '/laser-material-library',
        type: 'test',
        campaign: 'load-testing',
        utm_source: 'load-test',
        utm_medium: 'automated',
        utm_campaign: 'performance-test-1',
        append_utms: true,
        active: true,
        metadata: { created_for: 'load-testing' }
      },
      {
        slug: 'test-load-2',
        destination_url: '/products',
        type: 'test',
        campaign: 'load-testing',
        utm_source: 'load-test',
        utm_medium: 'automated',
        utm_campaign: 'performance-test-2',
        append_utms: true,
        active: true,
        metadata: { created_for: 'load-testing' }
      },
      {
        slug: 'test-load-3',
        destination_url: '/compare',
        type: 'test',
        campaign: 'load-testing',
        utm_source: 'load-test',
        utm_medium: 'automated',
        utm_campaign: 'performance-test-3',
        append_utms: true,
        active: true,
        metadata: { created_for: 'load-testing' }
      },
      {
        slug: 'yt-test-video-deals',
        destination_url: '/category/laser-cutters?utm_content=video-cta',
        type: 'test',
        campaign: 'youtube-testing',
        utm_source: 'youtube',
        utm_medium: 'video',
        utm_campaign: 'test-video-campaign',
        append_utms: true,
        active: true,
        metadata: { created_for: 'integration-testing' }
      },
      {
        slug: 'newsletter-signup',
        destination_url: '/tools/ink-calculator?ref=newsletter',
        type: 'test',
        campaign: 'newsletter-testing',
        utm_source: 'newsletter',
        utm_medium: 'email',
        utm_campaign: 'weekly-digest',
        append_utms: true,
        active: true,
        metadata: { created_for: 'integration-testing' }
      },
      {
        slug: 'test-rate-limit',
        destination_url: '/products/laser-cutters',
        type: 'test',
        campaign: 'rate-limit-testing',
        utm_source: 'rate-test',
        utm_medium: 'automated',
        append_utms: false,
        active: true,
        metadata: { created_for: 'rate-limit-testing' }
      },
      {
        slug: 'test-bot-detection',
        destination_url: '/guides',
        type: 'test',
        campaign: 'bot-detection-testing',
        utm_source: 'bot-test',
        utm_medium: 'automated',
        append_utms: false,
        active: true,
        metadata: { created_for: 'bot-detection-testing' }
      }
    ];

    console.log('Creating test links...');
    
    for (const link of testLinks) {
      try {
        // Check if link already exists
        const { data: existing } = await this.supabase
          .from('short_links')
          .select('id')
          .eq('slug', link.slug)
          .single();
        
        if (existing) {
          console.log(`  ✓ Test link '${link.slug}' already exists`);
          continue;
        }
        
        // Create new test link
        const { data, error } = await this.supabase
          .from('short_links')
          .insert(link)
          .select()
          .single();
        
        if (error) {
          console.error(`  ✗ Failed to create test link '${link.slug}':`, error.message);
        } else {
          console.log(`  ✓ Created test link '${link.slug}' (ID: ${data.id})`);
        }
        
      } catch (error) {
        console.error(`  ✗ Error creating test link '${link.slug}':`, error.message);
      }
    }
    
    console.log('Test links setup completed.\n');
  }

  async cleanupTestData() {
    console.log('Cleaning up test data...');
    
    try {
      // Get all test links
      const { data: testLinks } = await this.supabase
        .from('short_links')
        .select('id, slug')
        .or('type.eq.test,campaign.eq.load-testing,campaign.eq.youtube-testing,campaign.eq.newsletter-testing,campaign.eq.rate-limit-testing,campaign.eq.bot-detection-testing');
      
      if (!testLinks || testLinks.length === 0) {
        console.log('  No test data to clean up.');
        return;
      }
      
      const testLinkIds = testLinks.map(l => l.id);
      
      // Delete associated clicks first
      const { error: clicksError } = await this.supabase
        .from('link_clicks')
        .delete()
        .in('link_id', testLinkIds);
      
      if (clicksError) {
        console.error('  ✗ Failed to delete test clicks:', clicksError.message);
      } else {
        console.log(`  ✓ Deleted clicks for ${testLinks.length} test links`);
      }
      
      // Delete test links
      const { error: linksError } = await this.supabase
        .from('short_links')
        .delete()
        .in('id', testLinkIds);
      
      if (linksError) {
        console.error('  ✗ Failed to delete test links:', linksError.message);
      } else {
        console.log(`  ✓ Deleted ${testLinks.length} test links`);
        testLinks.forEach(link => {
          console.log(`    - ${link.slug}`);
        });
      }
      
    } catch (error) {
      console.error('  ✗ Error during cleanup:', error.message);
    }
    
    console.log('Cleanup completed.\n');
  }

  async cleanupValidationTests() {
    console.log('Cleaning up validation test data...');
    
    try {
      // Clean up validation test links (created during monitoring)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      // Get recent validation test links
      const { data: validationLinks } = await this.supabase
        .from('short_links')
        .select('id, slug')
        .like('slug', 'validation-test-%')
        .gte('created_at', oneHourAgo);
      
      if (validationLinks && validationLinks.length > 0) {
        const validationLinkIds = validationLinks.map(l => l.id);
        
        // Delete clicks first
        await this.supabase
          .from('link_clicks')
          .delete()
          .in('link_id', validationLinkIds);
        
        // Delete links
        await this.supabase
          .from('short_links')
          .delete()
          .in('id', validationLinkIds);
        
        console.log(`  ✓ Cleaned up ${validationLinks.length} validation test links`);
      } else {
        console.log('  No recent validation test data to clean up.');
      }
      
    } catch (error) {
      console.error('  ✗ Error during validation cleanup:', error.message);
    }
    
    console.log('Validation cleanup completed.\n');
  }

  async getTestDataSummary() {
    try {
      // Get test links summary
      const { data: testLinks } = await this.supabase
        .from('short_links')
        .select('slug, type, campaign, created_at, active')
        .or('type.eq.test,campaign.eq.load-testing,campaign.eq.youtube-testing,campaign.eq.newsletter-testing');
      
      // Get recent clicks on test links
      const { data: testClicks } = await this.supabase
        .from('link_clicks')
        .select('link_id, clicked_at, is_bot')
        .gte('clicked_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      console.log('Test Data Summary:');
      console.log(`  Test Links: ${testLinks?.length || 0}`);
      console.log(`  Test Clicks (24h): ${testClicks?.length || 0}`);
      
      if (testLinks && testLinks.length > 0) {
        console.log('  Active Test Links:');
        testLinks.forEach(link => {
          console.log(`    - ${link.slug} (${link.campaign || link.type})`);
        });
      }
      
      console.log('');
      
    } catch (error) {
      console.error('Error getting test data summary:', error.message);
    }
  }
}

// Command line interface
if (require.main === module) {
  const setup = new TestEnvironmentSetup();
  const command = process.argv[2] || 'setup';
  
  switch (command) {
    case 'setup':
    case 'create':
      setup.createTestLinks().catch(error => {
        console.error('Setup failed:', error);
        process.exit(1);
      });
      break;
      
    case 'cleanup':
    case 'clean':
      setup.cleanupTestData().catch(error => {
        console.error('Cleanup failed:', error);
        process.exit(1);
      });
      break;
      
    case 'cleanup-validation':
      setup.cleanupValidationTests().catch(error => {
        console.error('Validation cleanup failed:', error);
        process.exit(1);
      });
      break;
      
    case 'summary':
    case 'status':
      setup.getTestDataSummary().catch(error => {
        console.error('Summary failed:', error);
        process.exit(1);
      });
      break;
      
    case 'reset':
      console.log('Performing full reset of test environment...');
      Promise.resolve()
        .then(() => setup.cleanupTestData())
        .then(() => setup.cleanupValidationTests())
        .then(() => setup.createTestLinks())
        .then(() => setup.getTestDataSummary())
        .catch(error => {
          console.error('Reset failed:', error);
          process.exit(1);
        });
      break;
      
    default:
      console.log('Test Environment Setup');
      console.log('Usage: node setup-test-environment.js [command]');
      console.log('');
      console.log('Commands:');
      console.log('  setup, create         Create test links');
      console.log('  cleanup, clean        Remove all test data');
      console.log('  cleanup-validation    Remove validation test data');
      console.log('  summary, status       Show test data summary');
      console.log('  reset                 Full cleanup and recreation');
      console.log('');
      break;
  }
}

module.exports = TestEnvironmentSetup;