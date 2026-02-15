import type {
  Answer,
  Exercise,
  ExerciseAttempt,
  Lesson,
  LessonObj,
  Quiz,
} from '.';

// Auth
export type RegisterDto = {
  username: string;
  email: string;
  password: string;
};

// User
export type CreateUserDto = {
  username: string;
  email: string;
  password: string;
  role: string;
};

export type UpdateUserDto = Partial<Omit<CreateUserDto, 'password'>>;

// Lesson
export type LessonObjType = Omit<LessonObj, '_id'>;

export type CreateLessonDto = {
  title: string;
  courseId: string;
};

export type UpdateLessonDto = Partial<
  Omit<Lesson, '_id' | 'slides' | 'videos' | 'references'>
>;

// Exercise
export type CreateExerciseDto = Omit<Exercise, '_id' | 'sections'>;

export type UpdateExerciseDto = Partial<CreateExerciseDto>;

// Shared
export type SectionDto = {
  title: string;
  description?: string;
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  wordBank?: string[];
  passage?: string;
  sectionType: string;
  questionType: string;
  questions?: QuestionDto[];
};

export type QuestionDto = {
  title: string;
  options?: string[];
  correctAnswer?: string[];
  point: number;
  audioUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  wordBank?: string[];
};

// Quiz
export type CreateQuizDto = Omit<Quiz, '_id' | 'sections'>;

export type UpdateQuizDto = Partial<CreateQuizDto>;

// Exercise Attempt
export type AnswerDto = Omit<Answer, '_id' | 'createdAt' | 'updatedAt'>;

export type SectionAttemptDto = {
  sectionId: string;
  answers: AnswerDto[];
};

export type ExerciseAttemptDto = Omit<
  ExerciseAttempt,
  '_id' | 'sectionAttempts' | 'totalScore'
>;

// Quiz Attempt
export type SubmitAttemptDto = Omit<SectionAttemptDto, 'sectionId'>;

export type QuizAttemptDto = {
  quizId: string;
  userId: string;
};
