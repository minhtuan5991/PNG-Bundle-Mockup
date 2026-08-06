# PNG Bundle Mockup

Ứng dụng desktop Windows để chọn một nhóm PNG bằng hình preview, tự động cắt phần canvas trong suốt, chia đều thành nhiều mockup và ghép lên một ảnh nền mẫu.

## Tính năng

- Chọn thư mục rồi xem gallery thumbnail lớn trước khi quyết định PNG nào được nạp vào app.
- Nhớ vị trí đã chọn gần nhất của thư mục PNG, ảnh nền và watermark cho lần mở hộp thoại tiếp theo.
- Có thể tiếp tục chọn/bỏ từng PNG trong danh sách chính.
- Chọn ảnh nền PNG/JPG/WEBP/TIFF.
- Chia đều file: `30 / 2 → 15 + 15`, `31 / 2 → 16 + 15`.
- Chỉ dùng bounding box của pixel có alpha lớn hơn ngưỡng; canvas trong suốt không làm thiết kế bị thu nhỏ.
- Tự chọn số hàng/cột tối ưu, giữ nguyên tỉ lệ và dùng Lanczos khi resize.
- Lề trên/dưới mặc định 195 px; lề ngang và khoảng cách có thể chỉnh.
- Gắn một watermark PNG trong suốt lên lớp trên cùng của mọi mockup.
- Xóa Metadata mặc định ở bước cuối: Comment, EXIF, XMP, EXIF thumbnail, IPTC và ICC profile.
- Preview đúng bố cục và watermark trước khi xuất.
- Lưu vào `<thư mục PNG>\Done` và không ghi đè kết quả cũ.
- Xử lý nền, hiển thị tiến trình và có thể huỷ an toàn.
- Hiển thị phiên bản ngay trên tên app và kiểm tra cập nhật từ GitHub Releases.
- Bộ cài Windows tạo icon ngoài Desktop và Start Menu; máy người dùng không cần Node.js hay `start-app.bat`.

## Cách sử dụng

1. Bấm **Chọn thư mục và xem PNG**.
2. Trong cửa sổ thumbnail, chọn các ảnh cần dùng rồi bấm **Nạp X PNG**. Hủy hoặc nhấn `Esc` sẽ giữ nguyên danh sách cũ.
3. Bấm **Chọn ảnh nền mẫu**.
4. Giữ **Xóa Metadata** được bật nếu muốn làm sạch sáu nhóm metadata ở file cuối.
5. Nếu cần watermark, bật **Gắn Watermark** và chọn một PNG có pixel nền trong suốt.
6. Nhập số mockup. Dòng “Chia file” cho biết số PNG trên từng ảnh.
7. Giữ lề trên/dưới ở `195 px` hoặc mở **Thiết lập nâng cao** để điều chỉnh.
8. Bấm **Xem trước**, sau đó bấm **Tạo mockup**.
9. Bấm **Mở thư mục Done** để xem kết quả.

App chỉ nhớ vị trí để mở đúng thư mục/file ở lần chọn sau; app không tự nạp lại PNG hoặc tự bật watermark khi khởi động. File đã bị xóa hoặc đổi tên sẽ được bỏ qua an toàn và hộp thoại sẽ mở tại thư mục cha còn tồn tại.

Ảnh nền và watermark nằm trong thư mục nguồn sẽ tự bị loại khỏi danh sách thiết kế. PNG hoàn toàn trong suốt hoặc bị hỏng sẽ được báo tên cụ thể.

## Quy tắc Watermark

- Watermark phải thực sự là PNG, có kênh alpha và có ít nhất một pixel nền trong suốt.
- Watermark được ghép sau tất cả thiết kế nên luôn nằm trên lớp trên cùng.
- Nếu bằng kích thước ảnh nền, watermark được đặt nguyên kích thước tại `(0, 0)`.
- Nếu lớn hơn ảnh nền, watermark được thu vừa khung, giữ tỉ lệ và căn giữa.
- Watermark nhỏ hơn ảnh nền không bị phóng lớn; app dùng alpha/opacity gốc của file.

## Xử lý Metadata

Khi **Xóa Metadata** được bật, app hoàn thành bố cục và watermark trước, sau đó mã hóa lại PNG ở bước cuối và xác minh không còn:

- Comment
- EXIF
- XMP
- EXIF thumbnail
- IPTC
- ICC profile

Khi bỏ chọn, app giữ metadata của ảnh nền trong khả năng định dạng PNG đầu ra hỗ trợ. Metadata của các PNG thiết kế và watermark không được trộn vào file kết quả.

## Cài đặt trên Windows

1. Tải `PNG-Bundle-Mockup-Setup-X.Y.Z.exe` từ mục **Releases** của repository.
2. Chạy bộ cài và chọn thư mục cài nếu cần.
3. Mở app bằng icon **PNG Bundle Mockup** trên Desktop hoặc Start Menu.

Từ bản installer `1.2.0`, app tự kiểm tra phiên bản ổn định mới sau khi mở, sau đó kiểm tra lại định kỳ. Khi có bản mới, người dùng chủ động chọn **Tải cập nhật** và **Khởi động lại và cài đặt**. Bản portable `1.1.0` cũ không có updater nên cần cài file Setup một lần để chuyển sang kênh cập nhật này.

## Chạy mã nguồn dành cho phát triển

Yêu cầu Node.js `22.12.0` trở lên.

```powershell
npm.cmd install
npm.cmd start
```

`start-app.bat` chỉ là tiện ích dành cho thư mục mã nguồn; file này không nằm trong app sau khi cài.

## Kiểm thử

```powershell
npm.cmd test
```

## Đóng gói Windows

```powershell
npm.cmd run build:win
```

Hoặc chạy `build-windows.bat`. Bộ cài được tạo tại `release/PNG-Bundle-Mockup-Setup-X.Y.Z.exe`. Bản cài dùng NSIS 64-bit theo từng tài khoản Windows, tạo shortcut Desktop/Start Menu và đóng mã nguồn vào `app.asar`; các thư mục `src`, `test`, `scripts`, `node_modules` của dự án không xuất hiện riêng trong vị trí cài.

Để phát hành cập nhật online, tăng version rồi đẩy tag `vX.Y.Z`. Workflow GitHub Actions sẽ chạy test, build và đưa đồng thời `Setup.exe`, `.blockmap`, `latest.yml` vào một GitHub Release. Xem [hướng dẫn phát hành](docs/RELEASE-GUIDE.md).

Bản build local chưa có chứng thư code-signing thương mại, vì vậy Windows SmartScreen có thể cảnh báo ở lần mở đầu tiên. Khi file đến từ đúng thư mục build này, chọn **More info → Run anyway** để chạy.

## Cấu trúc

- `src/engine/layout.js`: chia nhóm, tính grid và vị trí.
- `src/engine/image-engine.js`: đọc alpha, crop, watermark, metadata, composite và lưu file.
- `src/main.js`: cửa sổ Electron, hộp thoại hệ thống và tác vụ nền.
- `src/services/path-preferences.js`: lưu đường dẫn an toàn trong hồ sơ người dùng.
- `src/services/update-service.js`: trạng thái và thao tác cập nhật GitHub.
- `src/renderer/`: giao diện tiếng Việt.
- `test/`: kiểm thử layout và xử lý ảnh thật.
- `.github/workflows/`: CI và phát hành Windows theo tag.
- `docs/PROJECT-HISTORY.md`: lịch sử kỹ thuật và thông tin bàn giao sau khi dọn Codex.
