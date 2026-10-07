# Vexim Trade – CRM phòng Sale Xuất khẩu

Hệ thống quản lý buyer / nhà cung cấp cho phòng sale xuất khẩu, có **pipeline theo trạng thái của
từng buyer** và **tự động gửi email cập nhật tiến độ** cho buyer + nhà cung cấp mỗi khi đổi trạng thái.

- **Giao diện:** Next.js 16 (App Router) + Tailwind CSS 4
- **Database:** Supabase (Postgres)
- **Email:** Resend — domain `veximtrade.com`
- **Ngôn ngữ:** giao diện tiếng Việt · email gửi buyer tiếng Anh · email gửi NCC tiếng Việt

---

## Chạy thử ngay (không cần cấu hình gì)

```bash
npm install
npm run dev      # http://localhost:3000
```

Khi chưa có biến môi trường, app tự chạy ở **chế độ demo**:

| Thành phần | Chế độ demo | Chế độ thật |
| --- | --- | --- |
| Dữ liệu | file `data/local-db.json` (kèm 8 buyer + 5 NCC mẫu) | Supabase |
| Email | tạo nội dung + lưu vào **Nhật ký email**, không gửi ra ngoài | gửi thật qua Resend |

Thanh “Kết nối” ở cuối menu trái luôn cho biết đang ở chế độ nào.

---

## Nối Supabase + Resend

1. **Supabase** → SQL Editor → chạy toàn bộ [`supabase/schema.sql`](supabase/schema.sql).
2. **Supabase** → Project Settings → API → copy `Project URL` và `service_role` key.
3. **Resend** → API Keys → tạo key.
4. Copy `.env.example` thành `.env.local` và điền:

```env
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
EMAIL_FROM=sales@veximtrade.com
EMAIL_FROM_NAME=Vexim Trade
```

5. Khởi động lại app. Các email đang ở trạng thái “demo” có thể bấm **Gửi lại** trong Nhật ký email.

---

## Pipeline

Trạng thái được định nghĩa tại [`lib/pipeline.ts`](lib/pipeline.ts) — sửa mảng `STAGES` là đổi được
toàn bộ pipeline (nhớ sửa ràng buộc `check` của cột `buyers.stage` trong SQL).

| # | Trạng thái | Email |
| --- | --- | --- |
| 1 | Khách mới | buyer + NCC (nếu đã gắn) |
| 2 | Đã liên hệ | buyer + NCC |
| 3 | Báo giá & gửi mẫu | buyer + NCC |
| 4 | Đàm phán | buyer + NCC |
| 5 | Chốt PI & cọc | buyer + NCC |
| 6 | Đang sản xuất | buyer + NCC |
| 7 | Đang giao hàng | buyer + NCC |
| 8 | Hoàn tất | buyer + NCC |
| — | Mất đơn / Hoãn | **không gửi**, chỉ ghi nhận nội bộ |

### Quy tắc gửi email

1. **Buyer luôn nhận** nếu có email (kèm CC).
2. **Nhà cung cấp chỉ nhận khi đã được gắn vào đơn** và có email.
   Ở giai đoạn hỏi hàng / báo giá thường chưa chọn NCC — khi đó hệ thống báo rõ
   *“Chưa gắn nhà cung cấp — email chỉ gửi tới buyer”* và vẫn gửi bình thường cho buyer.
3. Trạng thái **Mất đơn / Hoãn** không gửi email tự động.
4. **Bảo mật 2 chiều:**
   - Email gửi buyer **không bao giờ** chứa tên / email / giá của nhà cung cấp.
   - Email gửi NCC **mặc định ẩn danh buyer** (chỉ nêu “Khách hàng thị trường {quốc gia}”).
     Có công tắc *“Ẩn danh buyer trong email gửi NCC”* ở từng buyer nếu khách cho phép công khai.

### Hai cách đổi trạng thái

- **Dropdown** ngay trên bảng Buyer hoặc trên thẻ ở trang Pipeline (kéo-thả cũng được).
- Mặc định hệ thống hiện hộp xác nhận **người nhận** trước khi gửi (tránh gửi nhầm cho khách thật).
  Bật công tắc **“Gửi ngay, không hỏi lại”** (góc phải màn hình) nếu muốn chọn là gửi luôn.

---

## Cấu trúc thư mục

```
app/
  page.tsx                    Tổng quan: KPI, phễu pipeline, việc cần làm, cảnh báo
  pipeline/page.tsx           Board kéo-thả theo trạng thái
  buyers/                     Danh sách, thêm mới, chi tiết, sửa
  suppliers/                  Danh sách, thêm mới, chi tiết, sửa
  emails/page.tsx             Nhật ký email + xem lại nội dung + gửi lại
  settings/page.tsx           Trạng thái kết nối Supabase/Resend, bảng pipeline
  actions.ts                  Toàn bộ server actions (CRUD, đổi trạng thái, gửi email)
components/                   UI: stage-select, bảng, board, form, xem trước email...
lib/
  pipeline.ts                 Định nghĩa trạng thái + nội dung email theo trạng thái
  email/templates.ts          Sinh HTML email buyer (EN) và NCC (VI)
  email/send.ts               Gửi qua Resend + ghi log
  db/                         Tầng dữ liệu: tự chọn Supabase hoặc kho local
supabase/schema.sql           Script tạo bảng
```

## Lệnh

```bash
npm run dev        # chạy dev (0.0.0.0:3000)
npm run build      # build production
npm start          # chạy bản build
npm run typecheck  # kiểm tra TypeScript
```
