# PNG Bundle Mockup v1.4.1 — Release Notes

Ngày tạo: 2026-08-23

Trạng thái: **bản phát hành stable v1.4.1**

## Lỗi đã sửa

- Ảnh nền tên `.mgs1.jpg` hoặc `mgs1.jpg` nay được nhận đúng là nền của nhóm PNG `1`, thay vì bị hiểu sai thành group key `.` và variant `1`.
- Tên `1.mgs.jpg` được chuẩn hóa đúng thành nhóm `1`; dạng chuẩn `1 mgs.jpg` và `1 mgs lifestyle.jpg` vẫn giữ nguyên hành vi.
- Khôi phục helper `groupSourceDirectory(file)` bị xóa nhầm trong v1.4.0, loại bỏ lỗi `groupSourceDirectory is not defined` khi bấm Preview hoặc Tạo Mockup Group Shirt.

## Tương thích dữ liệu

- Không cần đổi tên file `.mgs1.jpg` hiện có.
- Vùng in đã lưu tiếp tục được dùng vì store nhận diện template theo path, tên, kích thước và fingerprint nội dung; group key không phải khóa lưu vùng.
- Logic Bundle, PDF Download, mockup đơn, watermark, xóa metadata và quy tắc một lần trong `Done` không thay đổi.

## QA

- `node --check` đạt cho main, renderer và parser đã sửa.
- Automated tests: **119/119 đạt**, 0 fail, 0 skipped/todo.
- Source Electron renderer smoke: **20/20 đạt**, gồm kiểm tra runtime `v140SourceDirectory`.
- Packaged executable smoke: **20/20 đạt**, gồm title/version, API/controls, chuyển mode và kiểm tra runtime `v140SourceDirectory`.

## Artifact

- `release/PNG-Bundle-Mockup-Setup-1.4.1.exe`
  - Size: `104370173` bytes
  - SHA-256: `E492F13337D6BCD9D7282CA1D3AFDF4CA196F3B44B390C3804A86F46F29E19DC`
  - Authenticode: `NotSigned`
- `release/PNG-Bundle-Mockup-Setup-1.4.1.exe.blockmap`
  - Size: `109494` bytes
  - SHA-256: `73C896324FBA373FC4452CDD6385D2DF8C6651FB1DBA809BBD32561D2C824DD3`
- `release/latest.yml`
  - Size: `363` bytes
  - SHA-256: `3B6416E2AF7CB3313F5AC87A424FD6AC10FBBD7339105EF69E6D2AAE8639392A`
  - Version/path/size/SHA-512 khớp installer.
- `app.asar` version `1.4.1`, có parser `.mgs1` và helper `groupSourceDirectory`; packaged `Input` chỉ gồm `README.txt` và `Toystory HLW1.pdf`.

## Lưu ý

- Installer chưa có chứng thư ký mã thương mại nên Windows SmartScreen có thể cảnh báo.
- Bốn JPG riêng local trong `Input` không được stage hoặc đóng gói; installer chỉ chứa README và PDF mẫu theo allowlist.
