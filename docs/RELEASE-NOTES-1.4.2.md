# PNG Bundle Mockup v1.4.2 — Release Notes

Ngày phát hành: 2026-08-24

Trạng thái: **bản phát hành stable v1.4.2**

## Thay đổi chính

- Mọi ảnh nền có chứa marker `mgs` được dùng như template chung cho tất cả nhóm PNG.
- Số hoặc chữ cạnh marker không còn liên kết nền với nhóm: nhóm `1` có thể dùng `.mgs2`, `.mgs3` hoặc bất kỳ nền `mgs` nào có vùng in phù hợp.
- Khả năng ghép chỉ phụ thuộc vào profile tên PNG (`.wh/.bl`, `.f/.b`) và các track màu/mặt trong vùng in đã lưu.
- Một template tương thích có thể được tái sử dụng cho nhiều nhóm; PNG của các nhóm không bị trộn vào nhau.
- Tên marker-only như `mgs.jpg`/`mgs.png` cũng được chấp nhận.

## Tương thích dữ liệu

- Không đổi schema, key hoặc fingerprint của vùng in Group Shirt.
- Vùng đã lưu cho `.mgs1`, `.mgs2`, `.mgs3` và các tên nền cũ tiếp tục hoạt động.
- Không thay đổi Bundle, PDF Download, mockup đơn, watermark, metadata hoặc quy tắc tạo trang/lặp PNG theo track.

## QA

- Automated tests: **121/121 đạt**, 0 fail/skipped/todo.
- Electron source smoke: **21/21 đạt**.
- Packaged executable smoke: **21/21 đạt**.
- Integration xác nhận một nền dùng cho nhiều nhóm, cross-product nhóm × template, chỉ lọc theo vùng in, không trộn source và output collision-safe.

## Artifact QA local

- `release/PNG-Bundle-Mockup-Setup-1.4.2.exe` — 104.370.063 byte — SHA-256 `463E3CC84528DD7A6ACEB8B64A17AF434AF9CCC6736F17994B80671D6DBCD1E9`.
- `release/PNG-Bundle-Mockup-Setup-1.4.2.exe.blockmap` — 109.635 byte — SHA-256 `A2F6C62EB881701CD05D7A49C7977EC00BEB5032DECD88E270F6F3879D4FD57B`.
- `release/latest.yml` — 363 byte — SHA-256 `0165BEDB1992D0D4BF4C34B1A2A3D374DA9562654A97FABF6AE9A0DC02C78A2D`.
- `app.asar` version 1.4.2 chứa shared-template planner/renderer; packaged `Input` chỉ có `README.txt` và PDF mẫu.
- Authenticode: `NotSigned`.

## Phát hành

Phát hành bằng tag mới `v1.4.2` và ba asset updater; không ghi đè tag hoặc asset v1.4.1.
