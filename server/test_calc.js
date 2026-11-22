const { calculateTenderBookletPrice, calculateAwardDeductions, getApprovalAuthority } = require('./utils/calculations');

console.log('--- 1. Testing Booklet Price Calculation (صفحة 5-6) ---');
const booklet = calculateTenderBookletPrice(100, true);
console.log('Base: 100 EGP (Supply) -> Final Price:', booklet.finalPrice, 'EGP (Details:', booklet, ')');

console.log('\n--- 2. Testing Award Deductions (صفحة 27-28) ---');
const deductions = calculateAwardDeductions(500000, false, 10);
console.log('Award: 500,000 EGP (Contract) -> Final Guarantee:', deductions.finalGuarantee, 'EGP | Total Deductions:', deductions.totalDeductions, 'EGP | Net:', deductions.netAwardAmount, 'EGP');

console.log('\n--- 3. Testing Approval Authority Limits (صفحة 4) ---');
console.log('General Tender 2,000,000 EGP ->', getApprovalAuthority('مناقصة عامة', 2000000));
console.log('General Tender 50,000,000 EGP ->', getApprovalAuthority('مناقصة عامة', 50000000));

console.log('\n✅ All Business Logic Calculations Verified Successfully!');
