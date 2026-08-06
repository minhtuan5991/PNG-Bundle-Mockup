# Hướng dẫn phát hành PNG Bundle Mockup

> Áp dụng cho v1.2.0 trở đi. Các lệnh bên dưới dùng PowerShell trên Windows.

## 1. Mục tiêu phát hành

Kênh phát hành chính là NSIS installer x64 qua GitHub Releases:

```text
https://github.com/minhtuan5991/PNG-Bundle-Mockup
```

Mỗi tag `vX.Y.Z` kích hoạt workflow `.github/workflows/release-windows.yml`. Workflow kiểm tra tag khớp `package.json`, chạy test, build installer và upload các file updater.

## 2. Trạng thái repository

Trạng thái sau khi phát hành v1.2.1 ngày 2026-08-07:

- Repository GitHub là public.
- Nhánh mặc định `main` đã có mã nguồn.
- Tag `v1.2.0` trỏ tới commit phát hành `971d92d`.
- GitHub Release `v1.2.0` là stable/public và có đủ installer, blockmap, `latest.yml`.
- Tag `v1.2.1` trỏ tới commit phát hành `2dfc7a3`; GitHub Release ID `366371391` là stable/public, `/releases/latest` trỏ đúng tag và có đúng ba asset updater đã được tải ngược để xác minh checksum/metadata.
- Do incident GitHub Actions mức `critical`, Windows CI run đầu `31125907971` bị hủy khi chưa có runner/step nào chạy. Lượt thử lại trên đúng tag/commit `31126793200` sau đó đạt toàn bộ checkout, Node 22, `npm ci`, regression tests và package unpacked. Workflow phát hành theo tag được giao trễ thành run `31126661713`, rồi kết thúc failure vì job bị cancelled trước runner/step; ba asset public giữ nguyên timestamp, size và SHA-256. v1.2.1 đã được publish thủ công từ bộ artifact local qua QA đầy đủ và workflow trễ không chạm vào Release.
- Bản cài v1.2.0 đã nhận đúng thông báo `v1.2.1` từ kênh stable. Download/restart/cài đè và fresh install tương tác vẫn là sign-off hậu phát hành, không được đánh dấu đạt từ kiểm tra thông báo.
- Thư mục `D:\File2Mockup` đã được khởi tạo Git và theo dõi `origin/main`.

Workflow upload đầy đủ asset được gia cố từ commit `6076701`. Bản hiện tại tạo hoặc sửa Release draft, xác minh chính xác ba asset trước khi publish, không ghi đè asset của Release public và hỗ trợ chế độ thủ công chỉ đồng bộ ghi chú từ nhánh mặc định.

## 3. Điều kiện trước khi phát hành

- Windows x64.
- Git đã được cài và cấu hình tên/email.
- Node.js từ `22.12.0` trở lên; CI và workflow phát hành dùng nhánh `22.x`.
- Có quyền push repository và tạo GitHub Release.
- `package-lock.json` đã được cập nhật và commit.
- Với v1.2.1, `pdf-lib` phải có trong `dependencies` và lockfile; không được chỉ tồn tại trong `node_modules` local.
- Đã review toàn bộ nội dung `Input` sẽ đi vào installer, bảo đảm không có dữ liệu riêng, output hoặc file QA ngoài chủ đích.
- Working tree chỉ chứa thay đổi chủ đích.
- Đã đọc `docs/REGRESSION-CHECKLIST.md`.

Kiểm tra môi trường:

```powershell
node --version
npm --version
git --version
```

Khi tái hiện chính xác CI/release, dùng Node `22.x`; môi trường phát triển hỗ trợ Node từ `22.12.0` trở lên.

## 4. Khởi tạo và push repository lần đầu

Chỉ thực hiện phần này nếu thư mục vẫn chưa có `.git` và repository GitHub vẫn trống.

```powershell
Set-Location D:\File2Mockup
git init
git branch -M main
git remote add origin https://github.com/minhtuan5991/PNG-Bundle-Mockup.git
git add .
git status --short
git commit -m "Prepare PNG Bundle Mockup v1.2.0"
git push -u origin main
```

Trước `git commit`, phải đọc danh sách từ `git status --short`. Không commit:

- `node_modules/`
- `release/`
- `win-unpacked/`
- file tạm QA hoặc ảnh dữ liệu riêng của người dùng
- token, chứng thư hoặc mật khẩu

Nếu remote `origin` đã tồn tại, không chạy `git remote add` lần nữa. Kiểm tra và sửa khi cần:

```powershell
git remote -v
git remote set-url origin https://github.com/minhtuan5991/PNG-Bundle-Mockup.git
```

Sau push đầu tiên, mở tab Actions trên GitHub và chờ workflow **Windows CI** đạt.

## 5. Cài dependency và kiểm tra cục bộ

Dùng lockfile để có dependency giống CI:

```powershell
Set-Location D:\File2Mockup
npm ci
npm test
```

Không phát hành nếu test fail hoặc số lượng test thấp hơn mức dự kiến mà chưa có giải thích.

Đối với v1.2.1, không sao chép số liệu 26/26 hoặc checksum của v1.2.0. Sau `npm ci`, phải ghi lại số test thực tế và chạy tối thiểu các nhóm:

- phân giải/tạo thư mục `Input`;
- snapshot/restore `Input` khi marker mất, mirror sửa/xóa khi marker còn và phục hồi staging bị gián đoạn;
- kéo-thả PNG từ nhiều thư mục;
- PDF Download với annotation nút/link nhiều trang, cancellation và commit nguyên tử;
- vùng in `42:48`, persistence theo template và invalidation khi kích thước đổi;
- mockup đơn, random nguồn, alpha crop, watermark topmost và output không ghi đè;
- renderer/main smoke cho API và UI mới.

Có thể tạo installer cục bộ mà không upload:

```powershell
npm run build:installer
```

Lệnh trên tương đương build NSIS x64 với `--publish never`. Build cục bộ dùng để QA; quy trình phát hành chính vẫn nên chạy qua GitHub Actions.

Sau mỗi lần build, kiểm tra trong payload đã đóng gói:

1. `Input` nằm cạnh EXE và có thể mở/ghi bằng tài khoản cài đặt dự kiến. Installer giữ assisted identity tương thích v1.2.0 (`oneClick: false`, `perMachine: false`, `allowElevation: true`) và cho fresh install chọn thư mục (`allowToChangeInstallationDirectory: true`); `customInstallMode` vẫn ép fresh current-user, còn bản All Users/custom path cũ giữ mode/vị trí. Phải thử trang chọn thư mục trên máy sạch, xác nhận NSIS tự thêm thư mục con tên app và thử nâng cấp tại chỗ để chắc chắn trang này bị bỏ qua. Nhánh All Users phải ACL-preflight trước khi thay đổi bản cũ, chỉ cấp Modify cho `Input` và dừng nếu `icacls` lỗi.
2. `pdf-lib` có trong ASAR/runtime và chức năng PDF không báo `MODULE_NOT_FOUND`.
3. PDF mẫu thật render đúng và cả nút lẫn link hiển thị mở URL mới.
4. Mockup bundle, mockup đơn và PDF cùng được ghi vào một `Done`.
5. Watermark vẫn là lớp trên cùng của cả bundle và mockup đơn.
6. Marker runtime không bị đóng gói; snapshot `input-backup` trong `userData` được tạo sau khi app chạy.

## 6. Quy tắc version

Dự án dùng semantic version `MAJOR.MINOR.PATCH`:

- `PATCH`: sửa lỗi tương thích, không thay đổi lớn luồng sử dụng.
- `MINOR`: thêm tính năng tương thích ngược.
- `MAJOR`: thay đổi không tương thích hoặc thay đổi lớn dữ liệu/cài đặt.

Version phải đồng nhất tại:

- `package.json`
- `package-lock.json`
- Git tag `vX.Y.Z`
- tên installer
- `latest.yml`
- nội dung release notes

Để chuẩn bị một version mới mà chưa tạo tag tự động:

```powershell
npm version 1.2.1 --no-git-tag-version
```

Thay `1.2.1` bằng version thực tế. Lệnh cập nhật cả `package.json` và `package-lock.json`.

Kiểm tra:

```powershell
$releaseVersion = node -p "require('./package.json').version"
$lockVersion = node -p "require('./package-lock.json').version"
Write-Output "package=$releaseVersion lock=$lockVersion"
```

Không thêm version vào `productName`, `appId` hoặc tên shortcut.

## 7. Chuẩn bị commit phát hành

1. Hoàn thành toàn bộ checklist automated/manual/installer.
2. Cập nhật `README.md` nếu giao diện hoặc quy trình sử dụng thay đổi.
3. Cập nhật `docs/PROJECT-HISTORY.md` và số liệu QA cuối.
4. Ghi release notes: Added, Changed, Fixed, Known limitations.
5. Với v1.2.1, thay toàn bộ `CHƯA XÁC MINH` trong `docs/RELEASE-NOTES-1.2.1.md` bằng kết quả thật; nếu một mục chưa chạy, giữ release ở trạng thái chuẩn bị.
6. Kiểm tra nội dung `Input`, diff và commit.

```powershell
git status --short
git diff --check
git diff
rg "CHƯA XÁC MINH" docs/RELEASE-NOTES-$releaseVersion.md
git add package.json package-lock.json README.md CHANGELOG.md .gitignore docs src test .github assets build scripts Input
git status --short
git commit -m "Release v$releaseVersion"
git push origin main
```

Danh sách `git add` là gợi ý có phạm vi. Nếu có file dự án hợp lệ ở vị trí khác, thêm có chủ đích sau khi xem status; không dùng lệnh xóa/reset mạnh để làm sạch thay đổi không rõ nguồn gốc.

Lệnh `rg` phải không còn kết quả trước khi phát hành stable. Nếu release cần đóng gói tài sản trong `Input`, thêm `Input` có chủ đích sau khi kiểm tra từng file; không mở rộng `git add` chỉ để lấy toàn bộ dữ liệu người dùng.

Chờ workflow **Windows CI** của commit trên `main` đạt trước khi tạo tag.

## 8. Tạo tag và phát hành

Tạo annotated tag khớp tuyệt đối với package version:

```powershell
$releaseVersion = node -p "require('./package.json').version"
git status --short
git tag -a "v$releaseVersion" -m "PNG Bundle Mockup v$releaseVersion"
git push origin "v$releaseVersion"
```

Working tree phải sạch trước khi tag. Workflow release sẽ dừng nếu `v$releaseVersion` không khớp version trong `package.json`.

Workflow thực hiện:

1. Checkout tag.
2. Cài Node.js 22.x.
3. Chạy `npm ci`.
4. Xác minh tag/version.
5. Chạy `npm test`.
6. Chạy `npm run build:installer` để tạo ba file đồng bộ.
7. Dùng GitHub CLI tạo hoặc sửa một draft, upload đúng ba asset, tải lại để đối chiếu size/SHA-256 và kiểm tra `latest.yml` khớp SHA-512/version/path/size của installer.
8. Chỉ sau khi mọi kiểm tra đạt mới publish stable, xác minh đúng một Release và `/releases/latest` trỏ tới tag.
9. Giữ một workflow artifact chứa các file update.

`GH_TOKEN` chỉ tồn tại trong GitHub Actions. Không ghi token vào mã nguồn, `package.json`, `latest.yml`, tài liệu hoặc release assets.

Workflow cũng hỗ trợ `workflow_dispatch` với input `tag` và `operation`:

- `sync-notes` lấy release notes mới nhất từ nhánh mặc định rồi chỉ đồng bộ tiêu đề/ghi chú, không build hoặc chạm vào asset.
- `publish-if-missing` tạo Release draft mới hoặc sửa/ghi đè asset của draft hiện có. Nếu Release đã public, workflow không sửa/chứng nhận lại asset và sẽ dừng; dùng `sync-notes` cho ghi chú hoặc phát hành patch mới nếu asset có vấn đề.

## 9. Artifacts bắt buộc

GitHub Release phải có đủ:

```text
PNG-Bundle-Mockup-Setup-X.Y.Z.exe
PNG-Bundle-Mockup-Setup-X.Y.Z.exe.blockmap
latest.yml
```

Vai trò:

| File | Mục đích |
| --- | --- |
| `Setup-X.Y.Z.exe` | Bộ cài đầy đủ và payload update. |
| `.exe.blockmap` | Hỗ trợ differential download. |
| `latest.yml` | Metadata để client tìm version, URL, kích thước và checksum. |

Không upload như tài sản người dùng:

- `win-unpacked/`
- `builder-debug.yml`
- `builder-effective-config.yaml`
- `*.nsis.7z`
- `node_modules/`
- `start-app.bat`

`Input` không phải artifact thứ tư của GitHub Release; nó được nhúng trong installer bằng `extraFiles`. Chỉ đưa PDF/ảnh mẫu vào `Input` của mã nguồn khi chủ dự án đã xác nhận các file đó được phép phân phối.

Kiểm tra `latest.yml` trỏ đúng installer cùng version và blockmap tồn tại. Không sửa thủ công `latest.yml` sau build.

Có thể ghi SHA-256 của installer vào release notes:

```powershell
Get-FileHash ".\release\PNG-Bundle-Mockup-Setup-$releaseVersion.exe" -Algorithm SHA256
```

SHA-256 công khai là tiện ích xác minh tải xuống, không thay thế code signing.

Checksum của build local và build GitHub Actions có thể khác nhau. Release notes trước khi publish phải ghi rõ checksum nào là local; sau khi publish, tải lại installer từ chính GitHub Release, tính SHA-256 của artifact remote rồi đồng bộ ghi chú bằng `sync-notes` nếu muốn công bố checksum tải xuống.

## 10. Kiểm tra GitHub Release sau publish

- Release không còn ở trạng thái draft.
- Stable release không được đánh dấu prerelease.
- Tag và tiêu đề đúng `vX.Y.Z`.
- Có đủ ba artifact bắt buộc.
- Tải installer từ chính trang GitHub Release về một máy/VM sạch.
- File cài được bằng tài khoản standard user.
- Shortcut có icon đúng và mở app không cần file batch.
- Cửa sổ hiển thị đúng version.
- Chạy một quy trình tạo mockup thực tế.
- Với v1.2.1, kéo PNG từ ít nhất hai thư mục và xác nhận `Done` nằm dưới source chính đang hiển thị.
- Với v1.2.1, mở `Input` cạnh EXE, tạo một PDF Download và click thử cả nút lẫn link hiển thị.
- Với v1.2.1, lưu vùng `42:48`, tạo mockup đơn từ nhiều ảnh mẫu và xác nhận watermark topmost khi bật.
- Với v1.2.1, thêm một file riêng vào `Input`, cài update bằng nút trong app và xác nhận file được snapshot/khôi phục; đóng app thông thường không được tự cài update đã tải.
- Kiểm tra updater bằng một bản cũ hơn đã cài, không kiểm tra chỉ bằng app development.

URL stable mới nhất:

```text
https://github.com/minhtuan5991/PNG-Bundle-Mockup/releases/latest
```

## 11. Chuyển người dùng từ v1.1.0 portable

v1.1.0 portable không có updater. Release notes v1.2.0 phải nêu rõ:

1. Tải `PNG-Bundle-Mockup-Setup-1.2.0.exe`.
2. Chạy installer thủ công một lần.
3. Mở app từ Desktop hoặc Start Menu.
4. Các phiên bản installer sau đó mới có thể được tìm và cài qua updater.

Không hứa rằng portable v1.1.0 sẽ tự hiện thông báo v1.2.0.

### Nâng cấp installer v1.2.0 lên v1.2.1

Đây là ma trận live-update bắt buộc cho v1.2.1:

1. Cài installer v1.2.0 từ GitHub Release chính thức trên máy/VM sạch.
2. Trên v1.2.0, tạo dữ liệu thử trong `path-preferences.json`, localStorage và một thư mục `Done`; v1.2.0 chưa có `Input` hoặc `single-mockup-regions.json`.
3. Phát hành v1.2.1 stable với đúng ba update artifact.
4. Từ app v1.2.0, kiểm tra, tải và chọn khởi động lại/cài đặt.
5. Xác nhận app lên đúng v1.2.1, shortcut/app identity không bị nhân đôi và dữ liệu `Done` không bị thay đổi.
6. Sau khi đã lên v1.2.1, thêm PDF/ảnh mẫu riêng vào `Input`, lưu vùng in, chạy PDF Download/mockup đơn/kéo-thả và xác nhận chức năng mới hoạt động.
7. Dùng một lượt cài lại/gỡ thử v1.2.1 riêng để xác nhận snapshot, vùng in và hook uninstaller bảo toàn `Input`; đây là bài test persistence từ v1.2.1 trở đi, không phải dữ liệu có sẵn trong v1.2.0.
8. Trong một lượt tạo output dài, đóng cửa sổ và xác nhận app chỉ thoát sau khi file tạm/output của lượt bị hủy đã được dọn.
9. Bắt đầu lưu vùng in hoặc quét `Input`, xác nhận nút cài update bị khóa; gỡ app thử nghiệm và xác nhận hook `--sync-input-backup` bảo toàn snapshot trước khi NSIS xóa `Input`.
10. Khi app đang chạy, mở shortcut lần nữa và xác nhận cửa sổ cũ được khôi phục/đưa lên trước, không tạo phiên làm việc thứ hai.
11. Khi app đang giữ single-instance lock, chạy `PNG Bundle Mockup.exe --sync-input-backup` và xác nhận exit `3`; sau đó xác nhận update/uninstall dừng fail-closed thay vì tiếp tục khi backup `Input` chưa chạy được. Khi app đã đóng, cùng lệnh phải đồng bộ thành công và exit `0`.

## 12. Code signing

Hiện release được build với:

```text
CSC_IDENTITY_AUTO_DISCOVERY=false
```

Vì vậy installer chưa ký và Windows có thể hiện SmartScreen/Unknown Publisher. Khi có chứng thư:

- Lưu secret/chứng thư trong GitHub Actions, không commit.
- Giữ publisher name ổn định.
- Bỏ cấu hình vô hiệu hóa discovery theo quy trình ký đã chọn.
- Kiểm tra chữ ký của installer và EXE.
- Chạy lại toàn bộ ma trận update từ bản đã ký sang bản đã ký mới.

## 13. Rollback và hotfix

### 13.1 Nguyên tắc

- Không ghi đè assets của một release đã đến tay người dùng.
- Không tái sử dụng tag đã phát hành.
- Không giảm version để rollback; updater thông thường không downgrade.
- Cách rollback an toàn là revert mã lỗi, tăng patch version và phát hành version cao hơn.

Ví dụ v1.2.0 lỗi và cần khôi phục logic cũ:

```powershell
git switch main
git pull --ff-only origin main
git revert <commit-gay-loi>
npm version 1.2.1 --no-git-tag-version
npm test
git add .
git commit -m "Hotfix v1.2.1"
git push origin main
git tag -a v1.2.1 -m "PNG Bundle Mockup v1.2.1"
git push origin v1.2.1
```

Trước `git add .`, luôn kiểm tra `git status --short` để tránh đưa file riêng hoặc output build vào commit.

### 13.2 Release nguy hiểm đang ở latest

1. Đánh dấu release bị lỗi rõ ràng trong ghi chú.
2. Nếu cần, tạm chuyển release thành draft để ngăn lượt tải mới; không coi đây là rollback đầy đủ vì client có thể đã tải metadata.
3. Chuẩn bị hotfix có version cao hơn ngay lập tức.
4. Phát hành hotfix theo toàn bộ checklist.
5. Giữ release cũ để truy vết hoặc xóa chỉ sau khi đã đánh giá ảnh hưởng và liên kết tải xuống.

### 13.3 Workflow tag thất bại

- Nếu tag chưa tạo release công khai, sửa nguyên nhân trên `main` rồi tạo một patch version mới là phương án ít nhầm lẫn nhất.
- Chỉ xóa và tạo lại tag khi chắc chắn tag chưa được người dùng/CI khác sử dụng và chưa có release phát hành.
- Không sửa `latest.yml` bằng tay để ép updater nhận bản khác.

## 14. Lỗi thường gặp

| Hiện tượng | Kiểm tra |
| --- | --- |
| Workflow báo tag không khớp | So sánh `github.ref_name`, `package.json` và `package-lock.json`. |
| Không tạo được release | Kiểm tra `permissions: contents: write` và trạng thái Actions. |
| App không thấy update | Kiểm tra app là bản packaged, release không draft/prerelease, version mới lớn hơn và `latest.yml` tồn tại. |
| Download update lỗi | Kiểm tra URL/tên/size/checksum trong `latest.yml` và blockmap. |
| Cài xong mất preferences | Kiểm tra không đổi app identity và `deleteAppDataOnUninstall` vẫn là `false`. |
| Cài xong mất tài sản `Input` | Kiểm tra marker, thư mục `input-backup` trong `userData`, log `INPUT_BACKUP_*` và bảo đảm update chỉ đi qua nút cài đặt đã sync snapshot. |
| Có nhiều shortcut/app song song | Kiểm tra `appId`, `productName`, `shortcutName`, registry HKCU/HKLM và xác nhận installer giữ đúng mode của bản còn sống; gỡ bản trùng trước khi thử lại. |
| Update/uninstall dừng khi app còn mở | Đây là hành vi fail-closed: tiến trình backup headless không lấy được single-instance lock sẽ trả exit `3`. Đóng app tương tác, bảo đảm `Input` không còn được sử dụng rồi thử lại; không bỏ qua hook backup. |
| SmartScreen cảnh báo | Đây là giới hạn của bản unsigned; xác minh tải từ đúng GitHub Release và lên kế hoạch code signing. |
| App báo không đọc được `Input` | Kiểm tra `Input` có nằm cạnh EXE, quyền ghi/đọc của tài khoản hiện tại và cấu hình `extraFiles`. |
| PDF Download báo thiếu/nhiều template | Giữ đúng một file `.pdf` trực tiếp trong `Input`; ảnh mockup đơn không ảnh hưởng bộ đếm PDF. |
| PDF mở được nhưng link sai | Kiểm tra PDF mẫu có annotation nút và link hiển thị cùng URL cũ; thử click cả hai vùng sau khi render. |
| Bản packaged báo thiếu `pdf-lib` | Kiểm tra dependency nằm trong `dependencies`, lockfile và `app.asar`; chạy lại `npm ci` trước build. |
| Mockup đơn báo thiếu vùng in | Mở trình chỉnh, lưu vùng `42:48` cho mọi template; nếu ảnh đổi kích thước phải lưu lại. |
| Output nằm ở `Done` không mong đợi sau kéo-thả | Kiểm tra source chính đang hiển thị; khi khởi tạo chỉ bằng kéo-thả, thư mục của file hợp lệ đầu tiên là source chính. |
