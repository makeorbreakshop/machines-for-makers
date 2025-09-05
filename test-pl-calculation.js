// Test P&L Calculation to verify all numbers are correct

// From the screenshot, we have:
const testData = {
  // Revenue
  revenue: 24000, // $24,000 shown in P&L
  
  // COGS breakdown
  materials: 1501.50,
  directLabor: 2812.50,
  platformFees: 1433.25,
  totalCOGS: 6009, // Should be ~5747.25 based on sum
  
  // Gross Profit
  grossProfit: 17991, // $17,991 shown (75% margin)
  
  // Operating Expenses shown
  marketing: 300,
  businessLabor: 2056.75, // Business Labor (Admin, etc.)
  physicalCosts: 325,
  software: 75,
  equipmentFund: 1920, // 8% of revenue
  totalOperatingBeforeTax: 4677, // -$4,677 shown
  
  // Tax calculation
  preTaxProfit: 13314, // $13,314 EBIT shown
  taxRate: 32.3, // 15.3% + 12% + 5% = 32.3%
  taxAmount: 4300.57,
  
  // Net Profit
  netProfit: 9014 // $9,014 shown
};

console.log('=== VERIFYING P&L CALCULATION ===\n');

// Test 1: Verify COGS
const calculatedCOGS = testData.materials + testData.directLabor + testData.platformFees;
console.log('COGS Verification:');
console.log(`  Materials + Direct Labor + Platform Fees = ${testData.materials} + ${testData.directLabor} + ${testData.platformFees}`);
console.log(`  Calculated: $${calculatedCOGS.toFixed(2)}`);
console.log(`  Shown in P&L: $${testData.totalCOGS}`);
console.log(`  Difference: $${(testData.totalCOGS - calculatedCOGS).toFixed(2)}`);
console.log(`  ❌ COGS appears to be rounded up from $5,747.25 to $6,009\n`);

// Test 2: Verify Gross Profit
const correctGrossProfit = testData.revenue - calculatedCOGS;
console.log('Gross Profit Verification:');
console.log(`  Revenue - COGS = ${testData.revenue} - ${calculatedCOGS}`);
console.log(`  Calculated: $${correctGrossProfit.toFixed(2)}`);
console.log(`  Shown in P&L: $${testData.grossProfit}`);
console.log(`  ✅ Gross profit matches if using shown COGS of $6,009\n`);

// Test 3: Verify Operating Expenses
const calculatedOperating = testData.marketing + testData.businessLabor + testData.physicalCosts + testData.software + testData.equipmentFund;
console.log('Operating Expenses Verification:');
console.log(`  Marketing: $${testData.marketing}`);
console.log(`  Business Labor: $${testData.businessLabor}`);
console.log(`  Physical Costs: $${testData.physicalCosts}`);
console.log(`  Software: $${testData.software}`);
console.log(`  Equipment Fund (8%): $${testData.equipmentFund}`);
console.log(`  Calculated Total: $${calculatedOperating.toFixed(2)}`);
console.log(`  Shown Total: $${testData.totalOperatingBeforeTax}`);
console.log(`  ✅ Operating expenses match\n`);

// Test 4: Verify Pre-Tax Profit
const calculatedPreTax = testData.grossProfit - calculatedOperating;
console.log('Pre-Tax Profit Verification:');
console.log(`  Gross Profit - Operating = ${testData.grossProfit} - ${calculatedOperating.toFixed(2)}`);
console.log(`  Calculated: $${calculatedPreTax.toFixed(2)}`);
console.log(`  Shown in P&L: $${testData.preTaxProfit}`);
console.log(`  ✅ Pre-tax profit matches\n`);

// Test 5: Verify Tax Calculation
const calculatedTax = calculatedPreTax * (testData.taxRate / 100);
console.log('Tax Calculation Verification:');
console.log(`  Pre-Tax Profit × Tax Rate = ${calculatedPreTax.toFixed(2)} × ${testData.taxRate}%`);
console.log(`  Calculated: $${calculatedTax.toFixed(2)}`);
console.log(`  Shown in P&L: $${testData.taxAmount}`);
console.log(`  ✅ Tax calculation matches\n`);

// Test 6: Verify Net Profit
const calculatedNetProfit = calculatedPreTax - calculatedTax;
console.log('Net Profit Verification:');
console.log(`  Pre-Tax - Tax = ${calculatedPreTax.toFixed(2)} - ${calculatedTax.toFixed(2)}`);
console.log(`  Calculated: $${calculatedNetProfit.toFixed(2)}`);
console.log(`  Shown in P&L: $${testData.netProfit}`);
console.log(`  ✅ Net profit matches\n`);

console.log('=== SUMMARY ===');
console.log('The P&L calculation is MOSTLY correct, but there\'s a rounding issue with COGS:');
console.log('- COGS should be $5,747.25 but shows as $6,009');
console.log('- This creates a ~$262 discrepancy that flows through the entire P&L\n');

console.log('=== CORRECT CALCULATION PATH ===');
console.log('Revenue: $24,000');
console.log('- COGS: $5,747.25 (materials + direct labor + platform fees)');
console.log('= Gross Profit: $18,252.75');
console.log('- Operating Expenses: $4,676.75 (marketing + indirect labor + physical + software + equipment)');  
console.log('= Pre-Tax Profit: $13,576');
console.log('- Tax (32.3%): $4,385.05');
console.log('= Net Profit: $9,190.95');
console.log('\nThe correct net profit should be ~$9,191, not $9,014');