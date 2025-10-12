const { chromium } = require('playwright');

async function debugFiltering() {
    console.log('🔍 Debugging Filtering Logic...\n');
    
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
        
        // Debug filtering
        const debugResult = await page.evaluate(() => {
            const results = [];
            
            // Get all Qr7Oae elements
            const questionElements = document.querySelectorAll('.Qr7Oae[role="listitem"]');
            results.push(`Total Qr7Oae elements: ${questionElements.length}\n`);
            
            questionElements.forEach((element, index) => {
                const text = element.textContent || '';
                const hasInput = element.querySelector('input, select, textarea, [role="radiogroup"], [role="checkbox"], iframe');
                const hasM7eMe = element.querySelector('.M7eMe');
                
                results.push(`=== Element ${index + 1} ===`);
                results.push(`Has Input: ${!!hasInput}`);
                results.push(`Has M7eMe: ${!!hasM7eMe}`);
                results.push(`Text length: ${text.length}`);
                results.push(`Text preview: ${text.substring(0, 100)}...`);
                
                // Check skip patterns (updated to match FormScanner.ts)
                const skipPatterns = [
                    'Tiếp', 'Next', 'Quay lại', 'Back', 'Submit', 'Gửi',
                    'Email or phone', 'Forgot email', 'Create account', 'Sign in',
                    'Không bao giờ gửi mật khẩu', 'Xóa hết câu trả lời',
                    'Powered by', 'Terms of Service', 'Privacy Policy',
                    'Biểu thị câu hỏi bắt buộc'
                ];
                
                let skippedByPattern = false;
                for (const pattern of skipPatterns) {
                    if (text.includes(pattern)) {
                        // Apply the same intelligent filtering logic as FormScanner.ts
                        const patternIndex = text.indexOf(pattern);
                        const beforePattern = text.substring(0, patternIndex).trim();
                        const afterPattern = text.substring(patternIndex + pattern.length).trim();
                        
                        // Skip if pattern is at the beginning with minimal text before/after
                        if (patternIndex < 10 && (beforePattern.length < 5 && afterPattern.length < 20)) {
                            results.push(`❌ SKIPPED by pattern: "${pattern}" (at beginning)`);
                            skippedByPattern = true;
                            break;
                        }
                        
                        // Skip if it's clearly a UI element (short text with pattern)
                        if (text.length < 50 && patternIndex < 20) {
                            results.push(`❌ SKIPPED by pattern: "${pattern}" (short UI element)`);
                            skippedByPattern = true;
                            break;
                        }
                        
                        results.push(`⚠️  Contains pattern "${pattern}" but not skipped (part of question)`);
                    }
                }
                
                if (!skippedByPattern) {
                    results.push(`✅ Not skipped by patterns`);
                }
                
                // Check question indicators
                const questionIndicators = [
                    '?', 'gì', 'nào', 'thế nào', 'Bạn', 'Anh', 'Chị', 'Ông', 'Bà',
                    'Công ty', 'Tên', 'Email', 'Địa chỉ', 'Số điện thoại', 'Tuổi',
                    'Giới tính', 'Nghề nghiệp', 'Thu nhập', 'Chi tiêu', 'Độ tuổi',
                    'Có', 'Không', 'Đồng ý', 'Không đồng ý', 'Bình thường',
                    'Nam', 'Nữ', 'Học sinh', 'Sinh viên', 'Nhân viên', 'Kinh doanh',
                    'Enter', 'What', 'Please', 'Tell', 'About', 'Experience',
                    'T/F', 'Which', 'Paste', 'How to', 'True', 'False'
                ];
                
                const hasQuestionIndicator = questionIndicators.some(indicator => 
                    text.toLowerCase().includes(indicator.toLowerCase())
                );
                
                results.push(`Has question indicator: ${hasQuestionIndicator}`);
                
                // Final decision
                const shouldInclude = (!hasInput && !hasM7eMe) ? false :
                                    (text.length < 3) ? false :
                                    skippedByPattern ? false :
                                    hasM7eMe ? true :
                                    hasQuestionIndicator || (text.length > 5 && text.length < 500);
                
                results.push(`Should include: ${shouldInclude}`);
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

debugFiltering().catch(console.error);
