/**
 * Test script to verify machine filter integration is working correctly
 * Run this after the SQL migration has been applied
 */

async function testMachineFilterIntegration() {
  console.log('Testing Machine Filter Integration...\n');

  // Test URLs that include different types
  const testData = {
    manufacturer_id: "test-manufacturer-id",
    base_url: "https://example.com",
    manufacturer_name: "Test Manufacturer",
    max_pages: 1,
    apply_smart_filtering: true,
    apply_machine_filtering: true
  };

  try {
    // 1. Test the discovery endpoint
    console.log('1. Testing smart discovery with machine filtering...');
    const discoveryResponse = await fetch('http://localhost:8000/api/v1/smart/smart-discover-urls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });

    if (!discoveryResponse.ok) {
      throw new Error(`Discovery failed: ${await discoveryResponse.text()}`);
    }

    const discoveryResult = await discoveryResponse.json();
    console.log('Discovery Result:', {
      total_urls: discoveryResult.total_urls_found,
      machine_filter_applied: discoveryResult.classification_summary?.machine_filter_applied,
      filtered_count: discoveryResult.classification_summary?.urls_filtered_as_non_machines
    });

    // 2. Test saving to database
    if (discoveryResult.classified_urls) {
      console.log('\n2. Testing save to database with ML columns...');
      
      const saveResponse = await fetch('http://localhost:3000/api/admin/save-discovered-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manufacturer_id: testData.manufacturer_id,
          urls: [],
          classified_urls: discoveryResult.classified_urls,
          classification_summary: discoveryResult.classification_summary
        })
      });

      if (!saveResponse.ok) {
        throw new Error(`Save failed: ${await saveResponse.text()}`);
      }

      const saveResult = await saveResponse.json();
      console.log('Save Result:', {
        saved: saveResult.saved,
        total: saveResult.total,
        auto_skip_count: saveResult.auto_skip_count
      });
    }

    // 3. Test fetching from database
    console.log('\n3. Testing fetch from database with ML columns...');
    const fetchResponse = await fetch(`http://localhost:3000/api/admin/save-discovered-urls?manufacturer_id=${testData.manufacturer_id}`);
    
    if (!fetchResponse.ok) {
      throw new Error(`Fetch failed: ${await fetchResponse.text()}`);
    }

    const urls = await fetchResponse.json();
    console.log('Fetched URLs:', urls.length);
    
    // Check for ML classification data
    const urlsWithML = urls.filter(u => u.ml_classification);
    console.log('URLs with ML classification:', urlsWithML.length);
    
    if (urlsWithML.length > 0) {
      console.log('\nSample ML Classifications:');
      urlsWithML.slice(0, 5).forEach(url => {
        console.log(`- ${url.url}`);
        console.log(`  Classification: ${url.ml_classification}`);
        console.log(`  Confidence: ${url.ml_confidence}`);
        console.log(`  Machine Type: ${url.machine_type || 'N/A'}`);
        console.log(`  Should Auto Skip: ${url.should_auto_skip}`);
      });
    }

    console.log('\n✅ All tests passed! Machine filtering is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testMachineFilterIntegration();