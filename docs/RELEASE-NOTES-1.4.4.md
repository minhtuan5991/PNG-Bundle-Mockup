# PNG Bundle Mockup v1.4.4 — Release Notes

Ngày phát hành: 2026-08-25

Trạng thái: **bản phát hành stable v1.4.4**

## Thay đổi chính

- Popup **Đặt tên Group Shirt** không còn tự chọn toàn bộ PNG khi mở; trạng thái ban đầu là `0/N`.
- Chỉ các thumbnail được người dùng click chọn, hoặc chủ động chọn bằng **Chọn tất cả đang hiện**, mới được đưa vào thao tác đổi tên.
- Phần đếm, kiểm tra tên đích và payload gửi backend cùng dùng một tập selection tường minh, tránh chênh lệch giữa giao diện và file được đổi thật.
- Thumbnail tăng từ `54×50 px` lên `80×76 px`; card và cột gallery cũng được nới để nhận diện thiết kế rõ hơn, vẫn giữ toàn ảnh bằng `object-fit: contain`.

## Tương thích dữ liệu

- Không đổi parser nhóm PNG, tag `.wh/.bl/.f/.b`, transaction rename hai phase hoặc rollback khi lỗi.
- Không đổi vùng in Group Shirt, logic template `mgs`, Bundle, PDF Download, mockup đơn, watermark hay metadata.
- File PNG không được chọn trong popup không bị đổi tên. **Chọn tất cả đang hiện** vẫn là thao tác bulk edit có chủ ý theo bộ lọc hiện tại.

## QA

- Automated tests: **124/124 đạt**, 0 fail/skipped/todo.
- Electron source smoke: **23/23 đạt**.
- Packaged executable smoke: **23/23 đạt**.
- Runtime check `renameSelectionOnly` xác nhận app đóng gói dùng selection rỗng ban đầu và payload lọc theo thumbnail đã chọn.
- ASAR xác nhận version 1.4.4 cùng CSS thumbnail mới.

## Artifact QA local

- `release/PNG-Bundle-Mockup-Setup-1.4.4.exe` — 104.369.855 byte — SHA-256 `DC1A21668AF8360A8E215B41DA1238E121784BED3A01197D09512508DB6D5CFD`.
- `release/PNG-Bundle-Mockup-Setup-1.4.4.exe.blockmap` — 109.413 byte — SHA-256 `58D232D48F7059D3D8F9878BB676685E94CE52F1CEEB0D8A1BB5CF9BDAD16769`.
- `release/latest.yml` — 363 byte — SHA-256 `4CE8B606EB7C1A2A8F0A501644A21802373E70609F6E7931563247C4781656DA`.
- `latest.yml` khớp version/path/size/SHA-512 của installer.
- Packaged `Input` chỉ có `README.txt` và PDF mẫu; bốn JPG riêng local không được đóng gói.
- Authenticode: `NotSigned`.

## Phát hành

Phát hành bằng tag mới `v1.4.4` và đúng ba asset updater; không ghi đè tag hoặc asset v1.4.3.
