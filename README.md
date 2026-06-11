# Form Auto-Fill Tool

**Ngôn ngữ:** Tiếng Việt | [English](README.en.md)

> **⚠️ QUAN TRỌNG: Đây là dự án mục đích học tập. Chỉ dùng để tham khảo, tự chịu trách nhiệm khi sử dụng.**

Công cụ desktop tự động quét và điền Google Form, với giao diện hiện đại. Quét trọn vẹn form nhiều trang trong một lần, hỗ trợ nhiều chiến lược điền.

## Tính năng

- **Quét đầy đủ**: Đọc trực tiếp cấu trúc form nhúng trong trang (`FB_PUBLIC_LOAD_DATA_`), lấy 100% câu hỏi của **tất cả các trang** trong một lần load, không cần bấm "Tiếp" hay điền trước.
- **Đa loại câu hỏi**: text, paragraph, multiple choice, checkbox, dropdown, linear scale, date, time.
- **Form nhiều trang (sections)**: Tự nhận biết số trang, định vị câu hỏi theo nội dung (chịu được section header / rẽ nhánh) và chuyển trang đúng thứ tự.
- **Kế hoạch trả lời theo tỉ lệ (weighted)**: Mỗi đáp án có trọng số %; chọn 1 thì theo tỉ lệ tương đối, checkbox thì xác suất độc lập kèm min/max số lựa chọn.
- **Quy trình JSON + AI**: Xuất kế hoạch ra JSON (kèm hướng dẫn cho AI điền nội dung & tỉ lệ), import lại và **validate nghiêm** trước khi chạy.
- **Dry-run bắt buộc**: Điền thử toàn bộ nhưng KHÔNG gửi, chụp màn hình trang cuối để duyệt trước khi chạy thật.
- **Báo cáo phân phối & ảnh lỗi**: Thống kê thực tế từng đáp án đã chọn; tự chụp màn hình khi có lỗi.
- **Anti-detection**: Dùng [`puppeteer-real-browser`](https://github.com/zfcsoftware/puppeteer-real-browser) (rebrowser + ghost-cursor) và tự xử lý Cloudflare Turnstile.
- **Theo dõi tiến độ & logs**: Cập nhật real-time, ghi log bằng Winston.

## Công nghệ

- **Desktop**: Electron + React + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Automation**: puppeteer-real-browser (puppeteer-core)
- **Logging**: Winston

## Cài đặt

Yêu cầu: Node.js 18+.

```bash
npm install
```

`puppeteer-real-browser` tự tải Chrome khi chạy lần đầu. Trên Linux cần `xvfb`:

```bash
sudo apt-get install xvfb
```

## Chạy ứng dụng

```bash
# Development (main + renderer)
npm run dev

# Production build
npm run build
npm start
```

## Cách dùng

1. **Quét Form**: Dán URL Google Form (`https://docs.google.com/forms/d/e/.../viewform`) rồi bấm "Quét Form". App tạo sẵn một **kế hoạch trả lời** mẫu (tỉ lệ chia đều).
2. **Kế hoạch trả lời**: Chỉnh tỉ lệ % từng đáp án bằng slider, hoặc:
   - **Xuất JSON** → gửi file cho AI (file có sẵn phần `_instructions` hướng dẫn AI điền nội dung text & tỉ lệ) → **Nhập JSON** lại.
   - App **validate nghiêm**: câu bắt buộc thiếu đáp án, email sai định dạng, đáp án không nằm trong options... đều bị báo đỏ và chặn chạy.
3. **Thực thi**:
   - **Chạy thử (dry-run)** trước: điền hết các trang nhưng KHÔNG gửi, chụp màn hình để bạn duyệt.
   - Sau khi dry-run đạt, đặt số lần chạy / độ trễ / ẩn-hiện browser rồi **Chạy thật**.
   - Xem **báo cáo phân phối** (mỗi đáp án đã chọn bao nhiêu lần) và ảnh chụp khi có lỗi.

## Tỉ lệ (weighted) hoạt động thế nào

| Loại câu hỏi                              | Ý nghĩa `weight`                                                        |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| multiple_choice / dropdown / linear_scale | Tỉ lệ **tương đối**, chọn đúng 1 (vd `Có:90, Không:10` → ~90% "Có")     |
| checkbox                                  | Xác suất **độc lập** (0..100%) mỗi option được tick, kèm min/max        |
| text / paragraph / date / time            | Danh sách câu trả lời mẫu, chọn 1 theo tỉ lệ                            |

## Cấu trúc dự án

```
src/
├── main/        # Electron main process + preload (IPC)
├── scanner/     # FormScanner: đọc FB_PUBLIC_LOAD_DATA_, fallback DOM
├── filler/      # FormFiller: điền weighted theo trang, dry-run, ảnh lỗi, báo cáo
├── utils/       # AnswerPlan (template + validate + weighted), ConfigManager, Logger
└── renderer/    # React UI (scan → plan → execute)
configs/         # Cấu hình đã lưu (JSON)
logs/            # Log của Winston + logs/screenshots (ảnh dry-run & lỗi)
```

## Scripts

```bash
npm run dev        # Chạy dev (main + renderer)
npm run build      # Build main + renderer
npm start          # Chạy bản đã build
npm run lint       # ESLint
npm run typecheck  # Kiểm tra type cho main + renderer
npm run dist       # Đóng gói app (electron-builder)
```

## Giới hạn đã biết

- File upload và grid (multiple choice grid / checkbox grid) chưa được hỗ trợ điền.
- Form yêu cầu đăng nhập Google không quét được (không công khai).
- Cấu trúc `FB_PUBLIC_LOAD_DATA_` do Google định nghĩa, có thể đổi trong tương lai; khi đó scanner tự lùi về chế độ quét DOM của trang hiện tại.

## License

MIT - xem [LICENSE](LICENSE).

## Disclaimer

Dự án phục vụ học tập và nghiên cứu. Không dùng để spam hay vi phạm điều khoản dịch vụ. Sử dụng có trách nhiệm.
