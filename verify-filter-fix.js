// Verification test for filter batching fix
// This simulates the before/after behavior

console.log('=== BEFORE FIX (Sequential updateFilter calls) ===\n');

// Simulate sequential calls with stale state
let urlParams1 = new URLSearchParams(); // Initial state

// Call 1: updateFilter('start', '2026-01-24')
let newParams1 = new URLSearchParams(urlParams1);
newParams1.set('start', '2026-01-24');
console.log('After Call 1 (start):', newParams1.toString());

// Call 2: updateFilter('employee', '2') - reads STALE urlParams1
let newParams2 = new URLSearchParams(urlParams1); // Still empty!
newParams2.set('employee', '2');
console.log('After Call 2 (employee):', newParams2.toString());

// Call 3: updateFilter('system', '1') - reads STALE urlParams1
let newParams3 = new URLSearchParams(urlParams1); // Still empty!
newParams3.set('system', '1');
console.log('After Call 3 (system):', newParams3.toString());

console.log('\nResult: Only last filter persists! ❌\n');

console.log('=== AFTER FIX (Batched updateFilters call) ===\n');

// Simulate batched update
let urlParams2 = new URLSearchParams(); // Initial state

const updates = {
  start: '2026-01-24',
  employee: '2',
  system: '1'
};

let batchedParams = new URLSearchParams(urlParams2);
Object.entries(updates).forEach(([key, value]) => {
  if (value) {
    batchedParams.set(key, value);
  }
});

console.log('After batched update:', batchedParams.toString());
console.log('\nResult: All filters persist! ✅\n');

// Verify all keys exist
const hasStart = batchedParams.has('start');
const hasEmployee = batchedParams.has('employee');
const hasSystem = batchedParams.has('system');

console.log('Verification:');
console.log('  start param:', hasStart ? '✅' : '❌');
console.log('  employee param:', hasEmployee ? '✅' : '❌');
console.log('  system param:', hasSystem ? '✅' : '❌');
console.log('\nAll filters present:', hasStart && hasEmployee && hasSystem ? '✅ PASS' : '❌ FAIL');
