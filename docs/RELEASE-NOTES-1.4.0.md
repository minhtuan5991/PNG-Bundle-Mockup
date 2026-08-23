# PNG Bundle Mockup v1.4.0 — Release Notes

Ngày tạo: 2026-08-23

Trạng thái: **bản phát hành stable v1.4.0**


## Thay đổi chính

- Mockup đơn ở cả **Mockup Bundle PNG** và **Mockup Group Shirt** chỉ quét ảnh mẫu có chữ `bundle` trong stem tên file.
- Group Shirt chỉ nhận ảnh nền có marker `mgs`; phần tên trước `mgs` phải khớp chính xác tên nhóm PNG trước dấu ngoặc.
- Group Shirt hỗ trợ **Tạo PDF Download** giống Bundle. Nếu `Done` đã có PDF, app giữ file cũ và bỏ qua.
- Vùng in Group Shirt lưu cả mặt trước/sau và màu áo sáng/tối.
- Hai checkbox **Áo sáng màu** và **Áo tối màu** loại trừ nhau; không chọn ô nào thì vùng mới mặc định áo sáng.
- Vùng in luôn giữ tỷ lệ pixel `42×48` khi tạo, scale, nhập số hoặc xoay; bốn tổ hợp màu/mặt có nhãn và kiểu viền riêng.
- Schema vùng Group Shirt tăng lên 2; record schema 1 thiếu màu được di trú sang áo sáng nếu còn hợp lệ.

## Quy tắc planner Group Shirt

- PNG được nhóm theo phần tên trước `(số)`; ordinal quyết định thứ tự trong từng track màu/mặt.
- Không tag: chỉ dùng vùng áo sáng mặt trước.
- Chỉ tag mặt `.f/.b`: chỉ dùng vùng áo sáng và template phải có cả vùng trước lẫn sau.
- Chỉ tag màu `.wh/.bl`: không dùng template có vùng mặt sau.
- Có cả tag màu và mặt: template phải có vùng trước và sau, đồng thời đủ đúng các track được dùng.
- Thiếu PNG trong một track: lặp ngẫu nhiên PNG thuộc đúng track và cùng nhóm để lấp đủ vị trí.
- Thừa PNG: tạo trang mới, ghép phần thừa theo thứ tự rồi lấp các vị trí thiếu bằng nguồn ngẫu nhiên đúng track.
- Nhiều template cùng group được coi là variant và mỗi variant tương thích tạo chuỗi trang riêng.

## Mockup đơn và PDF

- Danh sách/chỉnh vùng mockup đơn chỉ hiển thị template `bundle`.
- Trong Group Shirt, nguồn mockup đơn là PNG effective-light: có `.wh` hoặc không gắn tag màu.
- Quy tắc chỉ tạo mockup đơn một lần trong mỗi `Done` được giữ.
- PDF Download dùng chung cho hai mode và vẫn chỉ tạo một PDF trong mỗi `Done`.

## QA

- `node --check` đạt cho main, renderer và các service đã sửa.
- Automated tests: **118/118 đạt**, 0 fail, 0 skipped/todo.
- Packaged executable smoke: **19/19 đạt**, gồm title/version, preload/API, control mới, chuyển mode và PDF hiển thị ở cả Bundle/Group.
- `app.asar` mang version `1.4.0` và chứa Group Shirt planner/service.
- Installer payload được giới hạn bằng allowlist: `Input/README.txt` và `Input/Toystory HLW1.pdf`; bốn JPG riêng local không được đóng gói.

## Artifact

- `release/PNG-Bundle-Mockup-Setup-1.4.0.exe`
  - Size: `104369200` bytes
  - SHA-256: `DA69CF3958EC535FAA24EDE985B4E160E0AF95E56530967FA2AD13A42A363277`
  - Authenticode: `NotSigned`
- `release/PNG-Bundle-Mockup-Setup-1.4.0.exe.blockmap`
  - Size: `109413` bytes
  - SHA-256: `F0FA30B1728CAA125D0C237B2332B30F08906E95365586B655A396560514DD4F`
- `release/latest.yml`
  - Size: `363` bytes
  - SHA-256: `F648D0AF197FBD555D76CBD6C4C2085E0723682A1AC43773943ED179F72A765D`
  - Version/path/size/SHA-512 khớp installer.

## Cần kiểm tra thêm



- Chưa cài tương tác trên máy/VM sạch hoặc chạy bộ dữ liệu thật của người dùng với 6–8 vùng in.
- Installer chưa có chứng thư ký mã thương mại, nên SmartScreen có thể cảnh báo.
