// Mock data để khởi tạo ứng dụng
import type { Course, Exercise, Quiz } from '../types';
import { saveCourses, saveExercises, saveQuizzes } from './storage';

export const initializeMockData = (): void => {
  // Mock Courses
  const courses: Course[] = [
    {
      id: 'course-1',
      name: 'Tiếng Anh 1',
      code: 'ENG101',
      description: 'Học phần Tiếng Anh 1 dành cho sinh viên đại học',
      lessons: [
        {
          id: 'lesson-1-1',
          courseId: 'course-1',
          title: 'Unit 1: Greetings and Introductions',
          order: 1,
          slides: [
            {
              id: 'slide-1-1-1',
              lessonId: 'lesson-1-1',
              title: 'Basic Greetings',
              content: 'Learn how to greet people in English...',
              order: 1,
            },
          ],
          videos: [
            {
              id: 'video-1-1-1',
              lessonId: 'lesson-1-1',
              title: 'Introduction to Greetings',
              url: 'https://example.com/video1',
              duration: 300,
              order: 1,
            },
          ],
          references: [
            {
              id: 'ref-1-1-1',
              lessonId: 'lesson-1-1',
              title: 'Grammar Reference',
              type: 'pdf',
              url: 'https://example.com/grammar.pdf',
            },
          ],
        },
        {
          id: 'lesson-1-2',
          courseId: 'course-1',
          title: 'Unit 2: Present Simple Tense',
          order: 2,
          slides: [],
          videos: [],
          references: [],
        },
      ],
    },
    {
      id: 'course-2',
      name: 'Tiếng Anh 2',
      code: 'ENG102',
      description: 'Học phần Tiếng Anh 2 dành cho sinh viên đại học',
      lessons: [
        {
          id: 'lesson-2-1',
          courseId: 'course-2',
          title: 'Unit 1: Past Simple Tense',
          order: 1,
          slides: [],
          videos: [],
          references: [],
        },
        {
          id: 'lesson-2-2',
          courseId: 'course-2',
          title: 'Unit 2: Future Tense',
          order: 2,
          slides: [],
          videos: [],
          references: [],
        },
      ],
    },
  ];

  // Mock Exercises
  const exercises: Exercise[] = [
    {
      id: 'exercise-1-1',
      lessonId: 'lesson-1-1',
      courseId: 'course-1',
      title: 'Exercise: Greetings Practice',
      type: 'multiple-choice',
      questions: [
        {
          id: 'q1',
          exerciseId: 'exercise-1-1',
          question: 'What is the correct greeting in the morning?',
          type: 'multiple-choice',
          options: ['Good night', 'Good morning', 'Good evening', 'Good afternoon'],
          correctAnswer: 'Good morning',
          points: 10,
        },
        {
          id: 'q2',
          exerciseId: 'exercise-1-1',
          question: 'Fill in the blank: "How _____ you?"',
          type: 'fill-blank',
          correctAnswer: 'are',
          points: 10,
        },
      ],
    },
    {
      id: 'exercise-1-2',
      lessonId: 'lesson-1-2',
      courseId: 'course-1',
      title: 'Exercise: Present Simple',
      type: 'multiple-choice',
      questions: [
        {
          id: 'q3',
          exerciseId: 'exercise-1-2',
          question: 'Choose the correct form: "She _____ to school every day."',
          type: 'multiple-choice',
          options: ['go', 'goes', 'going', 'went'],
          correctAnswer: 'goes',
          points: 10,
        },
      ],
    },
  ];

  // Mock Quizzes
  const quizzes: Quiz[] = [
    {
      id: 'quiz-1',
      courseId: 'course-1',
      title: 'Midterm Quiz - Tiếng Anh 1',
      description: 'Bài kiểm tra giữa kỳ cho học phần Tiếng Anh 1',
      questions: [
        {
          id: 'quiz-q1',
          exerciseId: 'quiz-1',
          question: 'What is the past tense of "go"?',
          type: 'multiple-choice',
          options: ['goed', 'went', 'gone', 'going'],
          correctAnswer: 'went',
          points: 20,
        },
        {
          id: 'quiz-q2',
          exerciseId: 'quiz-1',
          question: 'Write a sentence using Present Simple tense.',
          type: 'essay',
          correctAnswer: '',
          points: 30,
        },
      ],
      timeLimit: 60,
      passingScore: 60,
    },
  ];

  saveCourses(courses);
  saveExercises(exercises);
  saveQuizzes(quizzes);
};

