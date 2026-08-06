# PNG Bundle Mockup v1.2.2

v1.2.2 là bản vá ổn định cho luồng PDF Download, mockup đơn, trình chỉnh vùng in và vòng đời cửa sổ của v1.2.1.

## Lỗi đã sửa

- **Tạo mockup đơn** luôn có thể được bật. Khi chọn, app quét lại `Input`, nhận các ảnh PNG/JPG/WEBP/TIFF mới thêm và mở Thiết lập nâng cao nếu còn ảnh chưa có vùng in.
- **Chỉnh vùng in mockup đơn** luôn có thể được mở để quét lại `Input`; Preview hiển thị lần lượt từng ảnh với vùng cố định tỷ lệ `42:48`, hỗ trợ kéo, di chuyển, đổi kích thước và lưu lại.
- Checkbox PDF và mockup đơn không còn làm cửa sổ cuộn xuống một vùng tối che giao diện.
- Đóng app không còn phát sinh lỗi main process `TypeError: Object has been destroyed`.
- **Tạo PDF Download** chỉ tạo PDF khi `Done` chưa có PDF. Nếu đã có bất kỳ file `.pdf` nào, app giữ nguyên file đó, báo đã bỏ qua và không tạo `_2`, `_3`, ...
- PDF bị bỏ qua không được tính là file mới và không bị xóa nếu một bước khác của lượt tạo thất bại.

## Cách dùng mockup đơn

1. Mở **Input** và thêm các ảnh mockup đơn.
2. Mở **Thiết lập nâng cao** rồi bật **Chỉnh vùng in mockup đơn**.
3. Chỉnh vùng `42:48` trên từng trang Preview và bấm **Lưu vùng in**.
4. Bật **Tạo mockup đơn**, chọn PNG/ảnh nền như bình thường rồi bấm tạo.

App tạo một ảnh PNG cho mỗi ảnh mockup trong `Input` và lưu chung với mockup bundle trong `Done`.

## Xác minh

- 73/73 kiểm thử tự động đạt; 0 fail, 0 skipped/todo.
- `npm audit --omit=dev --audit-level=high`: 0 lỗ hổng runtime.
- Source Electron/CDP nhận đúng 4 ảnh JPG thử nghiệm, bật **Tạo mockup đơn**, mở Preview `1/4`, kéo vùng in đúng tỷ lệ `42:48` và bật PDF mà `scrollY` vẫn bằng `0`.
- Đóng cửa sổ thật thoát mã `0`; stderr không có `Object has been destroyed` hoặc lỗi ứng dụng.
- Bản `win-unpacked` v1.2.2 đạt cả basic smoke và region-editor smoke; title/header hiển thị đúng `PNG Bundle Mockup v1.2.2`.
- NSIS build tạo đủ Setup, blockmap và `latest.yml`; installer hiện chưa có chữ ký Authenticode thương mại nên Windows có thể hiển thị **Unknown Publisher**.

## Cập nhật

Người đang dùng installer v1.2.0 hoặc v1.2.1 có thể nhận v1.2.2 qua nút **Cập nhật** trong app. Người dùng portable v1.1.0 cần tải file Setup thủ công từ [GitHub Release v1.2.2](https://github.com/minhtuan5991/PNG-Bundle-Mockup/releases/tag/v1.2.2).
