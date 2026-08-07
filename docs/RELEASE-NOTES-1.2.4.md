# PNG Bundle Mockup v1.2.4

> Trạng thái: đang chuẩn bị local, chưa push/tag/Release GitHub.

v1.2.4 thay đổi cơ chế gỡ cài đặt để xóa dữ liệu kỹ thuật của app nhưng vẫn giữ tài sản người dùng.

## Thay đổi

- Khi uninstall thật, giữ nguyên thư mục `Input` tại vị trí đã cài cùng toàn bộ PDF/ảnh mẫu bên trong.
- Xóa EXE, uninstaller, DLL/PAK/BIN và các thư mục runtime Electron bằng danh sách chính xác; không xóa đệ quy toàn bộ thư mục cài đặt.
- Xóa shortcut, registry, cache/thiết lập tại `%APPDATA%\png-bundle-mockup` và bộ cài cập nhật tại `%LOCALAPPDATA%\png-bundle-mockup-updater`.
- Không chạm tới `Done`, PNG nguồn, mockup hoặc PDF đã tạo trong các thư mục làm việc bên ngoài.
- Khi update, giữ nguyên cơ chế backup/restore `Input`, AppData và updater cache để không mất thiết lập giữa hai phiên bản.

## File tạm

Mockup bundle, mockup đơn, PDF và các file thiết lập vẫn dùng file `.tmp` để ghi an toàn. Luồng thành công, lỗi hoặc hủy bình thường đều dọn file tạm trong `finally`. Uninstaller không quét các thư mục làm việc bên ngoài để tránh xóa nhầm file cá nhân.

## Kiểm thử hiện tại

- 73/73 automated tests đạt.
- Clean `npm ci` báo 0 vulnerability; NSIS v1.2.4 build thành công từ commit `152a51e` với packaged `Input` chỉ có README/PDF đã track.
- Installer local có kích thước 104.343.023 byte, SHA-256 `E5B71C2A614EEF788B31F815F4ED6914539716A79FCA88074156EF9082CD25D9`; Authenticode **NotSigned**. Blockmap SHA-256 `77874955AD9058A10B12AEDC1C4DFF5509B31D45A42C3E0CB539CBC2B2DF874E`; `latest.yml` SHA-256 `C2A8C8F22E06427518A0DA6C17367250008C61E9510E83F2F9870864ED6CDDC6` và khớp size/SHA-512 của installer.
- Test cấu hình khóa việc giữ `Input`, xóa đúng app files, xóa AppData/updater cache chỉ khi uninstall thật và bảo toàn atomic update.
- Silent-uninstall trong registry sandbox không thực thi phần xóa dù trả mã `0`; cần kiểm tra cài–gỡ tương tác trên Windows/VM bình thường trước khi phát hành.
