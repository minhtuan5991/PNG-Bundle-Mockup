# PNG Bundle Mockup v1.2.4

> Bản phát hành Windows x64 stable tại [GitHub Release v1.2.4](https://github.com/minhtuan5991/PNG-Bundle-Mockup/releases/tag/v1.2.4), Release ID `366528649`. Bộ cài chưa có chữ ký số Authenticode.

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
- Windows CI `31148857568` và Release Windows `31148871833` đều thành công trên commit/tag `7d52662`; clean `npm ci`, 73/73 test, packaged `Input` và build NSIS đều đạt.
- Installer public có kích thước 104.343.028 byte, SHA-256 `9A4B93EA670B9C42CB8C4FE3E26B236EBB0C079884514BAA4CA2E42EFC1B468C`; Authenticode **NotSigned**. Blockmap SHA-256 `0C5E4C5081527069AF917AC06D8BB814EBF3D24983EF119D325E7ADD82FF1B8B`; `latest.yml` SHA-256 `42A378200FBA0DAE48D18E9F3D4E651C883A9D0D02C893E25BA248B92E75E8C6` và khớp version/path/size/SHA-512 của installer remote.
- Test cấu hình khóa việc giữ `Input`, xóa đúng app files, xóa AppData/updater cache chỉ khi uninstall thật và bảo toàn atomic update.
- Ba asset GitHub đã được tải ngược và xác minh từng byte; `/releases/latest` trỏ đúng v1.2.4.
- Silent-uninstall trong registry sandbox không thực thi phần xóa dù trả mã `0`; vẫn cần kiểm tra cài–gỡ tương tác trên Windows/VM bình thường.
