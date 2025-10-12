# Contributing to Google Form Auto-Fill Tool

Cảm ơn bạn đã quan tâm đến việc đóng góp cho dự án này! 

## 🚨 Quan trọng

**⚠️ Đây là dự án mục đích học tập, chúng tôi không chịu trách nhiệm mọi trường hợp. Vui lòng chỉ để tham khảo.**

## 🤝 Cách đóng góp

### 1. Fork và Clone
```bash
# Fork repository trên GitHub
# Clone fork của bạn
git clone https://github.com/your-username/form-filler.git
cd form-filler

# Thêm upstream remote
git remote add upstream https://github.com/KiritoMainBro88/form-filler.git
```

### 2. Tạo Branch
```bash
# Tạo branch mới cho feature/bugfix
git checkout -b feature/your-feature-name
# hoặc
git checkout -b bugfix/your-bugfix-name
```

### 3. Development Setup
```bash
# Cài đặt dependencies
npm install

# Cài đặt Playwright browsers
npx playwright install chromium

# Chạy development mode
npm run dev
```

### 4. Code Style
- **TypeScript**: Sử dụng strict mode
- **ESLint**: Tuân thủ rules đã cấu hình
- **Prettier**: Format code tự động
- **Conventional Commits**: Sử dụng conventional commit messages

### 5. Testing
```bash
# Test với mock forms
npm run test:mock

# Test với real forms (cẩn thận!)
npm run test:real

# Build test
npm run build
```

### 6. Commit và Push
```bash
# Add changes
git add .

# Commit với conventional format
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug in form filling"
git commit -m "docs: update README"

# Push to your fork
git push origin feature/your-feature-name
```

### 7. Tạo Pull Request
1. Vào GitHub repository
2. Click "New Pull Request"
3. Chọn branch của bạn
4. Mô tả chi tiết thay đổi
5. Submit PR

## 📋 Pull Request Guidelines

### Title Format
```
type: brief description
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tested with mock forms
- [ ] Tested with real forms
- [ ] All tests pass
- [ ] No breaking changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Error handling implemented
```

## 🐛 Bug Reports

Khi báo cáo bug, vui lòng cung cấp:

1. **Environment**:
   - OS: Windows/macOS/Linux
   - Node.js version
   - npm version

2. **Steps to Reproduce**:
   - Form URL (nếu có thể)
   - Configuration used
   - Expected vs actual behavior

3. **Logs**:
   - Error messages
   - Console output
   - Screenshots (nếu cần)

4. **Additional Context**:
   - Browser used
   - Network conditions
   - Any workarounds found

## ✨ Feature Requests

Khi đề xuất tính năng mới:

1. **Use Case**: Mô tả tình huống sử dụng
2. **Proposed Solution**: Giải pháp đề xuất
3. **Alternatives**: Các phương án khác đã xem xét
4. **Implementation**: Ý tưởng implementation (nếu có)

## 🏗️ Development Guidelines

### Code Structure
```
src/
├── main/           # Electron main process
├── renderer/       # React renderer process
├── filler/         # Form filling logic
├── scanner/        # Form scanning logic
├── utils/          # Utilities
└── components/     # React components
```

### Naming Conventions
- **Files**: kebab-case (`form-filler.ts`)
- **Classes**: PascalCase (`FormFiller`)
- **Functions**: camelCase (`fillForm`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)

### Error Handling
```typescript
try {
  // Risky operation
} catch (error: any) {
  this.logger.error('Operation failed', error);
  throw new Error(`Operation failed: ${error.message}`);
}
```

### Logging
```typescript
// Use appropriate log levels
this.logger.debug('Debug information');
this.logger.info('General information');
this.logger.warn('Warning message');
this.logger.error('Error occurred', error);
```

## 🧪 Testing Guidelines

### Unit Tests
```typescript
describe('FormFiller', () => {
  it('should fill text input correctly', async () => {
    // Test implementation
  });
});
```

### Integration Tests
```typescript
describe('Form Scanning Integration', () => {
  it('should scan mock form successfully', async () => {
    // Test with mock forms
  });
});
```

### Manual Testing
1. Test với mock forms trước
2. Test với real forms (cẩn thận!)
3. Test edge cases
4. Test error scenarios

## 📚 Documentation

### Code Comments
```typescript
/**
 * Fills a form question with the specified strategy
 * @param page - Playwright page instance
 * @param questionId - Unique question identifier
 * @param strategy - Fill strategy configuration
 * @returns Promise that resolves when question is filled
 */
private async fillQuestion(page: Page, questionId: string, strategy: FillStrategy): Promise<void> {
  // Implementation
}
```

### README Updates
- Cập nhật hướng dẫn sử dụng
- Thêm examples mới
- Cập nhật troubleshooting

## 🔒 Security

### Sensitive Data
- Không commit API keys
- Không commit passwords
- Sử dụng environment variables
- Xóa sensitive data khỏi logs

### Form Data
- Không log form data
- Không store personal information
- Tuân thủ privacy guidelines

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/KiritoMainBro88/form-filler/issues)
- **Discussions**: [GitHub Discussions](https://github.com/KiritoMainBro88/form-filler/discussions)

## 🎯 Roadmap

Xem [README.md](README.md) để biết roadmap chi tiết.

## 📄 License

Dự án này sử dụng MIT License. Xem [LICENSE](LICENSE) để biết thêm chi tiết.

---

**Cảm ơn bạn đã đóng góp! 🙏**
