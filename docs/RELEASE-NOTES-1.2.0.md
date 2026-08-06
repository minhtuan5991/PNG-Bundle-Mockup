# PNG Bundle Mockup v1.2.0

Đây là bản cài Windows đầu tiên có kênh cập nhật online qua GitHub Releases.

## Tải và cài đặt

Tải `PNG-Bundle-Mockup-Setup-1.2.0.exe` trong phần Assets, chạy bộ cài, sau đó mở app bằng shortcut **PNG Bundle Mockup** trên Desktop hoặc Start Menu.

Người đang dùng bản portable `1.1.0` cần cài file Setup này thủ công một lần. Từ bản installer `1.2.0`, app sẽ tự kiểm tra các bản cập nhật stable mới hơn.

## Tính năng mới

- Nhớ vị trí thư mục PNG, ảnh nền và watermark đã chọn gần nhất.
- Hiển thị version trong title và giao diện app.
- Tự kiểm tra GitHub Releases, thông báo, tải và cài bản cập nhật theo lựa chọn của người dùng.
- Bộ cài NSIS x64 tạo shortcut Desktop và Start Menu có icon.
- Source/test/script phát triển không xuất hiện thành thư mục rời trong vị trí cài; chỉ giữ runtime cần thiết.
- Gallery thumbnail để chọn PNG trước khi nạp.
- Watermark PNG trong suốt trên lớp trên cùng.
- Xóa đủ Comment, EXIF, XMP, EXIF thumbnail, IPTC và ICC profile ở bước cuối.

## Xác minh tải xuống

SHA-256 của installer do GitHub Actions tạo:

```text
505BB85DA584F4003D74D1C687DC13AC2C05145AD20CAC70AA5B6FDD347E52F1
```

Release cũng bao gồm `latest.yml` và `.exe.blockmap`; cả ba file phải được giữ cùng nhau để updater hoạt động.

## Lưu ý

Installer hiện chưa được ký bằng chứng thư code-signing thương mại. Windows SmartScreen có thể hiển thị **Unknown Publisher**; hãy chỉ tải từ Release chính thức của repository này.
