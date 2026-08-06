# Changelog

Các thay đổi đáng chú ý của PNG Bundle Mockup được lưu tại đây. Dự án dùng phiên bản Semantic Versioning.

## [Unreleased]

### Fixed

- Quy trình GitHub Release nay kiểm tra và upload nguyên bộ installer, blockmap và `latest.yml`; hỗ trợ chạy lại thủ công theo tag để sửa release thiếu asset.

## [1.2.0] - 2026-08-06

### Added

- Nhớ vị trí thư mục PNG, ảnh nền và watermark trong hồ sơ người dùng Windows.
- Bộ cài NSIS 64-bit với icon, shortcut Desktop và Start Menu.
- Hiển thị phiên bản trong tiêu đề cửa sổ và giao diện.
- Kiểm tra, tải và cài bản cập nhật từ GitHub Releases.
- Workflow Windows CI và phát hành tự động khi đẩy tag `vX.Y.Z`.
- Tài liệu bàn giao, phát hành và kiểm thử hồi quy.

### Changed

- Kênh phân phối chính chuyển từ portable sang installer để hỗ trợ cập nhật online.
- Source, test và script phát triển được đóng trong/loại khỏi bộ cài; người dùng chỉ cần shortcut để mở app.

## [1.1.0] - 2026-08-06

### Added

- Gallery thumbnail để chọn PNG trước khi nạp.
- Tùy chọn watermark PNG trong suốt trên lớp trên cùng.
- Tùy chọn xóa đủ Comment, EXIF, XMP, EXIF thumbnail, IPTC và ICC profile ở bước cuối.

## [1.0.0] - 2026-08-03

### Added

- Chọn PNG và ảnh nền, chia đều thành nhiều mockup.
- Cắt theo vùng alpha thật, tự tính hàng/cột, khoảng cách và vùng lề.
- Preview, tạo thư mục `Done`, tránh ghi đè và hủy tác vụ an toàn.
