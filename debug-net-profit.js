// Debug why net profits don't match between P&L and sidebar

console.log('=== ANALYZING NET PROFIT MISMATCH ===\n');

// Values from screenshot
const plTab = {
  revenue: 24000,
  cogs: 6009,
  grossProfit: 17991,
  
  // Operating Expenses breakdown
  marketing: 300,
  businessLabor: 2056.75,
  physicalCosts: 325,
  software: 75,
  equipmentFund: 1920, // Still showing as Equipment Fund
  totalOperatingBeforeTax: 4677,
  
  preTaxProfit: 13314,
  tax: 4300.57,
  netProfit: 9014
};

const sidebar = {
  revenue: 24000,
  cogs: 6009,
  grossProfit: 17991,
  operatingExpenses: 10877, // This is the total shown
  netProfit: 7114
};

console.log('P&L TAB CALCULATION:');
console.log(`  Gross Profit: $${plTab.grossProfit}`);
console.log(`  - Operating (before tax): $${plTab.totalOperatingBeforeTax}`);
console.log(`  = Pre-tax Profit: $${plTab.preTaxProfit}`);
console.log(`  - Tax: $${plTab.tax}`);
console.log(`  = Net Profit: $${plTab.netProfit}\n`);

console.log('SIDEBAR CALCULATION:');
console.log(`  Gross Profit: $${sidebar.grossProfit}`);
console.log(`  - Operating Expenses: $${sidebar.operatingExpenses}`);
console.log(`  = Net Profit: $${sidebar.netProfit}\n`);

console.log('THE PROBLEM:');
const difference = sidebar.operatingExpenses - (plTab.totalOperatingBeforeTax + plTab.tax);
console.log(`Sidebar Operating Expenses ($${sidebar.operatingExpenses}) includes:`);
console.log(`  Operating before tax: $${plTab.totalOperatingBeforeTax}`);
console.log(`  + Tax: $${plTab.tax}`);
console.log(`  = Total: $${plTab.totalOperatingBeforeTax + plTab.tax}`);
console.log(`  Difference: $${difference}\n`);

console.log('This means the sidebar is adding an extra $1,900 somewhere.');
console.log('Likely the sidebar is double-counting something or including an expense the P&L is not.');