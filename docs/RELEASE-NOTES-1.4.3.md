# PNG Bundle Mockup v1.4.3 — Release Notes

Ngày phát hành: 2026-08-25

Trạng thái: **bản phát hành stable v1.4.3**

## Thay đổi chính

- Popup **Đặt tên Group Shirt** có thêm nút **Đổi Tên** để đổi tên file nhưng giữ popup mở, giúp xử lý liên tiếp nhiều nhóm màu/mặt áo.
- Nút cũ được đổi thành **Đổi tên và Đóng** để lưu rồi đóng popup.
- **Hủy**, dấu × và phím Esc chỉ đóng popup, không áp dụng lựa chọn chưa lưu.
- Trong lúc đổi tên, control bị khóa và nút được bấm hiển thị trạng thái xử lý.
- Khi popup được giữ mở, gallery và các tập selection được chuyển sang đường dẫn mới để lượt đổi tiếp theo không tham chiếu tên cũ.

## Tương thích dữ liệu

- Không đổi cú pháp nhóm PNG, tag `.wh/.bl/.f/.b`, transaction rename hoặc logic tạo mockup.
- Không đổi vùng in Group Shirt, Bundle, PDF Download, mockup đơn, watermark hay metadata.
- **Hủy** không hoàn tác các file đã được lưu trước đó bằng nút **Đổi Tên**; nó chỉ bỏ các lựa chọn chưa áp dụng ở lượt hiện tại.

## QA

- Automated tests: **122/122 đạt**, 0 fail/skipped/todo.
- Electron source smoke: **22/22 đạt**.
- Packaged executable smoke: **22/22 đạt**.
- ASAR xác nhận version 1.4.3 và đủ nhánh giữ popup mở/lưu rồi đóng.

## Artifact QA local

- `release/PNG-Bundle-Mockup-Setup-1.4.3.exe` — 104.370.304 byte — SHA-256 `2E712A0E5BEDCCB3348BBC4432D2C02E9AAEB3F1324B5DB8F3DD6E8E95ABAA11`.
- `release/PNG-Bundle-Mockup-Setup-1.4.3.exe.blockmap` — 109.428 byte — SHA-256 `83BF9E9C750249597A840F2EE81499F508902BE24E42B3924E9B9D8CF54CA010`.
- `release/latest.yml` — 363 byte — SHA-256 `7D6B250F7C35AE3B7F5915793D2CAA92C39D73DE0A9C607F951EAA388E0A5C36`.
- `latest.yml` khớp version/path/size/SHA-512 của installer.
- Packaged `Input` chỉ có `README.txt` và PDF mẫu; bốn JPG riêng local không được đóng gói.
- Authenticode: `NotSigned`.

## Phát hành

Phát hành bằng tag mới `v1.4.3` và ba asset updater; không ghi đè tag hoặc asset v1.4.2.