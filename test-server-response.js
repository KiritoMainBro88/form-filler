const http = require('http');
const { spawn } = require('child_process');

async function testServerResponse() {
    console.log('🧪 Testing server response...\n');
    
    let serverProcess;
    
    try {
        // Start the mock server
        console.log('🚀 Starting mock form server...');
        serverProcess = spawn('node', ['serve-mock-form.js'], {
            stdio: 'pipe',
            shell: true
        });
        
        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test both endpoints
        const endpoints = ['/mock-form', '/comprehensive-form'];
        
        for (const endpoint of endpoints) {
            console.log(`\n🔍 Testing endpoint: ${endpoint}`);
            
            const response = await new Promise((resolve, reject) => {
                const req = http.get(`http://localhost:8080${endpoint}`, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => resolve({ statusCode: res.statusCode, data }));
                });
                req.on('error', reject);
            });
            
            console.log(`Status: ${response.statusCode}`);
            console.log(`Content length: ${response.data.length} characters`);
            console.log(`First 200 chars: ${response.data.substring(0, 200)}...`);
            
            // Check for key elements
            const hasQr7Oae = response.data.includes('Qr7Oae');
            const hasM7eMe = response.data.includes('M7eMe');
            const hasForm = response.data.includes('<form');
            
            console.log(`Contains Qr7Oae: ${hasQr7Oae}`);
            console.log(`Contains M7eMe: ${hasM7eMe}`);
            console.log(`Contains form: ${hasForm}`);
        }
        
    } catch (error) {
        console.error('❌ Error testing server response:', error.message);
        console.error(error.stack);
    } finally {
        // Stop the server
        if (serverProcess) {
            console.log('\n🛑 Stopping mock server...');
            serverProcess.kill();
        }
    }
}

// Run the test
testServerResponse().then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
