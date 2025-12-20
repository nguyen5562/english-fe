# Hệ thống Học Tiếng Anh Đại học

Ứng dụng web hỗ trợ học viên hệ Đại học trong việc học tập học phần Tiếng Anh 1, Tiếng Anh 2.

## Tính năng chính

### Cho Sinh viên:
- 📚 **Tài liệu học tập**: Xem slides, video và tài liệu tham khảo
- ✏️ **Bài tập tương tác**: Làm bài tập theo từng bài học
- 📝 **Quiz & Kiểm tra**: Làm bài kiểm tra với thời gian giới hạn
- 📊 **Theo dõi tiến độ**: Xem kết quả học tập và sự tiến bộ

### Cho Giảng viên:
- 📈 **Thống kê**: Xem thống kê tổng quan về tình hình học tập
- 👥 **Quản lý sinh viên**: Theo dõi điểm số và tiến độ của từng sinh viên
- 📋 **Báo cáo**: Xem báo cáo chi tiết theo từng khóa học

## Công nghệ sử dụng

- **React 19** với TypeScript
- **Vite** - Build tool nhanh
- **Material UI (MUI)** - UI Framework
- **MUI Icons** - Icon library
- **React Router** - Routing
- **localStorage** - Lưu trữ dữ liệu (mock database)

## Cài đặt và chạy

### Yêu cầu
- Node.js >= 18
- npm hoặc yarn

### Cài đặt dependencies
```bash
npm install
```

### Chạy development server
```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:5173`

### Build cho production
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

## Cấu trúc dự án

```
src/
├── components/          # Các component tái sử dụng
│   └── Layout/         # Layout components (MainLayout)
├── pages/              # Các trang chính
│   ├── Login.tsx       # Trang đăng nhập
│   ├── Dashboard.tsx   # Trang chủ
│   ├── Materials.tsx   # Tài liệu học tập
│   ├── Exercises.tsx   # Danh sách bài tập
│   ├── ExerciseDetail.tsx  # Chi tiết bài tập
│   ├── Quizzes.tsx     # Danh sách quiz
│   ├── QuizDetail.tsx  # Chi tiết quiz
│   ├── Progress.tsx    # Tiến độ học tập
│   ├── Statistics.tsx  # Thống kê (cho GV)
│   └── Profile.tsx     # Thông tin tài khoản
├── services/           # Services và utilities
│   ├── storage.ts      # localStorage service (mock database)
│   └── mockData.ts     # Mock data khởi tạo
├── types/              # TypeScript types
│   └── index.ts        # Định nghĩa các types
├── theme/              # Theme configuration
│   └── theme.ts        # MUI theme
├── App.tsx             # Root component
└── main.tsx            # Entry point
```

## Sử dụng

### Đăng nhập
1. Mở ứng dụng, bạn sẽ được chuyển đến trang đăng nhập
2. Điền thông tin:
   - Họ và tên
   - Email
   - Chọn vai trò: Sinh viên hoặc Giảng viên
   - Nếu là Sinh viên, nhập Mã sinh viên
3. Click "Đăng nhập"

**Lưu ý**: Đây là phiên bản demo, không cần xác thực thật. Bạn có thể đăng nhập với bất kỳ thông tin nào.

### Sinh viên
- **Trang chủ**: Xem tổng quan các khóa học và tiến độ
- **Tài liệu học tập**: Xem slides, video, tài liệu tham khảo theo từng bài học
- **Bài tập**: Làm các bài tập tương tác, xem điểm số
- **Quiz & Kiểm tra**: Làm bài kiểm tra với thời gian giới hạn
- **Tiến độ học tập**: Xem lịch sử làm bài và điểm số

### Giảng viên
- **Thống kê**: Xem thống kê tổng quan về sinh viên, điểm số, tỷ lệ hoàn thành
- **Báo cáo theo khóa học**: Xem chi tiết từng khóa học và top sinh viên

## Lưu trữ dữ liệu

Hiện tại ứng dụng sử dụng **localStorage** để lưu trữ dữ liệu (mock database). Dữ liệu được lưu với các key:
- `english_learning_user`: Thông tin người dùng
- `english_learning_courses`: Danh sách khóa học
- `english_learning_exercises`: Danh sách bài tập
- `english_learning_quizzes`: Danh sách quiz
- `english_learning_progress`: Tiến độ học tập
- `english_learning_exercise_attempts`: Lịch sử làm bài tập
- `english_learning_quiz_attempts`: Lịch sử làm quiz

## Kế hoạch phát triển

### Frontend (hiện tại)
- ✅ Layout và Navigation
- ✅ Trang đăng nhập
- ✅ Dashboard
- ✅ Tài liệu học tập
- ✅ Bài tập tương tác
- ✅ Quiz và kiểm tra
- ✅ Theo dõi tiến độ
- ✅ Thống kê cho giảng viên

### Backend (tương lai)
- [ ] API server (Node.js/Express hoặc Python/Django)
- [ ] Database (PostgreSQL hoặc MongoDB)
- [ ] Authentication & Authorization
- [ ] File upload cho slides, videos
- [ ] Real-time notifications
- [ ] Email notifications

## Ghi chú

- Ứng dụng này là phiên bản frontend demo, chưa có backend
- Dữ liệu được lưu trong localStorage của trình duyệt
- Khi xóa cache trình duyệt, dữ liệu sẽ bị mất
- Để sử dụng trong production, cần tích hợp với backend và database thật

## License

MIT
