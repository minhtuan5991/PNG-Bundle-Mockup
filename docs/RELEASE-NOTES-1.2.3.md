# PNG Bundle Mockup v1.2.3

v1.2.3 bổ sung quyền chọn thư mục đích khi cài mới trên Windows.

## Thay đổi

- Bộ cài assisted có thêm trang chọn thư mục cài đặt.
- Nếu người dùng chọn một thư mục cha chưa chứa tên app, installer tự tạo thư mục con `PNG Bundle Mockup` để tránh rải file ứng dụng vào thư mục chung.
- Khi cập nhật một bản đã cài, installer tự bỏ qua trang chọn thư mục và giữ nguyên vị trí hiện có; app không tạo thêm bản cài hoặc shortcut trùng.
- Cài mới vẫn dùng chế độ current-user. Nên chọn thư mục mà tài khoản hiện tại có quyền ghi vì thư mục `Input` nằm cạnh file EXE và được dùng để chứa PDF/ảnh mockup của người dùng.

## Kiểm thử

- 73/73 kiểm thử tự động đạt, không có test fail/skipped/todo.
- Xác minh cấu hình NSIS assisted bật `allowToChangeInstallationDirectory`, vẫn giữ `oneClick: false`, và template NSIS bỏ qua trang thư mục khi cập nhật.
- Build sạch từ commit phát hành chỉ chứa `README.txt` và PDF mẫu trong `Input`; bốn JPG riêng trên máy phát triển không nằm trong artifact.
- Installer, blockmap và `latest.yml` đều mang phiên bản 1.2.3; size và SHA-512 trong metadata khớp installer.
- Installer có kích thước 104.341.579 byte, SHA-256 `72F630F927D86DF7ABDA8748759A546B5A2492E6BF12597176BCA19C86FF02DA`. Bản này chưa có chữ ký số Authenticode.
- Kiểm thử cài mới tương tác tại đường dẫn tùy chọn và nâng cấp tại chỗ trên máy/VM sạch vẫn là hạng mục QA thủ công sau phát hành.

## Cập nhật

Người đang dùng installer từ v1.2.0 đến v1.2.2 có thể nhận v1.2.3 bằng nút **Cập nhật** trong app. Khi cập nhật, vị trí cài đặt hiện tại được giữ nguyên.
