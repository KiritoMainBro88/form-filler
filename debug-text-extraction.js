const { chromium } = require('playwright');

async function debugTextExtraction() {
    console.log('🔍 Debugging Text Extraction...\n');
    
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
        
        // Debug text extraction
        const debugResult = await page.evaluate(() => {
            const results = [];
            
            // Get all Qr7Oae elements
            const questionElements = document.querySelectorAll('.Qr7Oae[role="listitem"]');
            results.push(`Total Qr7Oae elements: ${questionElements.length}\n`);
            
            questionElements.forEach((element, index) => {
                results.push(`=== Element ${index + 1} ===`);
                
                // Test the 3 text extraction strategies
                const textExtractionStrategies = [
                    // Strategy 1: Look for specific question title elements
                    () => {
                        const titleSelectors = [
                            '.M7eMe',  // Primary question text selector from real form
                            '.freebirdFormviewerViewItemsQuestionItemTitle', '.freebirdFormviewerViewItemsItemItemTitle',
                            '[jsname="YPqjbf"]', '.Qr7Oae', 'h1, h2, h3, h4, h5, h6',
                            '.question-title', '[data-question-title]', 'label'
                        ];
                        for (const selector of titleSelectors) {
                            const titleElement = element.querySelector(selector);
                            if (titleElement && titleElement.textContent) {
                                const text = titleElement.textContent.trim();
                                if (text && text.length > 3 && text.length < 500) { 
                                    return { strategy: 'title', text: text, selector: selector };
                                }
                            }
                        }
                        return null;
                    },
                    
                    // Strategy 2: Extract from all text nodes, prioritizing longer text
                    () => {
                        const allTextElements = element.querySelectorAll('*');
                        const possibleQuestions = [];
                        allTextElements.forEach((el) => {
                            if (el.textContent && el.children.length === 0) { // Only leaf nodes
                                const text = el.textContent.trim();
                                if (text && text.length > 5 && text.length < 500 &&
                                    !text.match(/^[A-Za-z\s]+$/) && // Not just letters
                                    !text.includes('Xóa hết câu trả lời') && !text.includes('Không bao giờ gửi mật khẩu') &&
                                    !text.includes('Tiếp') && !text.includes('Submit') && !text.includes('Gửi') &&
                                    !text.includes('Required') && !text.includes('Bắt buộc') &&
                                    !text.includes('Option') && !text.includes('Tùy chọn') &&
                                    !text.includes('Quay lại') && !text.includes('Back')) {
                                    possibleQuestions.push(text);
                                }
                            }
                        });
                        if (possibleQuestions.length > 0) {
                            const longest = possibleQuestions.reduce((longest, current) => current.length > longest.length ? current : longest);
                            return { strategy: 'text-nodes', text: longest, count: possibleQuestions.length };
                        }
                        return null;
                    },
                    
                    // Strategy 3: Use element's direct text content
                    () => {
                        const text = element.textContent?.trim();
                        if (text && text.length > 3 && text.length < 500) { 
                            return { strategy: 'direct', text: text };
                        }
                        return null;
                    }
                ];
                
                let extractedText = null;
                for (const strategy of textExtractionStrategies) {
                    const result = strategy();
                    if (result) {
                        extractedText = result;
                        results.push(`✅ Strategy ${result.strategy}: "${result.text.substring(0, 100)}..."`);
                        if (result.selector) results.push(`   Selector: ${result.selector}`);
                        if (result.count) results.push(`   Found ${result.count} text nodes`);
                        break;
                    }
                }
                
                if (!extractedText) {
                    results.push(`❌ No text extracted`);
                }
                
                results.push('');
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

debugTextExtraction().catch(console.error);
