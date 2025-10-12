const { chromium } = require('playwright');
const { spawn } = require('child_process');

// Import FormScanner
const FormScanner = require('./dist/main/scanner/FormScanner').FormScanner;

async function testNewFeatures() {
    console.log('🧪 Testing new features...\n');
    
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
        
        // Test comprehensive form (has multiple choice and checkbox)
        const comprehensiveFormUrl = 'http://localhost:8080/comprehensive-form';
        
        console.log(`🔗 Testing comprehensive form: ${comprehensiveFormUrl}\n`);
        
        // Scan the comprehensive form
        console.log('🔍 Scanning comprehensive form...');
        const result = await scanner.scanForm(comprehensiveFormUrl);
        
        console.log('\n📊 Scan Results:');
        console.log(`✅ Total questions detected: ${result.questions.length}`);
        
        console.log('\n📋 Questions with options:');
        result.questions.forEach((question, index) => {
            if (question.options && question.options.length > 0) {
                console.log(`\n${index + 1}. ${question.question}`);
                console.log(`   Type: ${question.type}`);
                console.log(`   Required: ${question.required ? 'Yes' : 'No'}`);
                console.log(`   Options: ${question.options.join(', ')}`);
            }
        });
        
        // Test CSS selector fix
        console.log('\n🔧 Testing CSS selector fix...');
        const questionsWithDots = result.questions.filter(q => q.id && q.id.includes('.'));
        if (questionsWithDots.length > 0) {
            console.log(`✅ Found ${questionsWithDots.length} questions with dots in ID:`);
            questionsWithDots.forEach(q => {
                console.log(`   - ${q.question} (ID: ${q.id})`);
            });
        } else {
            console.log('ℹ️  No questions with dots in ID found');
        }
        
        console.log('\n🎉 New features test completed successfully!');
        
    } catch (error) {
        console.error('❌ Error testing new features:', error.message);
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
testNewFeatures().then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
