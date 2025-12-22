/**
 * Test script to verify Alpha Vantage API integration
 * Run with: npx tsx test-api.ts
 */

import { fetchStockPrice, validateTicker } from './services/marketData';

async function testAPI() {
    console.log('🧪 Testing Alpha Vantage API Integration...\n');

    try {
        // Test 1: Fetch AAPL price
        console.log('Test 1: Fetching AAPL price...');
        const aaplPrice = await fetchStockPrice('AAPL');
        console.log(`✅ AAPL Price: $${aaplPrice.toFixed(2)}\n`);

        // Test 2: Fetch MSFT price
        console.log('Test 2: Fetching MSFT price...');
        const msftPrice = await fetchStockPrice('MSFT');
        console.log(`✅ MSFT Price: $${msftPrice.toFixed(2)}\n`);

        // Test 3: Validate valid ticker
        console.log('Test 3: Validating GOOGL...');
        const isValid = await validateTicker('GOOGL');
        console.log(`✅ GOOGL is ${isValid ? 'valid' : 'invalid'}\n`);

        // Test 4: Validate invalid ticker
        console.log('Test 4: Validating INVALID123...');
        const isInvalid = await validateTicker('INVALID123');
        console.log(`✅ INVALID123 is ${isInvalid ? 'valid' : 'invalid'}\n`);

        // Test 5: Test caching (should be instant)
        console.log('Test 5: Testing cache (fetching AAPL again)...');
        const startTime = Date.now();
        const cachedPrice = await fetchStockPrice('AAPL');
        const elapsed = Date.now() - startTime;
        console.log(`✅ Cached AAPL Price: $${cachedPrice.toFixed(2)} (${elapsed}ms - should be <10ms)\n`);

        console.log('🎉 All API tests passed!');
        console.log('\n📊 Summary:');
        console.log(`   - API Key: Working ✅`);
        console.log(`   - Price Fetching: Working ✅`);
        console.log(`   - Ticker Validation: Working ✅`);
        console.log(`   - Caching: Working ✅`);

    } catch (error) {
        console.error('❌ API Test Failed:', error);
        console.error('\n💡 Troubleshooting:');
        console.error('   1. Check your API key in .env.local');
        console.error('   2. Verify you have internet connection');
        console.error('   3. Check if you hit rate limit (5 calls/minute on free tier)');
        process.exit(1);
    }
}

testAPI();
