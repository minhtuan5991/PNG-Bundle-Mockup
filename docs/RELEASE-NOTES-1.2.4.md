# PNG Bundle Mockup v1.2.4

> Bản phát hành Windows x64 stable tại [GitHub Release v1.2.4](https://github.com/minhtuan5991/PNG-Bundle-Mockup/releases/tag/v1.2.4). Bản này thay trực tiếp Release v1.2.4 ban đầu theo yêu cầu chủ dự án; bộ cài chưa có chữ ký số Authenticode.

v1.2.4 thay đổi cơ chế gỡ cài đặt để xóa dữ liệu kỹ thuật của app nhưng vẫn giữ tài sản người dùng.

## Thay đổi

- Khi uninstall thật, giữ nguyên thư mục `Input` tại vị trí đã cài cùng toàn bộ PDF/ảnh mẫu bên trong.
- Xóa EXE, uninstaller, DLL/PAK/BIN và các thư mục runtime Electron bằng danh sách chính xác; không xóa đệ quy toàn bộ thư mục cài đặt.
- Xóa shortcut, registry, cache/thiết lập tại `%APPDATA%\png-bundle-mockup` và bộ cài cập nhật tại `%LOCALAPPDATA%\png-bundle-mockup-updater`.
- Không chạm tới `Done`, PNG nguồn, mockup hoặc PDF đã tạo trong các thư mục làm việc bên ngoài.
- Khi update, giữ nguyên cơ chế backup/restore `Input`, AppData và updater cache để không mất thiết lập giữa hai phiên bản.
- Chỉ tạo mockup đơn một lần cho mỗi thư mục `Done`. Nếu đã có file `single_*.png` (không phân biệt chữ hoa/thường), app giữ nguyên file cũ và bỏ qua toàn bộ bước mockup đơn.
- Kiểm tra kết quả cũ diễn ra trước validation PNG nguồn, ảnh mẫu và vùng in; mockup bundle PNG không bị nhận nhầm là mockup đơn.
- UI giữ checkbox **Tạo mockup đơn** ngay cả khi `Input` đang thiếu ảnh để backend có thể bỏ qua an toàn nếu `Done` đã có kết quả.

## File tạm

Mockup bundle, mockup đơn, PDF và các file thiết lập vẫn dùng file `.tmp` để ghi an toàn. Luồng thành công, lỗi hoặc hủy bình thường đều dọn file tạm trong `finally`. Uninstaller không quét các thư mục làm việc bên ngoài để tránh xóa nhầm file cá nhân.

## Kiểm thử hiện tại

- 74/74 automated tests đạt, gồm kiểm thử bỏ qua mockup đơn trước mọi validation và không nhận nhầm mockup bundle.
- Artifact thay thế được dựng sạch từ source chỉ chứa tài sản `Input` đã track. Installer 104.343.270 byte, SHA-256 `406E4AFEFDAE453D6A2057366787DC352FDBACE0BDB267E0D00B96237BB2839E`; checksum public sẽ được đối chiếu lại sau khi workflow hoàn tất.
- Test cấu hình khóa việc giữ `Input`, xóa đúng app files, xóa AppData/updater cache chỉ khi uninstall thật và bảo toàn atomic update.
- Release/tag v1.2.4 ban đầu bị xóa và thay bằng đúng ba asset mới; từng asset được tải ngược để xác minh trước khi chốt.
- Silent-uninstall trong registry sandbox không thực thi phần xóa dù trả mã `0`; vẫn cần kiểm tra cài–gỡ tương tác trên Windows/VM bình thường.
