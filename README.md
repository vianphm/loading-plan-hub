# Loading Plan Hub - Air Cargo Logistics Dashboard & Analytics Engine

Hệ thống Báo cáo Phân tích & Tra cứu Vận đơn Hàng không (`LD PLAN`) - Tối ưu cho Vercel Deployment.

## 🌟 Tính Năng Nổi Bật

- **Master Data Aggregation**: Bóc tách và hợp nhất 2,110 vận đơn từ 21 file Excel Master Plan.
- **Weekly Operations Dashboard**: Báo cáo theo dõi biến động sản lượng kiện (PCS), trọng lượng thực (GW), trọng lượng cước (CW) và thể tích (CBM) theo từng tuần (Tuần 26 - Tuần 31).
- **Monthly Trend & Carrier Share**: Báo cáo tổng hợp Tháng 6, Tháng 7, Tháng 8 và thị phần các hãng bay (VietJet VJ, Air Incheon KJ, UPS 5X, Korean Air KE, Ethiopian ET...).
- **Instant Search Engine**: Tra cứu thời gian thực theo mã MAWB, chuyến bay, đại lý, điểm đến.
- **Agency-Tier UI/UX**: Thiết kế OLED Dark (`#050711`), Glassmorphism `backdrop-blur-xl`, Doppelrand Double-Bezel card architecture.
- **Vercel Zero-Config Ready**: Tích hợp sẵn `vercel.json` và CSDL tĩnh `data/master_plan.json`.

## 📁 Cấu Trúc Dự Án

```
y:\LD PLAN\
├── index.html            # Giao diện chính 3 chế độ xem (Weekly / Monthly / Master List)
├── style.css             # Design System OLED Dark & Glassmorphism
├── app.js                # Logic tính toán KPI, Chart.js & Instant Search
├── vercel.json           # Cấu hình deployment cho Vercel
├── package.json          # Thông tin package dự án loading-plan-hub
├── server.js             # Dev Server Node.js (http://localhost:3000)
├── analyze.js            # Script Node.js xuất báo cáo phân tích
├── data/
│   └── master_plan.json  # CSDL 2,110 bản ghi vận đơn
└── .agents/              # Cấu hình Skill Framework (superpowers) & AGENTS.md
```

## 🚀 Hướng Dẫn Deploy Qua GitHub Desktop & Vercel

1. Mở ứng dụng **GitHub Desktop**.
2. Chọn **File -> Add Local Repository** (hoặc nhấn `Ctrl + O`).
3. Chọn thư mục: `y:\LD PLAN`.
4. Nếu GitHub Desktop thông báo *"This directory does not appear to be a Git repository"*, bấm vào liên kết **Create a Repository**.
5. Nhập tên Repository: `loading-plan-hub` và bấm **Create Repository**.
6. Bấm nút **Publish repository** ở góc trên để đẩy dự án lên tài khoản GitHub của bạn (`vianphm11`).
7. Trên trang **Vercel** ([loading-plan-hub](https://vercel.com/vianphm11/loading-plan-hub)), Vercel sẽ tự động kết nối với repo GitHub này và **Deploy trực tiếp trong 5 giây**!
