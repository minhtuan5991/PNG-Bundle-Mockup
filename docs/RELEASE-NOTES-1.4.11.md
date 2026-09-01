# PNG Bundle Mockup v1.4.11 — Release Notes

Ngày: 2026-09-01

## Mockup đơn theo từng nhóm

- Trong luồng Group Shirt, mỗi nhóm PNG dùng tất cả ảnh nền mockup đơn đã chọn.
- Ví dụ 3 nhóm PNG và 3 ảnh nền tạo 9 mockup đơn: 3 ảnh nhóm 1, 3 ảnh nhóm 2 và 3 ảnh nhóm 3.
- Mỗi ảnh nền chọn ngẫu nhiên PNG áo sáng (`.wh` hoặc không có tag màu) trong đúng nhóm; PNG không bị trộn giữa các nhóm.
- Output mang dạng `single_[Nhóm]_<tên nền>.png` để phân biệt nhóm.

## Quy tắc giữ nguyên

- Vùng in `42×48`, toàn bộ canvas PNG, watermark, xóa metadata và ảnh nền tự chọn không đổi.
- Cơ chế chỉ tạo mockup đơn một lần trong `Done` không đổi: nếu đã có `single_*.png`, app bỏ qua toàn bộ bước này.
- Luồng mockup Bundle và phần ghép Group Shirt chính không thay đổi.

## QA local

- Regression test có trường hợp chính xác 3 nhóm × 3 nền = 9 ảnh và kiểm tra mỗi nhóm chỉ dùng nguồn của chính nó.
- Automated tests đạt **166/166**; source Electron smoke và packaged smoke đều đạt **25/25**.
- NSIS x64 build thành công. ASAR mang version `1.4.11`, 25/25 file `src/assets` khớp byte và không chứa test.
- Payload sau smoke đã được dọn về đúng allowlist: `Input` chỉ có README/PDF mẫu; `Print Area` chỉ có README.
- `latest.yml` khớp version/path/size/SHA-512 của installer. EXE có FileVersion và ProductVersion `1.4.11`.
- Chưa kiểm thử cài mới/nâng cấp tương tác trên máy hoặc VM sạch.
- Bộ cài chưa ký số; Windows có thể hiển thị SmartScreen/Unknown Publisher.

## Artifact QA local

| File | Kích thước (byte) | SHA-256 |
| --- | ---: | --- |
| `PNG-Bundle-Mockup-Setup-1.4.11.exe` | 104376922 | `6a9891c882cc49fa37693246d9877b4bd237ecdbb93b71a8607c591ac47588b8` |
| `PNG-Bundle-Mockup-Setup-1.4.11.exe.blockmap` | 109319 | `ae9f090dab048b547c6bafe08c162f00d1c3d71752779e85133f732bbcba1874` |
| `latest.yml` | 366 | `b75ca1021c9ebb2ddd23b37fb0e842e052e2605995dde3da1d8dc5e29d41df7a` |

## Trạng thái

- Đây là build local đã qua QA; chưa commit, tạo tag hoặc push/publish GitHub.
