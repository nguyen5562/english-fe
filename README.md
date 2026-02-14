# 🎓 Hệ Thống Học Tiếng Anh Trực Tuyến (WebTiengAnh)

![React](https://img.shields.io/badge/React-v19-blue?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-v5-blue?style=flat-square&logo=typescript)
![Vite](https://img.shields.io/badge/Vite-v6-purple?style=flat-square&logo=vite)
![MUI](https://img.shields.io/badge/MUI-v7-blue?style=flat-square&logo=mui)
![Zustand](https://img.shields.io/badge/State-Zustand-orange?style=flat-square)

> **WebTiengAnh** là một nền tảng giáo dục trực tuyến toàn diện, được thiết kế để tối ưu hóa trải nghiệm dạy và học tiếng Anh. Hệ thống cung cấp các công cụ mạnh mẽ cho việc quản lý bài giảng, bài tập, kiểm tra đánh giá và theo dõi tiến độ học tập chi tiết.

---

## 🚀 Công Nghệ Sử Dụng

Dự án được xây dựng trên nền tảng công nghệ web hiện đại, đảm bảo hiệu năng cao và trải nghiệm người dùng mượt mà.

| Danh Mục             | Công Nghệ                | Mô Tả                                                                |
| :------------------- | :----------------------- | :------------------------------------------------------------------- |
| **Core Framework**   | **React 19**             | Thư viện UI mạnh mẽ với hiệu năng tối ưu.                            |
| **Language**         | **TypeScript**           | Đảm bảo type-safe, giảm thiểu lỗi runtime.                           |
| **Build Tool**       | **Vite**                 | Tốc độ khởi động và HMR (Hot Module Replacement) cực nhanh.          |
| **UI Library**       | **Material UI (MUI) v7** | Hệ thống Design System chuẩn Google, giao diện đẹp mắt & responsive. |
| **State Management** | **Zustand**              | Quản lý state toàn cục đơn giản và hiệu quả.                         |
| **Routing**          | **React Router v7**      | Điều hướng trang mượt mà, hỗ trợ Nested Routes manh mẽ.              |
| **Networking**       | **Axios**                | Xử lý HTTP requests chuyên nghiệp với Interceptors.                  |
| **Notifications**    | **Sonner**               | Hệ thống thông báo (Toast) đẹp và nhẹ.                               |
| **File Manager**     | **Svar UI FileManager**  | Quản lý tài nguyên media (ảnh, video, audio) trực quan.              |

---

## ✨ Tính Năng Nổi Bật

### 🧑‍🎓 Dành Cho Học Viên (Student)

- **📊 Dashboard Cá Nhân**:
  - Xem tổng quan lộ trình học tập.
  - Theo dõi các khóa học đang tham gia.
  - Nhắc nhở bài tập/quiz sắp đến hạn.

- **📚 Kho Học Liệu (Materials)**:
  - Truy cập bài giảng video, audio, tài liệu đọc phong phú.
  - Hỗ trợ xem trực tiếp trên trình duyệt hoặc tải về.

- **📝 Làm Bài Tập & Kiểm Tra (Exercises & Quizzes)**:
  - Hỗ trợ đa dạng loại câu hỏi: _Trắc nghiệm, Điền từ, Kéo thả, Nghe (Listening), Nói (Speaking/Recording), Viết (Writing)_.
  - Giao diện làm bài tập trung, có đồng hồ đếm ngược.
  - **Review Mode**: Xem lại bài làm chi tiết với đáp án đúng/sai, giải thích cụ thể sau khi nộp bài.

- **📈 Thống Kê & Tiến Độ**:
  - Biểu đồ trực quan về kết quả học tập.
  - Lịch sử điểm số chi tiết từng bài kiểm tra.

### 👨‍🏫 Dành Cho Quản Trị Viên / Giảng Viên (Admin/Teacher)

- **🖥️ Admin Dashboard**:
  - Tổng quan số liệu hệ thống (Users, Courses, Quizzes...).
  - Truy cập nhanh các chức năng quản lý chính.

- **📁 Quản Lý Tài Nguyên (File Manager)**:
  - Tải lên, tổ chức hình ảnh, video, âm thanh cho bài giảng.
  - Giao diện Explorer chuyên nghiệp (Kéo thả, Tạo thư mục, Xem trước).

- **🛠️ Quản Lý Nội Dung Chuyên Sâu**:
  - **Quản Lý Khóa Học**: Tạo cấu trúc chương trình học logic.
  - **Soạn Thảo Bài Tập/Quiz**: Công cụ tạo đề thi mạnh mẽ, hỗ trợ import câu hỏi, cấu hình điểm số, thời gian, số lần làm bài.
  - **Chấm Điểm**: Hệ thống tự động chấm điểm trắc nghiệm; công cụ hỗ trợ giáo viên chấm bài tự luận/nói.

- **👥 Quản Lý Người Dùng**:
  - Theo dõi danh sách học viên.
  - Phân quyền và quản lý tài khoản.

---

## 📂 Cấu Trúc Dự Án

Cấu trúc thư mục được tổ chức khoa học để dễ dàng mở rộng và bảo trì:

```bash
src/
├── 🧩 components/         # Các thành phần UI tái sử dụng
│   ├── Layout/            # Bố cục trang (MainLayout, AdminLayout)
│   ├── FileManager.tsx    # Component quản lý file
│   └── ...
├── ⚙️ const/              # Các hằng số, cấu hình (API endpoints, Enums)
├── 📄 pages/              # Các trang giao diện chính
│   ├── admin/             # Các trang quản trị (AdminDashboard, AdminQuizzes...)
│   └── ...                # Các trang người dùng (Dashboard, Exercises, Quizzes...)
├── 🔌 services/           # Lớp giao tiếp API (Service Layer)
│   ├── auth.service.ts    # Đăng nhập, đăng ký, profile
│   ├── quiz.service.ts    # API liên quan đến Quiz
│   └── ...
├── 📦 store/              # Quản lý State (Zustand Stores)
│   └── auth.store.ts      # Lưu trữ thông tin user đăng nhập
├── 🎨 theme/              # Cấu hình giao diện (MUI Theme Provider)
├── 🏷️ types/              # Định nghĩa TypeScript Interfaces/Types
├── 🛠️ utils/              # Các hàm tiện ích bổ trợ (Format date, validate...)
└── 📱 App.tsx             # Routing & Application Entry Point
```

---

## 🛠️ Hướng Dẫn Cài Đặt & Triển Khai

### 1️⃣ Yêu Cầu Tiên Quyết

- [Node.js](https://nodejs.org/) (Phiên bản LTS, v18+ đề xuất)
- [npm](https://www.npmjs.com/) hoặc [yarn](https://yarnpkg.com/)

### 2️⃣ Các Bước Cài Đặt

**Bước 1: Clone dự án về máy**

```bash
git clone <repository-url>
cd fe
```

**Bước 2: Cài đặt các thư viện phụ thuộc**

```bash
npm install
# hoặc
yarn install
```

**Bước 3: Cấu hình biến môi trường**
Tạo file `.env` tại thư mục gốc và thêm các thông số cấu hình:

```env
VITE_API_BASE_URL=http://localhost:3000/api
# Thêm các biến khác nếu cần
```

**Bước 4: Chạy ứng dụng (Môi trường Development)**

```bash
npm run dev
```

🎉 Truy cập trình duyệt tại: `http://localhost:5173`

### 3️⃣ Các Lệnh Hữu Ích Khác

| Lệnh Script       | Mô Tả                                                             |
| :---------------- | :---------------------------------------------------------------- |
| `npm run build`   | Đóng gói ứng dụng cho môi trường Production (output tại `/dist`). |
| `npm run preview` | Chạy thử bản build production tại local.                          |
| `npm run lint`    | Kiểm tra lỗ hổng code và format style (ESLint).                   |

---

## 🤝 Đóng Góp (Contributing)

Chúng tôi rất hoan nghênh mọi đóng góp để phát triển dự án! Để đóng góp:

1.  **Fork** dự án này.
2.  Tạo nhánh tính năng mới (`git checkout -b feature/AmazingFeature`).
3.  Commit thay đổi của bạn (`git commit -m 'Add some AmazingFeature'`).
4.  Push lên nhánh (`git push origin feature/AmazingFeature`).
5.  Tạo **Pull Request** và chờ review nhé!

---

## 📜 Giấy Phép (License)

Dự án này được phát hành dưới giấy phép [MIT](LICENSE).

---

_Developed with ❤️ by the WebTiengAnh Team_
