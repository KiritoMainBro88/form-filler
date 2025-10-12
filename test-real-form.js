const { chromium } = require('playwright');
const path = require('path');

async function testRealFormDetection() {
    console.log('🧪 Testing Real Google Form Detection...\n');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
        const page = await browser.newPage();
        
        // Test with real Google Form URL
        const realFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSd9gYiUPMeav4H7jh2_8FdTtLCQ8ROYiF1I5y-kN4y5JhoDDw/viewform';
        
        console.log('📋 Loading real Google Form...');
        console.log('URL:', realFormUrl);
        
        await page.goto(realFormUrl, { waitUntil: 'networkidle' });
        await page.waitForTimeout(3000);
        
        // Test our enhanced detection logic
        const detectionResult = await page.evaluate(() => {
            const questions = [];
            
            // Enhanced Google Forms detection based on real form analysis
            const questionSelectors = [
                // Primary Google Forms selectors (2024) - from real form analysis
                '.Qr7Oae[role="listitem"]',  // Main question container
                '.freebirdFormviewerViewItemsItemItem',
                '.freebirdFormviewerViewItemsQuestionItem',
                '[data-params]',
                
                // Alternative selectors for different form versions
                '[jsname="YPqjbf"]',
                '.M7eMe',
                '[data-item-id]',
                
                // Generic form element containers
                '[role="listitem"]',
                '.form-item',
                '.question-item',
                
                // Direct form controls
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
            
            // Enhanced filtering (matching tool logic)
            const validQuestionElements = Array.from(questionElements || []).filter((element) => {
                const text = element.textContent || '';
                const hasInput = element.querySelector('input, select, textarea, [role="radiogroup"], [role="checkbox"], iframe');
                const hasM7eMe = element.querySelector('.M7eMe'); // Primary question indicator from real forms
                
                // Must have form controls OR M7eMe element (question text)
                if (!hasInput && !hasM7eMe) return false;
                
                // Skip if element is too small (likely UI elements)
                if (text.length < 3) return false;
                
                // Skip navigation and UI elements - be more specific to avoid filtering real questions
                const skipPatterns = [
                    'Tiếp', 'Next', 'Quay lại', 'Back', 'Submit', 'Gửi',
                    'Email or phone', 'Forgot email', 'Create account', 'Sign in',
                    'Không bao giờ gửi mật khẩu', 'Xóa hết câu trả lời',
                    'Powered by', 'Terms of Service', 'Privacy Policy',
                    'Biểu thị câu hỏi bắt buộc'
                ];
                
                // Check skip patterns but be more intelligent about it
                for (const pattern of skipPatterns) {
                    if (text.includes(pattern)) {
                        // If the pattern appears at the beginning or as a standalone element, skip
                        // But if it's part of a longer question text, don't skip
                        const patternIndex = text.indexOf(pattern);
                        const beforePattern = text.substring(0, patternIndex).trim();
                        const afterPattern = text.substring(patternIndex + pattern.length).trim();
                        
                        // Skip if pattern is at the beginning with minimal text before/after
                        if (patternIndex < 10 && (beforePattern.length < 5 && afterPattern.length < 20)) {
                            return false;
                        }
                        
                        // Skip if it's clearly a UI element (short text with pattern)
                        if (text.length < 50 && patternIndex < 20) {
                            return false;
                        }
                    }
                }
                
                // If has M7eMe element, it's likely a question
                if (hasM7eMe) return true;
                
                // Check if element looks like a real question
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
                
                // Accept if it has question indicators OR if it's a form control with reasonable text
                return hasQuestionIndicator || (text.length > 5 && text.length < 500);
            });
            
            console.log(`Valid question elements after filtering: ${validQuestionElements.length}`);
            
            // Extract questions with enhanced detection (matching tool logic)
            validQuestionElements.forEach((element, index) => {
                const text = element.textContent || '';
                const inputElement = element.querySelector('input, select, textarea');
                const radioButtons = element.querySelectorAll('input[type="radio"]');
                const checkboxes = element.querySelectorAll('input[type="checkbox"]');
                const selectElement = element.querySelector('select');
                const textareaElement = element.querySelector('textarea');
                const videoElement = element.querySelector('iframe[src*="youtube"]');
                const radiogroup = element.querySelector('[role="radiogroup"]');
                const checkboxGroup = element.querySelector('[role="checkbox"]');
                
                // Extract question text from M7eMe span (primary selector from real form)
                const questionSpan = element.querySelector('.M7eMe');
                const questionText = questionSpan ? questionSpan.textContent.trim() : `Question ${index + 1}`;
                
                // Determine question type and extract options (matching tool logic)
                let questionType = 'text';
                let options = [];
                
                if (videoElement) {
                    questionType = 'video';
                } else if (radioButtons.length > 0 || radiogroup) {
                    questionType = 'multiple_choice';
                    // Extract options from radio buttons or radiogroup
                    if (radioButtons.length > 0) {
                        radioButtons.forEach((radio) => {
                            const label = radio.nextElementSibling || radio.parentElement.querySelector('label');
                            if (label && label.textContent) {
                                const text = label.textContent.trim();
                                if (text && !options.includes(text)) {
                                    options.push(text);
                                }
                            }
                        });
                    } else if (radiogroup) {
                        // Extract from radiogroup structure (from real form)
                        const radioOptions = radiogroup.querySelectorAll('[role="radio"]');
                        radioOptions.forEach((radio) => {
                            const text = radio.getAttribute('aria-label') || radio.textContent?.trim();
                            if (text && !options.includes(text)) {
                                options.push(text);
                            }
                        });
                    }
                } else if (checkboxes.length > 0 || checkboxGroup) {
                    questionType = 'checkbox';
                    // Extract options from checkboxes
                    if (checkboxes.length > 0) {
                        checkboxes.forEach((checkbox) => {
                            const label = checkbox.nextElementSibling || checkbox.parentElement.querySelector('label');
                            if (label && label.textContent) {
                                const text = label.textContent.trim();
                                if (text && !options.includes(text)) {
                                    options.push(text);
                                }
                            }
                        });
                    } else if (checkboxGroup) {
                        // Extract from checkbox group structure (from real form)
                        const checkboxOptions = checkboxGroup.querySelectorAll('[role="checkbox"]');
                        checkboxOptions.forEach((checkbox) => {
                            const text = checkbox.getAttribute('aria-label') || checkbox.textContent?.trim();
                            if (text && !options.includes(text)) {
                                options.push(text);
                            }
                        });
                    }
                } else if (selectElement) {
                    questionType = 'dropdown';
                    const optionElements = selectElement.querySelectorAll('option');
                    optionElements.forEach((option) => {
                        if (option.textContent && option.textContent.trim()) {
                            options.push(option.textContent.trim());
                        }
                    });
                } else if (textareaElement) {
                    questionType = 'paragraph';
                } else if (inputElement) {
                    const inputType = inputElement.type || inputElement.tagName.toLowerCase();
                    if (inputType === 'date') {
                        questionType = 'date';
                    } else if (inputType === 'time') {
                        questionType = 'time';
                    } else if (inputType === 'file') {
                        questionType = 'file_upload';
                    } else {
                        questionType = 'text';
                    }
                }
                
                const required = element.querySelector('[aria-required="true"]') !== null || 
                               element.querySelector('*[required]') !== null ||
                               questionText.includes('*');
                
                questions.push({
                    id: `entry.${index + 1}`,
                    type: questionType,
                    question: questionText,
                    required: required,
                    options: options.length > 0 ? options : undefined,
                    rawText: text.substring(0, 100) + '...'
                });
            });
            
            return questions;
        });
        
        console.log('\n📊 Real Form Detection Results:');
        console.log('================================');
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
        
        // Test specific elements from the real form
        console.log('🔍 Testing specific elements from real form:');
        const specificTest = await page.evaluate(() => {
            const results = [];
            
            // Test M7eMe elements (question text)
            const m7eMeElements = document.querySelectorAll('.M7eMe');
            results.push(`Found ${m7eMeElements.length} .M7eMe elements`);
            
            // Test Qr7Oae elements (question containers)
            const qr7OaeElements = document.querySelectorAll('.Qr7Oae[role="listitem"]');
            results.push(`Found ${qr7OaeElements.length} .Qr7Oae[role="listitem"] elements`);
            
            // Test radiogroup elements
            const radiogroupElements = document.querySelectorAll('[role="radiogroup"]');
            results.push(`Found ${radiogroupElements.length} [role="radiogroup"] elements`);
            
            // Test checkbox elements
            const checkboxElements = document.querySelectorAll('[role="checkbox"]');
            results.push(`Found ${checkboxElements.length} [role="checkbox"] elements`);
            
            // Test video elements
            const videoElements = document.querySelectorAll('iframe[src*="youtube"]');
            results.push(`Found ${videoElements.length} YouTube video elements`);
            
            return results;
        });
        
        specificTest.forEach(result => console.log(result));
        
        console.log('\n✅ Real form test completed successfully!');
        console.log('🎯 Tool should now detect real Google Forms correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await browser.close();
    }
}

// Run the test
testRealFormDetection().catch(console.error);
