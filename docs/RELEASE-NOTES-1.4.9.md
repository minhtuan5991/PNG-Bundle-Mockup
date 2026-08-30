# PNG Bundle Mockup v1.4.9 — Release Notes

Ngày: 2026-08-30

## Print Area

- Thêm thư mục `Print Area` cạnh file EXE; bản development dùng `Print Area` tại project root.
- `single-mockup-regions.json` và `group-shirt-regions.json` được đọc/ghi trực tiếp trong thư mục này.
- Lần mở đầu tiên tự chuyển JSON cũ từ `%APPDATA%\png-bundle-mockup` sang `Print Area`; bản cũ trong AppData được giữ lại để tương thích quay lui.
- JSON được snapshot vào `print-area-backup` trước update/uninstall và tự khôi phục nếu installer thay thế thư mục cài đặt.
- Người dùng có thể đóng app rồi copy JSON từ `Print Area` máy cũ sang máy mới. Mockup đơn cần giữ tên+kích thước; Group Shirt cần đúng file mockup gốc vì có fingerprint SHA-256.

## Tương thích

- Không thay đổi schema JSON, vùng in, quy tắc ghép ảnh, cách đặt tên output, Bundle PNG, PDF Download, watermark hoặc metadata.
- Installer chỉ đóng gói `Print Area/README.txt`, không mang JSON riêng từ máy build.
- Cài mới tiếp tục mặc định theo tài khoản hiện tại để `Input` và `Print Area` có quyền ghi. Không tự mở rộng ACL cho bản All Users cũ.

## QA local

- Automated tests đạt **159/159**, không fail/skipped/todo. Test mới bao phủ di trú hai JSON cũ, ưu tiên JSON copy từ máy khác, snapshot/restore sau update, sửa/xóa có chủ ý và đường dẫn hai region store.
- Packaged renderer smoke với hồ sơ QA riêng đạt **23/23**. Headless migration trên payload thoát mã `0`; SHA-256 của từng JSON tại AppData cũ, `Print Area` và `print-area-backup` giống hệt nhau.
- `app.asar` mang version `1.4.9`, có `print-area-storage.js` khớp byte mã nguồn và không chứa test. EXE có FileVersion `1.4.9`, ProductVersion `1.4.9.0`.
- Payload sau QA chỉ có `Print Area/README.txt`; `Input` chỉ có README và PDF mẫu allowlist. Không có JSON, marker hoặc bốn JPG riêng local.
- `latest.yml` khớp version, tên, kích thước và SHA-512 của installer. Authenticode: `NotSigned`.

## Artifact QA local

| File | Kích thước (byte) | SHA-256 |
| --- | ---: | --- |
| `PNG-Bundle-Mockup-Setup-1.4.9.exe` | 104373458 | `b7392927510671219a9d4e76586493998fd7317e7f16c5b541bdec6dbce2a979` |
| `PNG-Bundle-Mockup-Setup-1.4.9.exe.blockmap` | 109404 | `76de262558f9f56ff8f2ab38cb83e0a16a758f24f8fd823f0586d2beb75a2cb5` |
| `latest.yml` | 363 | `e89a38e48ba4b41446b4e37422c421618fed5519df5a4808a68b16201e2fb6ed` |

## Trạng thái

- Phát hành bằng tag mới `v1.4.9`; workflow Windows sẽ build lại từ tag, xác minh đúng ba artifact rồi công bố stable/latest. Không ghi đè tag hoặc asset của phiên bản cũ.
- Bộ cài chưa ký số; Windows có thể hiển thị SmartScreen/Unknown Publisher.
