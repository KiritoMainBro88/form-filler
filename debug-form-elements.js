const { chromium } = require('playwright');

async function debugFormElements() {
    console.log('🔍 Debugging Google Form Elements...\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        const realFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSd9gYiUPMeav4H7jh2_8FdTtLCQ8ROYiF1I5y-kN4y5JhoDDw/viewform';
        
        console.log('📋 Loading real Google Form...');
        await page.goto(realFormUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);
        
        // Debug all elements
        const debugResult = await page.evaluate(() => {
            const results = [];
            
            // Check all Qr7Oae elements
            const qr7OaeElements = document.querySelectorAll('.Qr7Oae[role="listitem"]');
            results.push(`\n=== Qr7Oae Elements (${qr7OaeElements.length}) ===`);
            
            qr7OaeElements.forEach((element, index) => {
                const m7eMe = element.querySelector('.M7eMe');
                const hasInput = element.querySelector('input, select, textarea, [role="radiogroup"], [role="checkbox"], iframe');
                const text = element.textContent?.substring(0, 100) + '...';
                
                results.push(`Element ${index + 1}:`);
                results.push(`  M7eMe: ${m7eMe ? m7eMe.textContent : 'None'}`);
                results.push(`  Has Input: ${!!hasInput}`);
                results.push(`  Text: ${text}`);
                results.push('');
            });
            
            // Check all M7eMe elements
            const m7eMeElements = document.querySelectorAll('.M7eMe');
            results.push(`\n=== M7eMe Elements (${m7eMeElements.length}) ===`);
            
            m7eMeElements.forEach((element, index) => {
                results.push(`${index + 1}. "${element.textContent}"`);
            });
            
            return results;
        });
        
        debugResult.forEach(result => console.log(result));
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        await browser.close();
    }
}

debugFormElements().catch(console.error);
