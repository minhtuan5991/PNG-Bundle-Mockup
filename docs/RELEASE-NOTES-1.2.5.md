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
- Artifact sạch và checksum công khai được cập nhật sau khi build/workflow hoàn tất.
- Cài–gỡ tương tác trên Windows/VM bình thường vẫn là kiểm tra thủ công hậu phát hành như các phiên bản trước.
