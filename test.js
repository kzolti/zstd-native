const {
    zstdCompress: compress,
    zstdDecompress: decompress,
    setMaxInputSize,
    setMaxOutputSize,
    getLimits,
    MIN_LEVEL,
    MAX_LEVEL,
    DEFAULT_LEVEL
} = require('./index.js');

const assert = require('assert');
const DEFAULT_MAX_OUTPUT_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

// Helper function for synchronous testing
async function test(name, fn) {
    try {
        await fn();
        console.log(`✓ ${name}`);
    } catch (err) {
        console.error(`✗ ${name}`);
        throw err;
    }
}

// Test 1: Basic compression and decompression
const test1 = async () => {
    const input = Buffer.from('Hello, zstd!');
    const compressed = await compress(input);
    const decompressed = await decompress(compressed);
    assert.strictEqual(decompressed.toString(), 'Hello, zstd!');
};

// Test 2: Empty buffer
const test2 = async () => {
    const input = Buffer.from('');
    const compressed = await compress(input);
    const decompressed = await decompress(compressed);
    assert.strictEqual(decompressed.length, 0);
};

// Test 3: Different compression levels
const test3 = async () => {
    const input = Buffer.from('A'.repeat(10000));
    const comp1 = await compress(input, 1);
    const comp22 = await compress(input, 22);
    assert(comp22.length <= comp1.length); // Higher level should compress better
};

// Test 4: Size limits
const test4 = async () => {
    const originalLimit = 2 * 1024 * 1024; // 2MB
    setMaxInputSize(originalLimit);

    try {
        const largeInput = Buffer.alloc(3 * 1024 * 1024); // 3MB
        await compress(largeInput);
        assert.fail('Should have thrown size limit error');
    } catch (error) {
        assert(error.message.includes('Input size'));
    }

    // Verify limits can be read
    const limits = getLimits();
    assert.strictEqual(limits.maxInputSize, originalLimit);

    // Reset to default
    setMaxInputSize(DEFAULT_MAX_OUTPUT_SIZE);
};

// Test 5: Invalid inputs
const test5 = async () => {
    // Test invalid buffer
    try {
        await compress('not a buffer');
        assert.fail('Should have thrown type error');
    } catch (error) {
        assert(error.message.includes('must be a Buffer'));
    }

    // Test invalid compression level
    try {
        await compress(Buffer.from([1, 2, 3]), 23);
        assert.fail('Should have thrown invalid level error');
    } catch (error) {
        assert(error.message.includes(`between ${MIN_LEVEL} and ${MAX_LEVEL}`));
    }

    // Test invalid decompression input
    try {
        await decompress('not a buffer');
        assert.fail('Should have thrown type error');
    } catch (error) {
        assert(error.message.includes('must be a Buffer'));
    }
};

// Test 6: Large valid compression
const test6 = async () => {
    const input = Buffer.from('A'.repeat(1024 * 1024)); // 1MB
    const compressed = await compress(input);
    const decompressed = await decompress(compressed);
    assert.strictEqual(decompressed.length, input.length);
};

// Test 7: Output size limits
const test7 = async () => {
    // Set a small output limit
    const smallLimit = 10; // Very small limit to force error
    setMaxOutputSize(smallLimit);

    try {
        const input = Buffer.from('A'.repeat(1000));
        await compress(input);
        assert.fail('Should have thrown output size limit error');
    } catch (error) {
        assert(error.message.includes('Output size'));
    }

    // Test decompression size limit
    try {
        // First compress with normal limit
        setMaxOutputSize(DEFAULT_MAX_OUTPUT_SIZE);
        const input = Buffer.from('A'.repeat(1000));
        const compressed = await compress(input);

        // Then try to decompress with small limit
        setMaxOutputSize(smallLimit);
        await decompress(compressed);
        assert.fail('Should have thrown decompression size limit error');
    } catch (error) {
        assert(error.message.includes('Output size'));
    }

    // Reset to default
    setMaxOutputSize(DEFAULT_MAX_OUTPUT_SIZE);
};

// Test 8: Constants availability
const test8 = async () => {
    assert.strictEqual(typeof MIN_LEVEL, 'number');
    assert.strictEqual(typeof MAX_LEVEL, 'number');
    assert.strictEqual(typeof DEFAULT_LEVEL, 'number');
    assert(MIN_LEVEL >= 1);
    assert(MAX_LEVEL <= 22);
};

async function runTests() {
    console.log('Running zstd_native tests...');
    try {
        await test('Basic compression/decompression', test1);
        await test('Empty buffer', test2);
        await test('Compression levels', test3);
        await test('Size limits', test4);
        await test('Invalid inputs', test5);
        await test('Large valid compression', test6);
        await test('Output size limits', test7);
        await test('Constants availability', test8);
        
        console.log('\nAll tests passed! ✨');
    } catch (error) {
        console.error('\nTest failed:', error);
        process.exit(1);
    }
}

runTests();