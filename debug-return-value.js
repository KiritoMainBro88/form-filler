const { chromium } = require('playwright');

async function debugReturnValue() {
    console.log('🔍 Debugging Return Value...\n');
    
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
        
        // Test the exact same logic as in FormScanner but with detailed logging
        const debugResult = await page.evaluate((isDev) => {
            const questions = [];
            
            // Get all Qr7Oae elements
            const questionElements = document.querySelectorAll('.Qr7Oae[role="listitem"]');
            console.log(`Found ${questionElements.length} elements`);
            
            const validQuestionElements = Array.from(questionElements || []).filter((element) => {
                const text = element.textContent || '';
                const hasInput = element.querySelector('input, select, textarea, [role="radiogroup"], [role="checkbox"], iframe');
                const hasM7eMe = element.querySelector('.M7eMe');
                
                if (!hasInput && !hasM7eMe) return false;
                if (text.length < 3) return false;
                
                // Skip patterns
                const skipPatterns = [
                    'Tiếp', 'Next', 'Quay lại', 'Back', 'Submit', 'Gửi',
                    'Email or phone', 'Forgot email', 'Create account', 'Sign in',
                    'Không bao giờ gửi mật khẩu', 'Xóa hết câu trả lời',
                    'Powered by', 'Terms of Service', 'Privacy Policy',
                    'Biểu thị câu hỏi bắt buộc'
                ];
                
                for (const pattern of skipPatterns) {
                    if (text.includes(pattern)) {
                        const patternIndex = text.indexOf(pattern);
                        const beforePattern = text.substring(0, patternIndex).trim();
                        const afterPattern = text.substring(patternIndex + pattern.length).trim();
                        
                        if (patternIndex < 10 && (beforePattern.length < 5 && afterPattern.length < 20)) {
                            return false;
                        }
                        
                        if (text.length < 50 && patternIndex < 20) {
                            return false;
                        }
                    }
                }
                
                if (hasM7eMe) return true;
                
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
                
                return hasQuestionIndicator || (text.length > 5 && text.length < 500);
            });
            
            console.log(`Valid elements after filtering: ${validQuestionElements.length}`);
            
            // Extract questions
            validQuestionElements.forEach((element, index) => {
                console.log(`\nProcessing element ${index + 1}:`);
                
                // Extract question text
                let questionText = '';
                const titleElement = element.querySelector('.M7eMe');
                if (titleElement && titleElement.textContent) {
                    questionText = titleElement.textContent.trim();
                    console.log(`Found text: "${questionText}"`);
                }
                
                if (!questionText) {
                    questionText = `Question ${index + 1}`;
                    console.log(`Using fallback: "${questionText}"`);
                }
                
                // Detect question type
                let questionType = 'text';
                const inputElement = element.querySelector('input, select, textarea');
                const radioButtons = element.querySelectorAll('input[type="radio"]');
                const checkboxes = element.querySelectorAll('input[type="checkbox"]');
                const selectElement = element.querySelector('select');
                const textareaElement = element.querySelector('textarea');
                const videoElement = element.querySelector('iframe[src*="youtube"]');
                const radiogroup = element.querySelector('[role="radiogroup"]');
                const checkboxGroup = element.querySelector('[role="checkbox"]');
                
                if (videoElement) {
                    questionType = 'video';
                } else if (radioButtons.length > 0 || radiogroup) {
                    questionType = 'multiple_choice';
                } else if (checkboxes.length > 0 || checkboxGroup) {
                    questionType = 'checkbox';
                } else if (selectElement) {
                    questionType = 'dropdown';
                } else if (textareaElement) {
                    questionType = 'paragraph';
                } else if (inputElement) {
                    const inputType = inputElement.type || 'text';
                    if (inputType === 'email') questionType = 'email';
                    else if (inputType === 'number') questionType = 'number';
                    else if (inputType === 'date') questionType = 'date';
                    else if (inputType === 'time') questionType = 'time';
                    else questionType = 'text';
                }
                
                // Check if required
                const required = element.querySelector('[aria-required="true"]') !== null || 
                               element.querySelector('*[required]') !== null ||
                               questionText.includes('*');
                
                // Extract options
                let options = [];
                if (questionType === 'multiple_choice' || questionType === 'checkbox') {
                    const optionElements = element.querySelectorAll('input[type="radio"], input[type="checkbox"]');
                    options = Array.from(optionElements).map(opt => {
                        const label = opt.closest('label') || opt.nextElementSibling;
                        return label ? label.textContent?.trim() || opt.value : opt.value;
                    }).filter(Boolean);
                } else if (questionType === 'dropdown') {
                    const optionElements = element.querySelectorAll('option');
                    options = Array.from(optionElements).map(opt => opt.textContent?.trim()).filter(Boolean);
                }
                
                const question = {
                    id: `question_${index + 1}`,
                    type: questionType,
                    question: questionText,
                    required: required,
                    options: options
                };
                
                console.log(`Created question:`, question);
                questions.push(question);
            });
            
            console.log(`\nTotal questions created: ${questions.length}`);
            return questions;
        }, true);
        
        console.log('\n📊 Returned Questions:');
        console.log('================================');
        debugResult.forEach((question, index) => {
            console.log(`Question ${index + 1}:`);
            console.log(`  Type: ${question.type}`);
            console.log(`  Text: "${question.question}"`);
            console.log(`  Required: ${question.required}`);
            if (question.options && question.options.length > 0) {
                console.log(`  Options: [${question.options.join(', ')}]`);
            }
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
    } finally {
        await browser.close();
    }
}

debugReturnValue().catch(console.error);
