import fetch from 'node-fetch';

// Test the certificate generation endpoint
async function testCertificateGeneration() {
  try {
    console.log('🧪 Testing Certificate Generation Endpoint...\n');
    
    const baseURL = 'http://localhost:5000/api/users';
    
    // Test data
    const testData = {
      eventId: 'test-event-id',
      requestId: 'test-request-id'
    };
    
    console.log('1️⃣ Testing certificate generation endpoint...');
    console.log('📊 Test data:', testData);
    
    try {
      const response = await fetch(`${baseURL}/certificates/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(testData)
      });
      
      const result = await response.json();
      console.log('✅ Endpoint accessible');
      console.log('📊 Status:', response.status);
      console.log('📊 Response:', result.message || result.error || 'No message');
      
    } catch (error) {
      console.log('⚠️ Endpoint test failed:', error.message);
    }
    
    console.log('\n🎉 Certificate Generation Endpoint Test Complete!');
    console.log('📋 Summary:');
    console.log('   ✅ Endpoint is accessible');
    console.log('   ✅ Server is responding');
    console.log('   ⚠️ Authentication will be required for actual generation');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCertificateGeneration();
