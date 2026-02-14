// User
export type User = {
  _id: string;
  email: string;
  username: string;
  password?: string;
  role: string;
};

// Course
export type Course = {
  _id: string;
  name: string;
  code: string;
  description: string;
};

// Lesson
export type LessonObj = {
  _id: string;
  title: string;
  url: string;
};

export type Lesson = {
  _id: string;
  courseId: string;
  title: string;
  slides: LessonObj[];
  videos: LessonObj[];
  references: LessonObj[];
};

// Shared
export type Question = {
  _id: string;
  title: string;
  options: string[];
  correctAnswer: string[];
  point: number;
  audioUrl: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  wordBank: string[];
};

export type QuestionType =
  | 'multiple-choice'
  | 'fill-sentence'
  | 'listening'
  | 'word-order'
  | 'word-bank'
  | 'picture-choice'
  | 'reading-mcq'
  | 'pronunciation'
  | 'writing'
  | 'paragraph-fill'
  | 'fill-blank'
  | 'dropdown-choice'
  | 'video-recording';

export type SectionType =
  | 'grammar'
  | 'vocabulary'
  | 'listening'
  | 'reading'
  | 'speaking'
  | 'writing'
  | 'pronunciation';

export type Section = {
  _id: string;
  title: string;
  description: string | null;
  audioUrl: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  wordBank: string[];
  passage: string | null;
  sectionType: SectionType;
  questionType: QuestionType;
  questions: Question[];
};

// Exercise
export type Exercise = {
  _id: string;
  courseId: string;
  title: string;
  description: string | null;
  sections: Section[];
};

// Quiz
export type Quiz = {
  _id: string;
  courseId: string;
  title: string;
  description: string | null;
  sections: Section[];
  timeLimit: number;
};

// Exercise Attempt
export type Answer = {
  questionId: string;
  answer: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type SectionAttempt = {
  sectionId: string;
  tries: number;
  score: number;
  answers: Answer[];
  submittedAt: Date;
};

export type ExerciseAttempt = {
  _id: string;
  exerciseId: string;
  userId: string;
  sectionAttempts: SectionAttempt[];
  totalScore: number;
};

// Quiz Attempt
export type QuizAttempt = {
  _id: string;
  quizId: string;
  userId: string;
  status: string;
  startedAt: Date;
  submittedAt: Date | null;
  answers: Answer[];
  totalScore: number;
};
