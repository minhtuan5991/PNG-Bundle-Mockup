# PNG Bundle Mockup v1.2.3

v1.2.3 bổ sung quyền chọn thư mục đích khi cài mới trên Windows.

## Thay đổi

- Bộ cài assisted có thêm trang chọn thư mục cài đặt.
- Nếu người dùng chọn một thư mục cha chưa chứa tên app, installer tự tạo thư mục con `PNG Bundle Mockup` để tránh rải file ứng dụng vào thư mục chung.
- Khi cập nhật một bản đã cài, installer tự bỏ qua trang chọn thư mục và giữ nguyên vị trí hiện có; app không tạo thêm bản cài hoặc shortcut trùng.
- Cài mới vẫn dùng chế độ current-user. Nên chọn thư mục mà tài khoản hiện tại có quyền ghi vì thư mục `Input` nằm cạnh file EXE và được dùng để chứa PDF/ảnh mockup của người dùng.

## Kiểm thử

- Xác minh cấu hình NSIS assisted bật `allowToChangeInstallationDirectory` và vẫn giữ `oneClick: false`.
- Chạy toàn bộ kiểm thử tự động và build lại installer, blockmap cùng `latest.yml` cho phiên bản 1.2.3.

## Cập nhật

Người đang dùng installer từ v1.2.0 đến v1.2.2 có thể nhận v1.2.3 bằng nút **Cập nhật** trong app. Khi cập nhật, vị trí cài đặt hiện tại được giữ nguyên.
