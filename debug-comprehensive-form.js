const { chromium } = require('playwright');
const { spawn } = require('child_process');

async function debugComprehensiveForm() {
    console.log('🔍 Debugging comprehensive form...\n');
    
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
        
        const browser = await chromium.launch({ headless: false });
        const page = await browser.newPage();
        
        const comprehensiveFormUrl = 'http://localhost:8080/comprehensive-form';
        console.log(`🔗 Loading: ${comprehensiveFormUrl}`);
        
        await page.goto(comprehensiveFormUrl, { waitUntil: 'networkidle' });
        
        // Debug: Check what elements are found
        const elements = await page.evaluate(() => {
            const allElements = document.querySelectorAll('*');
            const qr7OaeElements = document.querySelectorAll('.Qr7Oae');
            const m7eMeElements = document.querySelectorAll('.M7eMe');
            const inputElements = document.querySelectorAll('input, select, textarea');
            
            console.log('Total elements:', allElements.length);
            console.log('.Qr7Oae elements:', qr7OaeElements.length);
            console.log('.M7eMe elements:', m7eMeElements.length);
            console.log('Input elements:', inputElements.length);
            
            // Log all .Qr7Oae elements
            qr7OaeElements.forEach((el, index) => {
                console.log(`Qr7Oae ${index + 1}:`, el.textContent.trim().substring(0, 100));
            });
            
            // Log all .M7eMe elements
            m7eMeElements.forEach((el, index) => {
                console.log(`M7eMe ${index + 1}:`, el.textContent.trim());
            });
            
            return {
                totalElements: allElements.length,
                qr7OaeCount: qr7OaeElements.length,
                m7eMeCount: m7eMeElements.length,
                inputCount: inputElements.length,
                qr7OaeTexts: Array.from(qr7OaeElements).map(el => el.textContent.trim().substring(0, 100)),
                m7eMeTexts: Array.from(m7eMeElements).map(el => el.textContent.trim())
            };
        });
        
        console.log('\n📊 Element Analysis:');
        console.log(`Total elements: ${elements.totalElements}`);
        console.log(`Qr7Oae elements: ${elements.qr7OaeCount}`);
        console.log(`M7eMe elements: ${elements.m7eMeCount}`);
        console.log(`Input elements: ${elements.inputCount}`);
        
        console.log('\n📋 Qr7Oae Elements:');
        elements.qr7OaeTexts.forEach((text, index) => {
            console.log(`${index + 1}. ${text}`);
        });
        
        console.log('\n📋 M7eMe Elements:');
        elements.m7eMeTexts.forEach((text, index) => {
            console.log(`${index + 1}. ${text}`);
        });
        
        await browser.close();
        
    } catch (error) {
        console.error('❌ Error debugging comprehensive form:', error.message);
        console.error(error.stack);
    } finally {
        // Stop the server
        if (serverProcess) {
            console.log('\n🛑 Stopping mock server...');
            serverProcess.kill();
        }
    }
}

// Run the debug
debugComprehensiveForm().then(() => {
    console.log('\n✅ Debug completed');
    process.exit(0);
}).catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
});
