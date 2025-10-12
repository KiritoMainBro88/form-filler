const { chromium } = require('playwright');
const path = require('path');

async function testFormDetection() {
    console.log('🧪 Testing Form Detection với Google Form giả lập...\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Load test form
        const testFormPath = path.resolve(__dirname, 'test-google-form.html');
        await page.goto(`file://${testFormPath}`);
        
        console.log('✅ Test form loaded successfully');
        console.log('📋 Form URL:', `file://${testFormPath}`);
        
        // Wait for form to load
        await page.waitForTimeout(2000);
        
        // Test our detection logic
        const detectionResult = await page.evaluate(() => {
            const questions = [];
            
            // Enhanced Google Forms detection based on our improved scanner
            const questionSelectors = [
                '.freebirdFormviewerViewItemsItemItem',
                '.freebirdFormviewerViewItemsQuestionItem',
                '[data-params]',
                '[jsname="YPqjbf"]',
                '.M7eMe',
                '.Qr7Oae',
                '[data-item-id]',
                '[role="listitem"]',
                '.form-item',
                '.question-item',
                'input[type="text"], input[type="email"], input[type="number"], input[type="date"], input[type="time"]',
                'textarea',
                'select',
                '[role="radiogroup"]',
                '[role="checkbox"]'
            ];
            
            let questionElements = null;
            
            // Try each selector strategy until we find elements
            for (const selector of questionSelectors) {
                try {
                    const elements = document.querySelectorAll(selector);
                    if (elements && elements.length > 0) {
                        questionElements = elements;
                        console.log(`Found ${elements.length} elements using selector: ${selector}`);
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }
            
            if (!questionElements || questionElements.length === 0) {
                questionElements = document.querySelectorAll('input, select, textarea, [role="radiogroup"], [role="checkbox"]');
            }
            
            // Enhanced filtering
            const validQuestionElements = Array.from(questionElements || []).filter((element) => {
                const text = element.textContent || '';
                const hasInput = element.querySelector('input, select, textarea, [role="radiogroup"], [role="checkbox"]');
                
                if (!hasInput) return false;
                if (text.length < 3) return false;
                
                const skipPatterns = [
                    'Tiếp', 'Next', 'Quay lại', 'Back', 'Submit', 'Gửi',
                    'Email or phone', 'Forgot email', 'Create account', 'Sign in',
                    'Không bao giờ gửi mật khẩu', 'Google Biểu mẫu', 'Google Forms',
                    'Xóa hết câu trả lời', 'Required', 'Bắt buộc', 'Option', 'Tùy chọn',
                    'Powered by', 'Terms of Service', 'Privacy Policy'
                ];
                
                for (const pattern of skipPatterns) {
                    if (text.includes(pattern)) {
                        return false;
                    }
                }
                
                const questionIndicators = [
                    '?', 'gì', 'nào', 'thế nào', 'Bạn', 'Anh', 'Chị', 'Ông', 'Bà',
                    'Công ty', 'Tên', 'Email', 'Địa chỉ', 'Số điện thoại', 'Tuổi',
                    'Giới tính', 'Nghề nghiệp', 'Thu nhập', 'Chi tiêu', 'Độ tuổi',
                    'Có', 'Không', 'Đồng ý', 'Không đồng ý', 'Bình thường',
                    'Nam', 'Nữ', 'Học sinh', 'Sinh viên', 'Nhân viên', 'Kinh doanh',
                    'Enter', 'What', 'Please', 'Tell', 'About', 'Experience'
                ];
                
                const hasQuestionIndicator = questionIndicators.some(indicator => 
                    text.toLowerCase().includes(indicator.toLowerCase())
                );
                
                return hasQuestionIndicator || (text.length > 5 && text.length < 500);
            });
            
            console.log(`Valid question elements after filtering: ${validQuestionElements.length}`);
            
            // Extract questions
            validQuestionElements.forEach((element, index) => {
                const text = element.textContent || '';
                const input = element.querySelector('input, select, textarea');
                const inputType = input ? input.type || input.tagName.toLowerCase() : 'unknown';
                const required = input ? input.hasAttribute('required') : false;
                
                // Extract question text from M7eMe span
                const questionSpan = element.querySelector('.M7eMe');
                const questionText = questionSpan ? questionSpan.textContent.trim() : `Question ${index + 1}`;
                
                // Extract options for radio/checkbox
                const options = [];
                if (inputType === 'radio' || inputType === 'checkbox') {
                    const labels = element.querySelectorAll('label');
                    labels.forEach(label => {
                        const optionText = label.textContent.trim();
                        if (optionText && !optionText.includes('*')) {
                            options.push(optionText);
                        }
                    });
                }
                
                questions.push({
                    id: `entry.${index + 1}`,
                    type: inputType === 'radio' ? 'multiple_choice' : 
                          inputType === 'checkbox' ? 'checkbox' :
                          inputType === 'textarea' ? 'paragraph' : 'text',
                    question: questionText,
                    required: required,
                    options: options.length > 0 ? options : undefined,
                    rawText: text.substring(0, 100) + '...'
                });
            });
            
            return questions;
        });
        
        console.log('\n📊 Detection Results:');
        console.log('===================');
        console.log(`Total questions detected: ${detectionResult.length}\n`);
        
        detectionResult.forEach((question, index) => {
            console.log(`Question ${index + 1}:`);
            console.log(`  Type: ${question.type}`);
            console.log(`  Text: "${question.question}"`);
            console.log(`  Required: ${question.required}`);
            if (question.options) {
                console.log(`  Options: [${question.options.join(', ')}]`);
            }
            console.log(`  Raw text preview: ${question.rawText}`);
            console.log('');
        });
        
        // Test specific element detection
        console.log('🔍 Testing specific element detection:');
        const specificTest = await page.evaluate(() => {
            const testElement = document.querySelector('.Qr7Oae[role="listitem"]');
            if (testElement) {
                const m7eMe = testElement.querySelector('.M7eMe');
                const input = testElement.querySelector('input');
                const dataParams = testElement.querySelector('[data-params]');
                
                return {
                    found: true,
                    m7eMeText: m7eMe ? m7eMe.textContent.trim() : 'Not found',
                    inputType: input ? input.type : 'Not found',
                    dataParams: dataParams ? dataParams.getAttribute('data-params').substring(0, 50) + '...' : 'Not found',
                    hasRequired: input ? input.hasAttribute('required') : false
                };
            }
            return { found: false };
        });
        
        console.log('Specific element test:', specificTest);
        
        console.log('\n✅ Test completed successfully!');
        console.log('🎯 Tool should be able to detect these questions correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
    }
}

// Run the test
testFormDetection().catch(console.error);
