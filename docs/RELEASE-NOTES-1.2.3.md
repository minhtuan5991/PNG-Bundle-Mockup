# PNG Bundle Mockup v1.2.3

> Trạng thái: bản thay thế đã public tại [GitHub Release v1.2.3](https://github.com/minhtuan5991/PNG-Bundle-Mockup/releases/tag/v1.2.3), Release ID `366501729`.

v1.2.3 bổ sung quyền chọn thư mục đích khi cài mới trên Windows và làm gọn thư mục cài đặt. Release v1.2.3 ban đầu được chủ dự án yêu cầu xóa để thay trực tiếp bằng bộ cài mới cùng version.

## Thay đổi

- Bộ cài assisted có thêm trang chọn thư mục cài đặt.
- Nếu người dùng chọn một thư mục cha chưa chứa tên app, installer tự tạo thư mục con `PNG Bundle Mockup` để tránh rải file ứng dụng vào thư mục chung.
- Khi cập nhật một bản đã cài, installer tự bỏ qua trang chọn thư mục và giữ nguyên vị trí hiện có; app không tạo thêm bản cài hoặc shortcut trùng.
- Cài mới vẫn dùng chế độ current-user. Nên chọn thư mục mà tài khoản hiện tại có quyền ghi vì thư mục `Input` nằm cạnh file EXE và được dùng để chứa PDF/ảnh mockup của người dùng.
- Không xóa DLL/PAK/BIN bắt buộc. Installer chỉ gắn `Hidden` cho hai thư mục và 18 file kỹ thuật đã biết của Electron 43.2.0.
- Mặc định File Explorer chỉ hiện `Input`, `PNG Bundle Mockup.exe` và `Uninstall PNG Bundle Mockup.exe`; file riêng khác trong custom install path không bị ẩn.

## Kiểm thử

- 73/73 kiểm thử tự động đạt, không có test fail/skipped/todo.
- Xác minh cấu hình NSIS assisted bật `allowToChangeInstallationDirectory`, vẫn giữ `oneClick: false`, và template NSIS bỏ qua trang thư mục khi cập nhật.
- Test khóa danh sách runtime chính xác, không cho dùng wildcard và không cho ẩn `Input`, app EXE hoặc uninstaller.
- Build sạch từ commit phát hành chỉ chứa `README.txt` và PDF mẫu trong `Input`; bốn JPG riêng trên máy phát triển không nằm trong artifact.
- Silent install thật tại custom path chỉ hiện ba mục người dùng; 20 mục kỹ thuật Hidden, 0 mục ReadOnly.
- Packaged smoke đạt 16/16 check và chế độ backup `Input` thoát mã `0`.
- Installer, blockmap và `latest.yml` thay thế đều mang phiên bản 1.2.3; size và SHA-512 trong metadata khớp installer.
- Installer thay thế có kích thước 104.342.486 byte, SHA-256 `E9557F175F6489F1509300D28996675A971CEFD22A9F221BD1CCC5710D915339`. Blockmap có SHA-256 `2B1E785E1B1324FF9CE6885BC241118F246FD35A7BD322B4A856FA3ADCDB5B4A`; `latest.yml` có SHA-256 `6B27C6CF0E12ED87F3FEC7C7C4430D62D12B6FC91DC968046E19221909C02A68`.
- Bản này chưa có chữ ký số Authenticode.
- Kiểm thử cài mới tương tác tại đường dẫn tùy chọn và nâng cấp tại chỗ trên máy/VM sạch vẫn là hạng mục QA thủ công sau phát hành.

## Cập nhật

Người đang dùng installer từ v1.2.0 đến v1.2.2 có thể nhận v1.2.3 bằng nút **Cập nhật** trong app. Khi cập nhật, vị trí cài đặt hiện tại được giữ nguyên. Người đã cài bản v1.2.3 cũ sẽ không được updater tự tải lại cùng version; cần chạy installer thay thế thủ công nếu muốn áp dụng cách hiển thị thư mục mới.
