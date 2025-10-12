const { chromium } = require('playwright');
const { spawn } = require('child_process');

// Import FormScanner
const FormScanner = require('./dist/main/scanner/FormScanner').FormScanner;

async function testHttpMockForm() {
    console.log('🧪 Testing HTTP mock form detection...\n');
    
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
        
        // Create FormScanner instance
        const scanner = new FormScanner();
        
        const mockFormUrl = 'http://localhost:8080/mock-form';
        
        console.log(`🔗 Mock form URL: ${mockFormUrl}\n`);
        
        // Scan the mock form
        console.log('🔍 Scanning HTTP mock form...');
        const result = await scanner.scanForm(mockFormUrl);
        
        console.log('\n📊 Scan Results:');
        console.log(`✅ Total questions detected: ${result.questions.length}`);
        console.log(`📝 Form title: ${result.title || 'N/A'}`);
        console.log(`🔗 Form URL: ${result.url}`);
        
        console.log('\n📋 Questions:');
        result.questions.forEach((question, index) => {
            console.log(`\n${index + 1}. ${question.question}`);
            console.log(`   Type: ${question.type}`);
            console.log(`   Required: ${question.required ? 'Yes' : 'No'}`);
            console.log(`   Entry ID: ${question.entryId || 'N/A'}`);
            if (question.options && question.options.length > 0) {
                console.log(`   Options: ${question.options.join(', ')}`);
            }
        });
        
        // Verify expected questions
        const expectedQuestions = [
            'Favorite color',
            'Last name', 
            'Phone',
            'Email'
        ];
        
        console.log('\n🎯 Verification:');
        let allDetected = true;
        expectedQuestions.forEach((expected, index) => {
            const detected = result.questions.find(q => q.question === expected);
            if (detected) {
                console.log(`✅ "${expected}" - DETECTED`);
            } else {
                console.log(`❌ "${expected}" - MISSING`);
                allDetected = false;
            }
        });
        
        if (allDetected && result.questions.length === expectedQuestions.length) {
            console.log('\n🎉 SUCCESS: All 4 questions detected correctly via HTTP!');
        } else {
            console.log('\n⚠️  PARTIAL: Some questions missing or extra questions detected');
        }
        
    } catch (error) {
        console.error('❌ Error testing HTTP mock form:', error.message);
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
testHttpMockForm().then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
