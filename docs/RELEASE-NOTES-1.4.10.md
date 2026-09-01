# PNG Bundle Mockup v1.4.10 — Release Notes

Ngày: 2026-09-01

## Thứ tự ghép Group Shirt

- PNG trong từng nhóm được ưu tiên theo số trong ngoặc trên từng màu/mặt.
- Vùng Sáng 1, 2, 3 nhận các PNG áo sáng theo ordinal; vùng Tối 1, 2, 3 nhận các PNG áo tối theo ordinal. Mặt trước và mặt sau dùng đúng pool tương ứng.
- PNG chưa dùng tiếp tục sang ảnh kế tiếp. Chỉ vùng còn thiếu mới lặp ngẫu nhiên từ đúng pool.
- Giữ nguyên toàn bộ quy tắc tag và lọc template hiện có.

## Mockup đơn trong Group Shirt

- Có thể chọn nhiều ảnh nền mockup đơn trực tiếp như khi chọn nền Group Shirt.
- Ảnh không cần nằm trong `Input` và không cần marker `bundle`.
- Trình chỉnh vùng `42×48` dùng được với danh sách đã chọn; cấu hình tiếp tục lưu trong `Print Area/single-mockup-regions.json`.
- Quy tắc chỉ tạo mockup đơn một lần trong mỗi `Done` và cách chọn PNG áo sáng được giữ nguyên.

## Dọn dữ liệu

- Thêm nút **Xóa dữ liệu** với hộp xác nhận và phản hồi số mục/dung lượng đã dọn.
- Tự dọn trước khi đóng app.
- Allowlist chỉ gồm cache Electron, staging/previous và đúng mẫu file tạm nội bộ. Không xóa `Input`, `Print Area`, JSON vùng in, ảnh nền, tùy chọn đường dẫn hoặc output trong `Done`.

## QA local

- Automated tests đạt **164/164**; source Electron smoke và packaged smoke đều đạt **25/25**.
- NSIS x64 build thành công. ASAR mang version `1.4.10`, 25/25 file `src/assets` khớp byte mã nguồn và không chứa test.
- Payload sau smoke đã được dọn về đúng allowlist: `Input` chỉ có README/PDF mẫu; `Print Area` chỉ có README, không có JSON hoặc marker QA.
- `latest.yml` khớp version/path/size/SHA-512 của installer. EXE có FileVersion và ProductVersion `1.4.10`.
- Bộ cài chưa ký số; Windows có thể hiển thị SmartScreen/Unknown Publisher.

## Artifact QA local

| File | Kích thước (byte) | SHA-256 |
| --- | ---: | --- |
| `PNG-Bundle-Mockup-Setup-1.4.10.exe` | 104376337 | `4d8e4a7cccc202e0542f3ee7df044da6551389043bc20dc522a769339c91ac84` |
| `PNG-Bundle-Mockup-Setup-1.4.10.exe.blockmap` | 109433 | `3b56da1a9a80ba9325e4d38d022b99cea4c4b9b99619e5b19db1d88e87aec48d` |
| `latest.yml` | 366 | `0f71172e41019ae61df54ba45a65105082f06538f63c96f0d44c9dd9d584adb9` |

## Trạng thái

- Commit `6f979d3a88e4909ec62a0a648e5a05e497491bca` và tag `v1.4.10` đã được push lên GitHub.
- Windows CI `33490320726` và Release Windows `33490320665` đều thành công. Release `380352195` đang public, stable và là bản latest.
- Installer công khai có kích thước 104376031 byte, SHA-256 `0b7721bff52c8092dc99cf675a1c7e0aa6088fc5076d6aebd5032805ba3c18ef`.
- Chưa cài mới/nâng cấp tương tác trên máy hoặc VM sạch.
