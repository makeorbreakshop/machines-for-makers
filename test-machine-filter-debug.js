/**
 * Debug script to test machine filter integration
 */

async function testMachineFilterDebug() {
  console.log('Testing Machine Filter with Debug Output...\n');

  // Test data for Creality with known non-machine products
  const testData = {
    manufacturer_id: "test-creality-debug",
    base_url: "https://www.creality.com",
    manufacturer_name: "Creality",
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
    console.log('\nDiscovery Result Summary:', {
      total_urls: discoveryResult.total_urls_found,
      machine_filter_applied: discoveryResult.classification_summary?.machine_filter_applied,
      filtered_count: discoveryResult.classification_summary?.urls_filtered_as_non_machines
    });

    // Show ML classification breakdown
    if (discoveryResult.classified_urls) {
      console.log('\nML Classification Breakdown:');
      
      // Count ML classifications across all categories
      let mlClassificationCounts = {};
      Object.values(discoveryResult.classified_urls).forEach(category => {
        category.forEach(item => {
          if (item.ml_classification) {
            mlClassificationCounts[item.ml_classification] = (mlClassificationCounts[item.ml_classification] || 0) + 1;
          }
        });
      });
      
      console.log('ML Classifications found:', mlClassificationCounts);
      
      // Show some examples
      console.log('\nSample Auto-Skip URLs (first 5):');
      if (discoveryResult.classified_urls.auto_skip && discoveryResult.classified_urls.auto_skip.length > 0) {
        discoveryResult.classified_urls.auto_skip.slice(0, 5).forEach(item => {
          console.log(`- ${item.url}`);
          console.log(`  ML: ${item.ml_classification || 'N/A'} | Reason: ${item.reason || 'N/A'}`);
        });
      } else {
        console.log('  No auto-skip URLs found (all products appear to be machines)');
      }
      
      // Show some machine examples
      console.log('\nSample Machine URLs (first 5):');
      const machineUrls = [
        ...discoveryResult.classified_urls.high_confidence,
        ...discoveryResult.classified_urls.needs_review
      ].filter(item => item.ml_classification === 'MACHINE');
      
      machineUrls.slice(0, 5).forEach(item => {
        console.log(`- ${item.url}`);
        console.log(`  ML: ${item.ml_classification} | Type: ${item.machine_type || 'N/A'}`);
      });
    }

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
    
    // Show ML classification distribution
    const mlDistribution = {};
    urlsWithML.forEach(url => {
      mlDistribution[url.ml_classification] = (mlDistribution[url.ml_classification] || 0) + 1;
    });
    console.log('\nML Classification Distribution in DB:', mlDistribution);
    
    // Show auto-skipped items
    const autoSkipped = urls.filter(u => u.should_auto_skip);
    console.log('\nAuto-skipped URLs:', autoSkipped.length);
    if (autoSkipped.length > 0) {
      console.log('Sample auto-skipped (first 3):');
      autoSkipped.slice(0, 3).forEach(url => {
        console.log(`- ${url.url}`);
        console.log(`  Classification: ${url.ml_classification} | Status: ${url.status}`);
      });
    }

    console.log('\n✅ Machine filtering debug complete!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

// Run the test
testMachineFilterDebug();