const { chromium } = require('playwright');
const { spawn } = require('child_process');

// Import FormScanner
const FormScanner = require('./dist/main/scanner/FormScanner').FormScanner;

async function testComprehensiveForm() {
    console.log('🧪 Testing comprehensive form detection...\n');
    
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
        
        const comprehensiveFormUrl = 'http://localhost:8080/comprehensive-form';
        
        console.log(`🔗 Comprehensive form URL: ${comprehensiveFormUrl}\n`);
        
        // Scan the comprehensive form
        console.log('🔍 Scanning comprehensive form...');
        const result = await scanner.scanForm(comprehensiveFormUrl);
        
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
            'What is your name?',
            'What is your favorite color?',
            'Which programming languages do you know?',
            'What is your experience level?',
            'Rate your satisfaction (1-5)',
            'Tell us about yourself',
            'What is your birth date?',
            'What time do you prefer for meetings?'
        ];
        
        console.log('\n🎯 Verification:');
        let allDetected = true;
        expectedQuestions.forEach((expected, index) => {
            const detected = result.questions.find(q => q.question === expected);
            if (detected) {
                console.log(`✅ "${expected}" - DETECTED (${detected.type})`);
            } else {
                console.log(`❌ "${expected}" - MISSING`);
                allDetected = false;
            }
        });
        
        // Check question types
        console.log('\n🔍 Question Type Analysis:');
        const typeCounts = {};
        result.questions.forEach(q => {
            typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
        });
        
        Object.entries(typeCounts).forEach(([type, count]) => {
            console.log(`   ${type}: ${count} question(s)`);
        });
        
        if (allDetected && result.questions.length === expectedQuestions.length) {
            console.log('\n🎉 SUCCESS: All 8 questions detected correctly!');
        } else {
            console.log('\n⚠️  PARTIAL: Some questions missing or extra questions detected');
        }
        
    } catch (error) {
        console.error('❌ Error testing comprehensive form:', error.message);
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
testComprehensiveForm().then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
