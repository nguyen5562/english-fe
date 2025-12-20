// Types cho ứng dụng học tiếng Anh

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher';
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
  content: string;
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
  type: 'pdf' | 'link' | 'document';
  url: string;
}

export interface Exercise {
  id: string;
  lessonId: string;
  courseId: string;
  title: string;
  type: 'multiple-choice' | 'fill-blank' | 'essay' | 'listening';
  questions: Question[];
  timeLimit?: number; // minutes
}

export interface Question {
  id: string;
  exerciseId: string;
  question: string;
  type: 'multiple-choice' | 'fill-blank' | 'essay' | 'listening';
  options?: string[]; // For multiple choice
  correctAnswer: string | string[];
  points: number;
  audioUrl?: string; // For listening questions
}

export interface Quiz {
  id: string;
  courseId: string;
  title: string;
  description: string;
  questions: Question[];
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
  answers: { questionId: string; answer: string | string[] }[];
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

