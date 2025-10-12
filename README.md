# Google Form Auto-Fill Tool

> **⚠️ QUAN TRỌNG: Đây là dự án mục đích học tập, chúng tôi không chịu trách nhiệm mọi trường hợp. Vui lòng chỉ để tham khảo.**

Một công cụ desktop tự động điền Google Forms với giao diện hiện đại, hỗ trợ tất cả loại câu hỏi và nhiều chiến lược điền khác nhau.

## 🚀 Tính năng chính

### 📋 Quét Form
- **Tự động phát hiện**: Quét và phân tích cấu trúc Google Form
- **Đa loại câu hỏi**: Hỗ trợ text, multiple choice, checkbox, dropdown, linear scale, date, time, file upload
- **Multi-page support**: Quét form có nhiều trang
- **Anti-detection**: Stealth mode để tránh bị Google phát hiện

### ⚙️ Cấu hình linh hoạt
- **Chiến lược điền**: Random, Fixed, Sequential, Pattern, Skip
- **Chọn options**: Chọn cụ thể options cho multiple choice/checkbox
- **Execution settings**: Số lần chạy, delay, headless mode
- **Lưu/Load config**: Lưu và tải lại cấu hình

### 🎯 Điền Form thông minh
- **Human-like behavior**: Random delays, realistic typing
- **Progress tracking**: Theo dõi tiến độ real-time
- **Error handling**: Xử lý lỗi và retry logic
- **Screenshot logging**: Chụp ảnh màn hình khi có lỗi

### 📊 Analytics & Logging
- **Performance metrics**: Thống kê hiệu suất
- **Error analysis**: Phân tích lỗi chi tiết
- **Activity logs**: Log đầy đủ hoạt động
- **Export reports**: Xuất báo cáo

## 🛠️ Công nghệ sử dụng

- **Frontend**: Electron + React + TypeScript
- **UI Framework**: Shadcn/ui + Tailwind CSS
- **Automation**: Playwright với stealth plugin
- **Parsing**: node-fetch + jsdom
- **Logging**: Winston
- **Date/Time**: date-fns

## 📦 Cài đặt

### Yêu cầu hệ thống
- Node.js 18+ 
- npm hoặc yarn
- Windows/macOS/Linux

### Cài đặt dependencies
```bash
# Clone repository
git clone https://github.com/your-username/form-filler.git
cd form-filler

# Cài đặt dependencies
npm install

# Cài đặt Playwright browsers
npx playwright install chromium
```

## 🚀 Chạy ứng dụng

### Development mode
```bash
# Chạy cả main process và renderer
npm run dev

# Hoặc chạy riêng lẻ
npm run dev:main    # Main process
npm run dev:renderer # Renderer process
```

### Production build
```bash
# Build toàn bộ ứng dụng
npm run build

# Chạy production build
npm start
```

## 📖 Hướng dẫn sử dụng

### 1. Quét Google Form
1. Mở ứng dụng
2. Nhập URL Google Form vào ô "Form URL"
3. Click "Quét Form"
4. Đợi tool phân tích và hiển thị câu hỏi

### 2. Cấu hình chiến lược điền
1. Xem danh sách câu hỏi đã quét
2. Chọn chiến lược cho từng câu hỏi:
   - **Random**: Điền ngẫu nhiên
   - **Fixed**: Điền giá trị cố định
   - **Sequential**: Điền tuần tự
   - **Pattern**: Điền theo mẫu
   - **Skip**: Bỏ qua
3. Cho multiple choice/checkbox: Chọn options cụ thể
4. Cấu hình execution settings (số lần chạy, delay, headless)

### 3. Lưu cấu hình
1. Nhập tên cấu hình
2. Click "Lưu cấu hình"
3. Cấu hình sẽ được lưu để sử dụng sau

### 4. Tải cấu hình đã lưu
1. Click "Xem cấu hình đã lưu"
2. Chọn cấu hình từ danh sách
3. Click để load cấu hình

### 5. Thực thi điền form
1. Click "Bắt đầu điền"
2. Theo dõi tiến độ real-time
3. Xem kết quả và logs

## 🎛️ Chiến lược điền

### Random Strategy
```javascript
// Điền ngẫu nhiên
strategy: 'random'
```

### Fixed Strategy
```javascript
// Điền giá trị cố định
strategy: 'fixed',
value: 'John Doe'
```

### Pattern Strategy
```javascript
// Điền theo mẫu
strategy: 'pattern',
value: 'user{random}@example.com'
```

### Sequential Strategy
```javascript
// Điền tuần tự từ danh sách
strategy: 'sequential',
value: '["Option 1", "Option 2", "Option 3"]'
```

## 📁 Cấu trúc dự án

```
form-filler/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts          # Main entry point
│   │   ├── preload.ts       # Preload script
│   │   ├── filler/          # Form filling logic
│   │   ├── scanner/         # Form scanning logic
│   │   ├── utils/           # Utilities
│   │   └── ...
│   └── renderer/            # React renderer process
│       ├── src/
│       │   ├── components/  # React components
│       │   ├── lib/         # Utilities
│       │   └── App.tsx      # Main app component
│       └── index.html       # HTML template
├── configs/                 # Saved configurations
├── logs/                    # Application logs
├── dist/                    # Build output
└── package.json
```

## 🔧 Cấu hình

### Environment Variables
```bash
NODE_ENV=development  # development/production
LOG_LEVEL=info       # error/warn/info/debug
```

### Config Files
- **configs/**: Lưu trữ cấu hình form
- **logs/**: Log files và screenshots
- **package.json**: Dependencies và scripts

## 🧪 Testing

### Test Mock Forms
```bash
# Test với mock forms
node test-all-mock-forms.js

# Test comprehensive form
node test-comprehensive-form.js

# Test T-shirt form
node test-mock-form.js
```

### Test Real Forms
```bash
# Test với Google Form thật
node test-real-form.js
```

## 📊 Monitoring & Logs

### Log Files
- **logs/app.log**: Application logs
- **logs/error.log**: Error logs
- **logs/screenshots/**: Screenshots khi có lỗi

### Log Levels
- **ERROR**: Lỗi nghiêm trọng
- **WARN**: Cảnh báo
- **INFO**: Thông tin chung
- **DEBUG**: Debug information

## 🚨 Troubleshooting

### Common Issues

#### 1. Form không quét được
```bash
# Kiểm tra URL có đúng không
# Đảm bảo form không yêu cầu đăng nhập
# Thử với mock form trước
```

#### 2. Browser không mở
```bash
# Cài đặt Playwright browsers
npx playwright install chromium

# Kiểm tra headless mode
# Thử với headless: false
```

#### 3. Form không điền được
```bash
# Kiểm tra cấu hình chiến lược
# Xem logs để debug
# Thử với form đơn giản trước
```

### Debug Mode
```bash
# Chạy với debug logs
NODE_ENV=development npm run dev

# Xem logs chi tiết
tail -f logs/app.log
```

## 🤝 Contributing

### Development Setup
```bash
# Fork repository
git clone https://github.com/your-username/form-filler.git
cd form-filler

# Install dependencies
npm install

# Run in development
npm run dev
```

### Code Style
- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- Component-based architecture

## 📄 License

MIT License - Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## ⚠️ Disclaimer

**QUAN TRỌNG: Đây là dự án mục đích học tập, chúng tôi không chịu trách nhiệm mọi trường hợp. Vui lòng chỉ để tham khảo.**

- Tool này chỉ dành cho mục đích học tập và nghiên cứu
- Không sử dụng cho mục đích spam hoặc vi phạm ToS
- Tuân thủ Terms of Service của Google Forms
- Sử dụng có trách nhiệm và đạo đức

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/form-filler/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/form-filler/discussions)
- **Documentation**: [Wiki](https://github.com/your-username/form-filler/wiki)

## 🎯 Roadmap

### Phase 1: Core Features ✅
- [x] Form scanning
- [x] Basic form filling
- [x] Configuration management
- [x] Progress tracking

### Phase 2: Enhanced Features ✅
- [x] Advanced scanning
- [x] Smart fill strategies
- [x] Template system
- [x] Analytics dashboard

### Phase 3: User Experience ✅
- [x] Drag & drop interface
- [x] Validation rules
- [x] Scheduling
- [x] Notifications

### Phase 4: Advanced Features ✅
- [x] Cloud sync
- [x] Team collaboration
- [x] API integration
- [x] Custom scripts

## 🙏 Acknowledgments

- [Playwright](https://playwright.dev/) - Browser automation
- [Electron](https://electronjs.org/) - Desktop app framework
- [React](https://reactjs.org/) - UI library
- [Shadcn/ui](https://ui.shadcn.com/) - UI components
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

**Made with ❤️ for educational purposes**