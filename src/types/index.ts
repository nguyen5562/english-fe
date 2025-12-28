// Types cho ứng dụng học tiếng Anh

export interface User {
  id: string;
  name: string;
  email: string;
  role: "student" | "teacher";
  studentId?: string;
}

export interface Course {
  id: string;
  name: string;
  code: string; // Tiếng Anh 1, Tiếng Anh 2
  description: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  order: number;
  slides?: Slide[];
  videos?: Video[];
  references?: Reference[];
}

export interface Slide {
  id: string;
  lessonId: string;
  title: string;
  fileUrl: string; // URL đến file PowerPoint (.pptx)
  order: number;
}

export interface Video {
  id: string;
  lessonId: string;
  title: string;
  url: string;
  duration: number; // seconds
  order: number;
}

export interface Reference {
  id: string;
  lessonId: string;
  title: string;
  type: "pdf" | "link" | "document";
  url: string;
}

export type QuestionType =
  | "multiple-choice"
  | "fill-sentence"
  | "listening"
  | "word-order" // sắp xếp lại từ
  | "word-bank" // chọn từ trong hộp
  | "picture-choice" // chọn tranh đúng
  | "reading-mcq" // đọc hiểu – trắc nghiệm
  | "pronunciation" // luyện âm / ghi âm
  | "writing" // bài viết dài
  | "paragraph-fill" // điền vào đoạn văn (nhiều chỗ trống trong 1 đoạn)
  | "fill-blank" // điền từ vào chỗ trống (mỗi câu nhiều chỗ trống)
  | "dropdown-choice" // chọn từ dropdown (ví dụ: Choose the correct verbs)
  | "video-recording"; // xem video rồi ghi âm lại

// Section dùng chung cho cả Exercise và Quiz
export interface Section {
  id: string;
  title: string;
  description?: string;
  audioUrl?: string; // audio chung cho cả phần (ví dụ bài nghe dài)
  videoUrl?: string; // video chung cho cả phần (cho video-recording)
  imageUrl?: string; // hình minh họa cho phần
  wordBank?: string[]; // word bank dùng chung cho cả phần (nếu có)
  passage?: string; // đoạn văn để đọc (cho reading-mcq, paragraph-fill)
  // Kỹ năng chính của phần (grammar / vocabulary / listening / ...)
  sectionType:
    | "grammar"
    | "vocabulary"
    | "listening"
    | "reading"
    | "speaking"
    | "writing"
    | "pronunciation"
    | "mixed";
  // Kiểu câu hỏi hiển thị (tất cả câu trong phần nên cùng 1 kiểu)
  questionType: QuestionType;
  questions: Question[];
}

export interface Exercise {
  id: string;
  courseId: string;
  title: string;
  sections: Section[];
}

export interface Question {
  id: string;
  sectionId: string; // ID của section mà question này thuộc về
  question: string;
  // Trong thiết kế mới, type chủ yếu lấy từ Section.questionType.
  // Trường này là optional để vẫn hỗ trợ các câu hỏi đặc biệt nếu cần.
  type?: QuestionType;
  options?: string[]; // For multiple choice
  correctAnswer: string | string[];
  points: number;
  // Media / extra data cho các dạng đặc biệt
  audioUrl?: string; // listening, pronunciation, social phrases
  videoUrl?: string; // video-recording, video bài học
  imageUrl?: string; // picture-choice, mô tả bằng hình
  wordBank?: string[]; // word-bank, gợi ý từ cho điền chỗ trống
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  description: string;
  sections: Section[]; // Quiz làm theo phần, làm hết tất cả các phần rồi mới nộp bài
  timeLimit: number; // minutes
  passingScore: number; // percentage
}

export interface StudentProgress {
  studentId: string;
  courseId: string;
  completedLessons: string[];
  exerciseAttempts: ExerciseAttempt[];
  quizAttempts: QuizAttempt[];
  totalScore: number;
  lastAccessed: Date;
}

export interface ExerciseAttempt {
  id: string;
  exerciseId: string;
  studentId: string;
  // Nếu là attempt cho 1 phần, lưu index phần ở đây (0-based). Nếu không có thì là attempt cho cả bài.
  sectionIndex?: number;
  answers: { questionId: string; answer: string | string[] }[];
  // Số lần thử: tăng +1 mỗi lần nhấn Kiểm tra (lưu lần mới ghi đè)
  tries?: number;
  score: number;
  maxScore: number;
  completedAt: Date;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  answers: { questionId: string; answer: string | string[] }[];
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  completedAt: Date;
  timeSpent: number; // minutes
  // Lưu thông tin về section hiện tại (optional, có thể dùng để theo dõi tiến độ)
  currentSectionIndex?: number;
}

export interface Statistics {
  totalStudents: number;
  totalExercises: number;
  totalQuizzes: number;
  averageScore: number;
  completionRate: number;
  courseStats: CourseStatistics[];
}

export interface CourseStatistics {
  courseId: string;
  courseName: string;
  enrolledStudents: number;
  averageScore: number;
  completionRate: number;
  topPerformers: { studentId: string; name: string; score: number }[];
}
