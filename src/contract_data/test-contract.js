// Test script for contract integration
import contractManager from './contract-utils.js';

async function testContractIntegration() {
  console.log('Testing contract integration...');
  
  try {
    // Test initialization
    console.log('1. Testing wallet connection...');
    const result = await contractManager.initialize();
    console.log('✅ Wallet connected:', result.account);
    
    // Test getting balances
    console.log('2. Testing balance retrieval...');
    const accountBalance = await contractManager.getAccountBalance();
    const contractBalance = await contractManager.getContractBalance();
    console.log('✅ Account balance:', accountBalance, 'ETH');
    console.log('✅ Contract balance:', contractBalance, 'ETH');
    
    // Test network connection
    console.log('3. Testing network connection...');
    const isOnMonad = await contractManager.checkNetwork();
    console.log('✅ Connected to Monad network:', isOnMonad);
    
    console.log('🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.testContractIntegration = testContractIntegration;
}

export default testContractIntegration; 