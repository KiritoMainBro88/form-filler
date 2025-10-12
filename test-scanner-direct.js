const { FormScanner } = require('./dist/main/scanner/FormScanner');

async function testScannerDirect() {
    console.log('🧪 Testing FormScanner Direct...\n');
    
    try {
        const scanner = new FormScanner();
        
        const realFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSd9gYiUPMeav4H7jh2_8FdTtLCQ8ROYiF1I5y-kN4y5JhoDDw/viewform';
        
        console.log('📋 Scanning real Google Form...');
        const result = await scanner.scanForm(realFormUrl);
        
        console.log('\n📊 Scanner Results:');
        console.log('================================');
        console.log(`Form Title: ${result.title}`);
        console.log(`Total Questions: ${result.questions.length}`);
        console.log('');
        
        result.questions.forEach((question, index) => {
            console.log(`Question ${index + 1}:`);
            console.log(`  Type: ${question.type}`);
            console.log(`  Text: "${question.text}"`);
            console.log(`  Required: ${question.required}`);
            if (question.options && question.options.length > 0) {
                console.log(`  Options: [${question.options.join(', ')}]`);
            }
            console.log('');
        });
        
        if (result.questions.length === 8) {
            console.log('✅ SUCCESS: All 8 questions detected!');
        } else {
            console.log(`❌ ISSUE: Only ${result.questions.length}/8 questions detected`);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testScannerDirect().catch(console.error);
