// Test what the sidebar shows vs what it should show

const sidebarData = {
  revenue: 24000,
  cogs: 6009, // "Cost of Goods Sold" shown
  grossProfit: 17991,
  operatingExpenses: 10877, // shown in sidebar
  netProfit: 7114, // shown in sidebar (29.6% margin)
};

console.log('=== SIDEBAR CALCULATION ===');
console.log('Revenue: $24,000');
console.log('- COGS: $6,009');
console.log('= Gross Profit: $17,991');
console.log('- Operating Expenses: $10,877');
console.log('= Net Profit: $7,114\n');

// What net profit SHOULD be based on sidebar's numbers
const calculatedFromSidebar = sidebarData.grossProfit - sidebarData.operatingExpenses;
console.log('Verification:');
console.log(`Gross Profit - Operating = ${sidebarData.grossProfit} - ${sidebarData.operatingExpenses} = ${calculatedFromSidebar}`);
console.log('✅ Sidebar math is internally consistent\n');

console.log('=== THE PROBLEM ===');
console.log('Operating Expenses in sidebar ($10,877) != Operating Expenses in P&L ($4,677 before tax)');
console.log('Difference: $6,200\n');

console.log('The sidebar is INCLUDING TAX in Operating Expenses:');
console.log('$4,677 (operating) + ~$4,300 (tax) = ~$8,977');
console.log('Plus there might be other costs being double-counted\n');

console.log('=== WHAT ALL THREE SHOULD SHOW ===');
console.log('If COGS = $5,747.25 (correct sum):');
console.log('  Gross Profit = $24,000 - $5,747.25 = $18,252.75');
console.log('  Operating Expenses = $4,676.75');
console.log('  Pre-tax Profit = $13,576');
console.log('  Tax = $4,385.05');
console.log('  Net Profit = $9,190.95');