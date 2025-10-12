<!-- 7f277879-66c5-4f83-a088-c452f8ae0077 f1c3bed0-7e89-4994-a20a-3bed494c1ff0 -->
# Google Form Auto-Fill Tool - Implementation Plan

## 1. Khởi tạo dự án

### Cấu trúc thư mục

```
gg-form-tool/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # React UI
│   ├── scanner/        # Form scanning logic
│   ├── filler/         # Form filling automation
│   └── utils/          # Helpers, config manager
├── configs/            # Lưu cấu hình JSON
├── package.json
├── tsconfig.json
└── claude.md          # Context file
```

### Dependencies chính

- Electron + React + TypeScript
- Playwright (Chrome automation) + playwright-extra với stealth plugin
- node-fetch (API requests) - replaced axios
- jsdom (HTML parsing) - replaced cheerio
- Tailwind CSS + Shadcn/ui (Modern UI components)
- date-fns (Date/time handling)
- winston (Logging system)

## 2. Scanner Module - Quét Google Form

### Chiến lược quét kết hợp (Multi-method)

**Method 1: API/HTML Parsing**

- Fetch HTML của form qua node-fetch
- Parse với jsdom để extract questions
- Nhanh, nhẹ, không cần mở browser

**Method 2: Playwright Browser Automation**

- Mở Chrome headless
- Quét DOM thực tế
- Xử lý dynamic content, JavaScript-rendered elements

**Method 3: Cross-validation**

- So sánh kết quả từ cả 2 methods
- Merge data, ưu tiên method 2 nếu conflict
- Đảm bảo không bỏ sót câu hỏi

### Phát hiện các loại câu hỏi

Hỗ trợ tất cả loại Google Form:

- Short answer / Paragraph text
- Multiple choice (radio)
- Checkboxes
- Dropdown
- Linear scale
- Multiple choice grid
- Checkbox grid
- Date / Time
- File upload

### Output Scanner

```json
{
  "formUrl": "...",
  "formTitle": "...",
  "questions": [
    {
      "id": "entry.123456",
      "type": "multiple_choice",
      "question": "Câu hỏi?",
      "required": true,
      "options": ["A", "B", "C"]
    }
  ]
}
```

## 3. Desktop Dashboard (Electron + React)

### Main Window Features

**Screen 1: Form URL Input**

- Input field nhập URL Google Form
- Button "Quét Form"
- Loading indicator khi đang quét

**Screen 2: Configuration Dashboard**

- Hiển thị tất cả câu hỏi đã quét
- Mỗi câu hỏi có:
  - Preview câu hỏi
  - Dropdown chọn chiến lược điền:
    - "Random" - chọn ngẫu nhiên
    - "Fixed Value" - giá trị cố định do user nhập
    - "Sequential" - tuần tự qua các options
    - "Pattern" - theo pattern (vd: email@{random}.com)
    - "Skip" - bỏ qua (nếu không required)
  - Input/selector tương ứng với chiến lược

**Screen 3: Execution Control**

- Input số lần chạy
- Button "Lưu cấu hình"
- Button "Bắt đầu"
- Progress bar + log console
- Thống kê: Thành công/Thất bại

### UI Design

- Modern, clean interface với Tailwind CSS
- Dark/Light mode toggle
- Responsive layout
- Real-time status updates

## 4. Filler Module - Tự động điền Form

### Playwright Automation Flow

1. Khởi động Chrome browser (có thể headless hoặc visible)
2. Navigate đến form URL
3. Đợi page load hoàn toàn
4. Với mỗi câu hỏi theo config:

   - Locate element bằng entry ID hoặc selector
   - Áp dụng chiến lược điền tương ứng
   - Điền giá trị
   - Validate đã điền thành công

5. Click nút Submit
6. Đợi đến trang confirmation ("Câu trả lời của bạn đã được ghi lại")
7. Verify success
8. Close browser hoặc reset cho lần tiếp theo

### Xử lý từng loại input

- **Text fields**: type() với delay tự nhiên
- **Radio/Checkbox**: click() trên label hoặc input
- **Dropdown**: select option
- **Scale**: click vào số tương ứng
- **Date/Time**: fill với format đúng
- **File upload**: setInputFiles() nếu có file được config

### Error Handling

- Retry logic nếu element không tìm thấy
- Screenshot khi lỗi
- Log chi tiết vào file
- Tiếp tục hoặc dừng tùy user config

## 5. Config Manager

### Lưu/Load cấu hình JSON

```json
{
  "formUrl": "...",
  "formTitle": "...",
  "savedAt": "timestamp",
  "fillStrategies": {
    "entry.123": {
      "strategy": "random",
      "value": null
    },
    "entry.456": {
      "strategy": "fixed",
      "value": "John Doe"
    }
  },
  "executionSettings": {
    "runs": 10,
    "delayBetweenRuns": 2000,
    "headless": false
  }
}
```

### Features

- Save config với tên tùy chọn
- Load config đã lưu
- List tất cả configs
- Delete config
- Export/Import config

## 6. IPC Communication (Electron)

### Main Process

- Quản lý window lifecycle
- Handle file system operations (save/load configs)
- Spawn Playwright processes
- Quản lý browser instances

### Renderer Process

- UI logic với React
- Send commands qua IPC
- Nhận updates real-time từ main process

### IPC Channels

- `scan-form`: Trigger quét form
- `save-config`: Lưu cấu hình
- `load-config`: Load cấu hình
- `start-filling`: Bắt đầu điền form
- `filling-progress`: Update progress
- `filling-complete`: Hoàn thành

## 7. Testing & Validation

- Test với nhiều loại Google Form khác nhau
- Verify tất cả loại câu hỏi được detect đúng
- Test error cases (network issues, invalid URL, etc.)
- Performance test với nhiều lần chạy

## 8. Documentation

### README.md

- Hướng dẫn cài đặt
- Hướng dẫn sử dụng
- Screenshots
- Troubleshooting

### claude.md

- Context và progress tracking
- Technical decisions
- Known issues
- Future improvements

### To-dos

- [x] Khởi tạo dự án Electron + TypeScript + React với cấu trúc thư mục và dependencies
- [x] Implement scanner method 1: API/HTML parsing với node-fetch và jsdom
- [x] Implement scanner method 2: Playwright browser automation để quét DOM
- [x] Implement logic merge và validate kết quả từ 2 scanner methods
- [x] Implement detection cho tất cả loại câu hỏi Google Form (text, multiple choice, checkbox, dropdown, scale, date, time, file upload)
- [x] Setup Electron main process với window management và IPC handlers
- [x] Tạo Screen 1: Form URL input với Tailwind CSS styling
- [x] Tạo Screen 2: Configuration dashboard hiển thị questions và fill strategies
- [x] Tạo Screen 3: Execution control với progress tracking và logs
- [x] Implement Config Manager để save/load JSON configs
- [x] Setup Playwright automation cho form filling với browser control
- [x] Implement tất cả fill strategies (random, fixed, sequential, pattern, skip)
- [x] Implement handlers cho tất cả loại input (text, radio, checkbox, dropdown, scale, date, time, file)
- [x] Implement validation và confirmation page detection
- [x] Kết nối IPC giữa renderer và main process cho tất cả operations
- [x] Implement error handling, retry logic, và logging system
- [x] Test với nhiều loại Google Form và edge cases
- [x] Tạo README.md và update claude.md với full documentation

## Phase 2: Enhanced Functionality 🚀

### Advanced Features
- [ ] **Smart Question Detection**: Improve accuracy with machine learning
- [ ] **Dynamic Form Analysis**: Handle complex nested forms
- [ ] **Real-time Form Monitoring**: Detect form changes automatically
- [ ] **Advanced Anti-detection**: Rotate user agents, proxy support
- [ ] **Form Validation**: Pre-fill validation before submission
- [ ] **Custom Data Sources**: CSV, JSON, database integration

### User Experience Improvements
- [ ] **Form Preview Mode**: Visual representation of form structure
- [ ] **Drag & Drop Interface**: Reorder questions and strategies
- [ ] **Template Library**: Pre-built configurations for common forms
- [ ] **Bulk Operations**: Process multiple forms simultaneously
- [ ] **Progress Analytics**: Detailed success/failure statistics
- [ ] **Export/Import**: Share configurations between users

### Performance & Reliability
- [ ] **Parallel Processing**: Multiple browser instances
- [ ] **Caching System**: Cache form structures for faster scanning
- [ ] **Retry Mechanisms**: Smart retry with exponential backoff
- [ ] **Error Recovery**: Graceful handling of network issues
- [ ] **Memory Optimization**: Efficient resource management
- [ ] **Performance Monitoring**: Real-time performance metrics

## Phase 3: Enterprise Features 🏢

### Collaboration & Management
- [ ] **Team Workspaces**: Multi-user collaboration
- [ ] **Role-based Access**: Admin, user, viewer permissions
- [ ] **Audit Logs**: Track all user actions
- [ ] **Configuration Versioning**: Git-like version control
- [ ] **Approval Workflows**: Review and approve configurations
- [ ] **Centralized Management**: Admin dashboard for all forms

### Integration & Automation
- [ ] **API Gateway**: RESTful API for external integrations
- [ ] **Webhook Support**: Real-time notifications
- [ ] **Scheduled Execution**: Cron-like scheduling
- [ ] **Event Triggers**: Form filling based on external events
- [ ] **Data Pipeline**: ETL processes for form data
- [ ] **Third-party Integrations**: Zapier, IFTTT, etc.

### Security & Compliance
- [ ] **Encryption**: End-to-end data encryption
- [ ] **GDPR Compliance**: Data privacy and protection
- [ ] **Audit Trails**: Complete activity logging
- [ ] **Access Controls**: Fine-grained permissions
- [ ] **Data Retention**: Configurable data lifecycle
- [ ] **Compliance Reporting**: Automated compliance reports

## Current Status ✅

**Phase 1 Complete**: Core functionality implemented and working
- ✅ All basic features working
- ✅ App launches successfully
- ✅ No critical bugs
- ✅ Ready for production use

**Next Steps**: Begin Phase 2 development
- Focus on enhanced functionality
- Improve user experience
- Add advanced features
- Performance optimization
