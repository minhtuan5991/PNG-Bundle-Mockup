# PNG Bundle Mockup v1.2.5

> Bản phát hành Windows x64 stable tại [GitHub Release v1.2.5](https://github.com/minhtuan5991/PNG-Bundle-Mockup/releases/tag/v1.2.5). Bộ cài chưa có chữ ký số Authenticode.

## Thay đổi

- Bỏ dòng “Giữ nguyên thứ tự tên file” ở góc dưới gallery PNG.
- Thêm nút **Loại bỏ PNG** để xóa toàn bộ PNG đã nạp khỏi phiên làm việc mà không xóa file gốc trên máy.
- Khi dọn danh sách, app đặt lại lựa chọn, thư mục nguồn, đích `Done`, output và preview kết quả cũ. Vì vậy PNG kéo vào đầu tiên của lượt tiếp theo sẽ quyết định đúng thư mục `Done`, không bị trộn hoặc lưu nhầm theo bộ cũ.
- Ảnh nền, watermark, các tùy chọn đầu ra và thiết lập bố cục vẫn được giữ để tái sử dụng cho bộ PNG mới.
- Nút được khóa khi app đang quét, tạo ảnh hoặc chỉnh vùng in; thông báo xác nhận nêu rõ file gốc vẫn còn nguyên.

## Kiểm thử

- 75/75 kiểm thử tự động đạt; kiểm thử xác nhận nút tồn tại, chuỗi cũ đã bị loại bỏ, toàn bộ state PNG/source/output được đặt lại và không có luồng xóa file gốc.
- QA renderer thật xác nhận title v1.2.5, trạng thái bật/tắt của nút và kết quả sau click đều đúng; production audit báo 0 vulnerability.
- Packaged renderer smoke trên `win-unpacked` đạt cùng trạng thái; packaged `Input` chỉ có README/PDF đã track, không chứa ảnh JPG riêng của người dùng.
- Clean build local: installer 104.343.581 byte, SHA-256 `C5A792FB52E97F93AB781B8579D2AFBB8E5FD8B910B4D71E74B029B66B78F7CD`; blockmap SHA-256 `6227A24AC5F126DDC10FF565E4FC445773F87D64C73DCFF62BE278A0CF7C0BBE`; `latest.yml` SHA-256 `6F6B17417F51A744179DFECFB4C1310873BCEF025A741EDD5D1AF3029B1CE4C1` và metadata khớp installer.
- Windows CI `31270193124` và Release Windows `31270217854` đều success. Release ID `367263645` public/stable có đúng ba asset và là `/releases/latest`.
- Tải ngược công khai: installer 104.343.581 byte, SHA-256 `2EA990EAF0189AD4F304B124D251E63C03BE12C4B4629812AF5413E88ACCF214`; blockmap SHA-256 `5BC30873669A630D7DB41C86728FBD94D61E88AE75C0BAA00272B077C65DC14F`; `latest.yml` SHA-256 `6A7E5ADE5879AC84E1D23F599118E78D869B102A12DA593818B940C6F4DAB70B` và metadata version/path/size/SHA-512 khớp installer remote.
- Cài–gỡ tương tác trên Windows/VM bình thường vẫn là kiểm tra thủ công hậu phát hành như các phiên bản trước.
