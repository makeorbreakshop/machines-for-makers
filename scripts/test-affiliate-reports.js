#!/usr/bin/env node

/**
 * Test script for affiliate reporting system
 * Tests all API endpoints and report generation
 */

const baseUrl = 'http://localhost:3000';

// Test data
const xToolProgramId = '14d8201b-5114-4b14-961b-4b594e9ea30e';

async function testReportGeneration() {
  console.log('🧪 Testing Report Generation API...\n');

  try {
    // Test 1: Generate Q4 2024 Report for xTool
    console.log('Test 1: Generating Q4 2024 report for xTool...');
    const response = await fetch(`${baseUrl}/api/admin/affiliate/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        programId: xToolProgramId,
        quarter: 'Q4',
        year: 2024,
        title: 'xTool Q4 2024 Performance Report'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.error || response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Report generated successfully!');
    console.log('   Report ID:', result.report?.id);
    console.log('   Title:', result.report?.title);
    console.log('   Period:', result.report?.period);
    console.log('   Total Revenue: $', result.report?.total_revenue);
    console.log('   Total Orders:', result.report?.total_orders);
    console.log('   Total Commission: $', result.report?.total_commission);
    console.log('   Share URL:', result.report?.share_url);
    console.log('   Machine Metrics Count:', result.report?.machine_metrics?.length || 0);
    console.log('');

    // Test 2: Try to generate Q1 2025 Report (should have less/no data)
    console.log('Test 2: Generating Q1 2025 report for xTool...');
    const response2 = await fetch(`${baseUrl}/api/admin/affiliate/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        programId: xToolProgramId,
        quarter: 'Q1',
        year: 2025,
      })
    });

    if (!response2.ok) {
      const error = await response2.json();
      console.log('⚠️  API returned error (expected if no data):', error.error);
    } else {
      const result2 = await response2.json();
      console.log('✅ Q1 2025 Report generated!');
      console.log('   Total Orders:', result2.report?.total_orders || 0);
      console.log('   Total Revenue: $', result2.report?.total_revenue || 0);
    }
    console.log('');

    // Test 3: Invalid program ID
    console.log('Test 3: Testing invalid program ID...');
    const response3 = await fetch(`${baseUrl}/api/admin/affiliate/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        programId: '00000000-0000-0000-0000-000000000000',
        quarter: 'Q4',
        year: 2024,
      })
    });

    if (!response3.ok) {
      console.log('✅ Correctly rejected invalid program ID');
    } else {
      console.log('❌ Should have rejected invalid program ID');
    }
    console.log('');

    // Test 4: Missing required fields
    console.log('Test 4: Testing missing required fields...');
    const response4 = await fetch(`${baseUrl}/api/admin/affiliate/reports/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        programId: xToolProgramId,
        // Missing quarter and year
      })
    });

    if (!response4.ok) {
      console.log('✅ Correctly rejected missing fields');
    } else {
      console.log('❌ Should have rejected missing fields');
    }
    console.log('');

    console.log('🎉 All tests completed!\n');
    console.log('Next steps:');
    console.log('1. Go to /admin/affiliate/reports to see generated reports');
    console.log('2. Click view button to see public report');
    console.log('3. Share the public URL with partners');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
console.log('='.repeat(50));
console.log('Affiliate Reporting System Test Suite');
console.log('='.repeat(50));
console.log('');

testReportGeneration().catch(console.error);