# Mock Forms for Testing

This directory contains mock forms that replicate the structure and behavior of real online forms for testing purposes.

## Available Mock Forms

### 1. T-shirt Order Form (`mock-tshirt-form.html`)
- **URL**: `http://localhost:8080/mock-form`
- **Questions**: 4
- **Types**: Text inputs (all required)
- **Questions**:
  1. Favorite color (text, required)
  2. Last name (text, required)
  3. Phone (text, required)
  4. Email (email, required)

### 2. Comprehensive Test Form (`mock-comprehensive-form.html`)
- **URL**: `http://localhost:8080/comprehensive-form`
- **Questions**: 8
- **Types**: Multiple question types
- **Questions**:
  1. What is your name? (text, required)
  2. What is your favorite color? (multiple choice, required)
  3. Which programming languages do you know? (checkbox, optional)
  4. What is your experience level? (dropdown, required)
  5. Rate your satisfaction (1-5) (linear scale, required)
  6. Tell us about yourself (paragraph, optional)
  7. What is your birth date? (date, required)
  8. What time do you prefer for meetings? (time, optional)

## How to Use

### Start the Mock Server
```bash
node serve-mock-form.js
```

The server will start on `http://localhost:8080` and serve both forms:
- T-shirt Form: `http://localhost:8080/mock-form`
- Comprehensive Form: `http://localhost:8080/comprehensive-form`

### Test the Forms
```bash
# Test T-shirt form only
node test-mock-form.js

# Test comprehensive form only
node test-comprehensive-form.js

# Test both forms
node test-all-mock-forms.js
```

## Form Structure

Both mock forms use the same HTML structure as real online forms:

- **Container**: `.Qr7Oae` elements for each question
- **Question Text**: `.M7eMe` spans containing the question text
- **Required Indicator**: `.vnumgf` spans with asterisk (*)
- **Input Elements**: Various input types (text, email, radio, checkbox, select, textarea, date, time)
- **Form Submission**: Simulated with JavaScript alert

## Testing Results

✅ **T-shirt Order Form**: 4/4 questions detected correctly
✅ **Comprehensive Test Form**: 8/8 questions detected correctly

All question types are properly detected:
- Text inputs
- Multiple choice (radio buttons)
- Checkboxes
- Dropdowns
- Linear scales
- Paragraph text
- Date inputs
- Time inputs

## Integration with FormScanner

The mock forms are designed to work seamlessly with the `FormScanner` class:

```javascript
const FormScanner = require('./dist/main/scanner/FormScanner').FormScanner;
const scanner = new FormScanner();

// Scan the T-shirt form
const result = await scanner.scanForm('http://localhost:8080/mock-form');
console.log(`Detected ${result.questions.length} questions`);

// Scan the comprehensive form
const result2 = await scanner.scanForm('http://localhost:8080/comprehensive-form');
console.log(`Detected ${result2.questions.length} questions`);
```

## Benefits

1. **Consistent Testing**: Mock forms provide consistent test data
2. **No Internet Required**: Forms run locally without needing real Google Forms
3. **Controlled Environment**: Predictable structure and content
4. **Multiple Question Types**: Tests all supported question types
5. **Easy Debugging**: Can modify forms to test specific scenarios

## File Structure

```
├── mock-tshirt-form.html          # Simple 4-question form
├── mock-comprehensive-form.html   # Complex 8-question form
├── serve-mock-form.js            # HTTP server for mock forms
├── test-mock-form.js             # Test script for T-shirt form
├── test-comprehensive-form.js    # Test script for comprehensive form
├── test-all-mock-forms.js        # Test script for both forms
└── MOCK_FORMS_README.md          # This documentation
```

## Notes

- The mock forms use the same CSS classes and structure as real Google Forms
- All forms include the confirmation message "Câu trả lời của bạn đã được ghi lại." when submitted
- The server includes CORS headers for cross-origin requests
- Forms are served with proper HTML content type and UTF-8 encoding
