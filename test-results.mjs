import { readFileSync } from 'fs';
import { globSync } from 'glob';
import { strict as assert } from 'assert';

const RESULTS_DIR = 'results';

function loadLatestResults() {
  const specificFile = process.argv[2];
  
  if (specificFile) {
    const filePath = specificFile.includes('/') ? specificFile : `${RESULTS_DIR}/${specificFile}`;
    const content = readFileSync(filePath, 'utf-8');
    return { data: JSON.parse(content), file: filePath };
  }
  
  const files = globSync(`${RESULTS_DIR}/marksix-*.json`);
  if (files.length === 0) {
    throw new Error('No result files found');
  }
  const latestFile = files.sort().pop();
  const content = readFileSync(latestFile, 'utf-8');
  return { data: JSON.parse(content), file: latestFile };
}

function validateDrawResult(draw, index) {
  const errors = [];
  
  if (!draw.drawId || typeof draw.drawId !== 'string') {
    errors.push(`[${index}] Missing or invalid drawId`);
  } else if (!/^\d{2}\/\d{3}(\s+\w+)?$/.test(draw.drawId)) {
    errors.push(`[${index}] Invalid drawId format: ${draw.drawId}`);
  }
  
  if (!draw.date || typeof draw.date !== 'string') {
    errors.push(`[${index}] Missing or invalid date`);
  } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(draw.date)) {
    errors.push(`[${index}] Invalid date format: ${draw.date}`);
  }
  
  if (!Array.isArray(draw.mainNumbers)) {
    errors.push(`[${index}] mainNumbers is not an array`);
    return errors;
  }
  
  if (draw.mainNumbers.length !== 6) {
    errors.push(`[${index}] mainNumbers should have 6 numbers, got ${draw.mainNumbers.length}`);
  }
  
  draw.mainNumbers.forEach((num, i) => {
    if (typeof num !== 'number' || !Number.isInteger(num)) {
      errors.push(`[${index}] mainNumbers[${i}] is not an integer: ${num}`);
    } else if (num < 1 || num > 49) {
      errors.push(`[${index}] mainNumbers[${i}] out of range (1-49): ${num}`);
    }
  });
  
  const uniqueMain = new Set(draw.mainNumbers);
  if (uniqueMain.size !== draw.mainNumbers.length) {
    errors.push(`[${index}] mainNumbers contains duplicates: ${draw.mainNumbers}`);
  }
  
  if (draw.extraNumber === undefined || draw.extraNumber === null) {
    errors.push(`[${index}] Missing extraNumber`);
  } else {
    if (typeof draw.extraNumber !== 'number' || !Number.isInteger(draw.extraNumber)) {
      errors.push(`[${index}] extraNumber is not an integer: ${draw.extraNumber}`);
    } else if (draw.extraNumber < 1 || draw.extraNumber > 49) {
      errors.push(`[${index}] extraNumber out of range (1-49): ${draw.extraNumber}`);
    }
  }
  
  if (draw.extraNumber !== undefined && draw.mainNumbers.includes(draw.extraNumber)) {
    errors.push(`[${index}] extraNumber (${draw.extraNumber}) exists in mainNumbers`);
  }
  
  return errors;
}

function runTests() {
  console.log('=== Mark Six Results Tests ===\n');
  
  const { data: results, file } = loadLatestResults();
  console.log(`Testing file: ${file}`);
  console.log(`Total draws: ${results.length}\n`);
  
  let passed = 0;
  let failed = 0;
  
  console.log('--- Data Validation Tests ---\n');
  
  assert(Array.isArray(results), 'Results should be an array');
  console.log('✓ Results is an array');
  passed++;
  
  assert(results.length > 0, 'Results should not be empty');
  console.log(`✓ Results contains ${results.length} draws`);
  passed++;
  
  const allErrors = [];
  results.forEach((draw, index) => {
    const errors = validateDrawResult(draw, index);
    if (errors.length === 0) {
      passed++;
    } else {
      failed += errors.length;
      allErrors.push(...errors);
    }
  });
  console.log(`✓ Validated ${results.length} draw records`);
  
  console.log('\n--- Scraper Output Tests ---\n');
  
  const firstDraw = results[0];
  assert(firstDraw.hasOwnProperty('drawId'), 'Should have drawId');
  assert(firstDraw.hasOwnProperty('date'), 'Should have date');
  assert(firstDraw.hasOwnProperty('mainNumbers'), 'Should have mainNumbers');
  assert(firstDraw.hasOwnProperty('extraNumber'), 'Should have extraNumber');
  assert(firstDraw.hasOwnProperty('sbName'), 'Should have sbName');
  console.log('✓ All required fields present');
  passed++;
  
  const sampleNumbers = firstDraw.mainNumbers;
  const sortedCopy = [...sampleNumbers].sort((a, b) => a - b);
  assert.deepStrictEqual(sampleNumbers, sortedCopy, 'Numbers should be sorted ascending');
  console.log('✓ Numbers are sorted ascending');
  passed++;
  
  console.log('\n--- Regression Tests ---\n');
  
  const drawIds = results.map(d => d.drawId);
  const uniqueIds = new Set(drawIds);
  assert.strictEqual(uniqueIds.size, drawIds.length, 'All draw IDs should be unique');
  console.log('✓ All draw IDs are unique');
  passed++;
  
  const drawIdPattern = /^\d{2}\/\d{3}/;
  results.forEach((draw, i) => {
    const numericId = parseInt(draw.drawId.match(drawIdPattern)?.[0].replace('/', '') || '0');
    if (i > 0) {
      const prevNumericId = parseInt(results[i-1].drawId.match(drawIdPattern)?.[0].replace('/', '') || '0');
      assert(numericId <= prevNumericId, `Draw IDs should be descending: ${draw.drawId}`);
    }
  });
  console.log('✓ Draw IDs are in descending order');
  passed++;
  
  const snowballDraws = results.filter(d => d.sbName && d.sbName.length > 0);
  console.log(`✓ Found ${snowballDraws.length} snowball draws`);
  passed++;
  
  console.log('\n=== Test Results ===\n');
  
  if (allErrors.length > 0) {
    console.log('Validation Errors:');
    allErrors.forEach(err => console.log(`  ✗ ${err}`));
  }
  
  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`\n${failed === 0 ? '✓ All tests passed!' : '✗ Some tests failed'}`);
  
  return failed === 0;
}

runTests();
