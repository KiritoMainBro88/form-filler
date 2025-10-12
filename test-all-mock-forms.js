const { chromium } = require('playwright');
const { spawn } = require('child_process');

// Import FormScanner
const FormScanner = require('./dist/main/scanner/FormScanner').FormScanner;

async function testAllMockForms() {
    console.log('🧪 Testing all mock forms...\n');
    
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
        
        // Test both forms
        const forms = [
            {
                name: 'T-shirt Order Form',
                url: 'http://localhost:8080/mock-form',
                expectedQuestions: [
                    'Favorite color',
                    'Last name', 
                    'Phone',
                    'Email'
                ]
            },
            {
                name: 'Comprehensive Test Form',
                url: 'http://localhost:8080/comprehensive-form',
                expectedQuestions: [
                    'What is your name?',
                    'What is your favorite color?',
                    'Which programming languages do you know?',
                    'What is your experience level?',
                    'Rate your satisfaction (1-5)',
                    'Tell us about yourself',
                    'What is your birth date?',
                    'What time do you prefer for meetings?'
                ]
            }
        ];
        
        let allTestsPassed = true;
        
        for (const form of forms) {
            console.log(`\n📝 Testing: ${form.name}`);
            console.log(`🔗 URL: ${form.url}`);
            
            try {
                // Scan the form
                const result = await scanner.scanForm(form.url);
                
                console.log(`✅ Questions detected: ${result.questions.length}/${form.expectedQuestions.length}`);
                
                // Verify expected questions
                let formPassed = true;
                form.expectedQuestions.forEach((expected, index) => {
                    const detected = result.questions.find(q => q.question === expected);
                    if (detected) {
                        console.log(`   ✅ "${expected}" - DETECTED (${detected.type})`);
                    } else {
                        console.log(`   ❌ "${expected}" - MISSING`);
                        formPassed = false;
                        allTestsPassed = false;
                    }
                });
                
                // Check for extra questions
                const extraQuestions = result.questions.filter(q => 
                    !form.expectedQuestions.includes(q.question)
                );
                
                if (extraQuestions.length > 0) {
                    console.log(`   ⚠️  Extra questions detected: ${extraQuestions.length}`);
                    extraQuestions.forEach(q => {
                        console.log(`      - "${q.question}" (${q.type})`);
                    });
                }
                
                if (formPassed && result.questions.length === form.expectedQuestions.length) {
                    console.log(`   🎉 ${form.name}: ALL QUESTIONS DETECTED CORRECTLY!`);
                } else {
                    console.log(`   ⚠️  ${form.name}: Some issues detected`);
                }
                
            } catch (error) {
                console.error(`   ❌ Error scanning ${form.name}:`, error.message);
                allTestsPassed = false;
            }
        }
        
        console.log('\n' + '='.repeat(60));
        if (allTestsPassed) {
            console.log('🎉 ALL TESTS PASSED! Mock forms are working perfectly!');
        } else {
            console.log('⚠️  Some tests failed. Check the output above.');
        }
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('❌ Error testing mock forms:', error.message);
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
testAllMockForms().then(() => {
    console.log('\n✅ All tests completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
