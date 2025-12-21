// Service để quản lý localStorage (mock database)
import type {
  User,
  Course,
  Lesson,
  Slide,
  Video,
  Reference,
  Exercise,
  Quiz,
  StudentProgress,
  ExerciseAttempt,
  QuizAttempt,
  Statistics,
} from '../types';

const STORAGE_KEYS = {
  USER: 'english_learning_user',
  USERS: 'english_learning_users', // Danh sách users với password
  COURSES: 'english_learning_courses',
  EXERCISES: 'english_learning_exercises',
  QUIZZES: 'english_learning_quizzes',
  PROGRESS: 'english_learning_progress',
  EXERCISE_ATTEMPTS: 'english_learning_exercise_attempts',
  QUIZ_ATTEMPTS: 'english_learning_quiz_attempts',
};

// Interface cho user với password (lưu trong danh sách users)
interface UserWithPassword extends User {
  password: string;
}

// Helper functions
const getItem = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setItem = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// User management
export const getUser = (): User | null => {
  return getItem<User | null>(STORAGE_KEYS.USER, null);
};

export const setUser = (user: User): void => {
  setItem(STORAGE_KEYS.USER, user);
};

export const logout = (): void => {
  localStorage.removeItem(STORAGE_KEYS.USER);
};

// User authentication with password
export const getUsers = (): UserWithPassword[] => {
  return getItem<UserWithPassword[]>(STORAGE_KEYS.USERS, []);
};

export const registerUser = (user: UserWithPassword): boolean => {
  const users = getUsers();
  // Kiểm tra email đã tồn tại chưa
  if (users.some(u => u.email === user.email)) {
    return false; // Email đã tồn tại
  }
  users.push(user);
  setItem(STORAGE_KEYS.USERS, users);
  return true; // Đăng ký thành công
};

export const loginUser = (email: string, password: string): User | null => {
  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    // Lưu user đã đăng nhập (không có password)
    const userWithoutPassword: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      ...(user.studentId && { studentId: user.studentId }),
    };
    setUser(userWithoutPassword);
    return userWithoutPassword;
  }
  return null; // Đăng nhập thất bại
};

// Courses
export const getCourses = (): Course[] => {
  return getItem<Course[]>(STORAGE_KEYS.COURSES, []);
};

export const getCourse = (id: string): Course | null => {
  const courses = getCourses();
  return courses.find(c => c.id === id) || null;
};

export const saveCourses = (courses: Course[]): void => {
  setItem(STORAGE_KEYS.COURSES, courses);
};

export const addCourse = (course: Course): void => {
  const courses = getCourses();
  courses.push(course);
  saveCourses(courses);
};

export const updateCourse = (id: string, updatedCourse: Partial<Course>): void => {
  const courses = getCourses();
  const index = courses.findIndex(c => c.id === id);
  if (index >= 0) {
    courses[index] = { ...courses[index], ...updatedCourse };
    saveCourses(courses);
  }
};

export const deleteCourse = (id: string): void => {
  const courses = getCourses();
  const filtered = courses.filter(c => c.id !== id);
  saveCourses(filtered);
};

export const addLesson = (courseId: string, lesson: Lesson): void => {
  const courses = getCourses();
  const courseIndex = courses.findIndex(c => c.id === courseId);
  if (courseIndex >= 0) {
    courses[courseIndex].lessons.push(lesson);
    saveCourses(courses);
  }
};

export const updateLesson = (courseId: string, lessonId: string, updatedLesson: Partial<Lesson>): void => {
  const courses = getCourses();
  const courseIndex = courses.findIndex(c => c.id === courseId);
  if (courseIndex >= 0) {
    const lessonIndex = courses[courseIndex].lessons.findIndex(l => l.id === lessonId);
    if (lessonIndex >= 0) {
      courses[courseIndex].lessons[lessonIndex] = { ...courses[courseIndex].lessons[lessonIndex], ...updatedLesson };
      saveCourses(courses);
    }
  }
};

export const deleteLesson = (courseId: string, lessonId: string): void => {
  const courses = getCourses();
  const courseIndex = courses.findIndex(c => c.id === courseId);
  if (courseIndex >= 0) {
    courses[courseIndex].lessons = courses[courseIndex].lessons.filter(l => l.id !== lessonId);
    saveCourses(courses);
  }
};

export const addSlide = (courseId: string, lessonId: string, slide: Slide): void => {
  const courses = getCourses();
  const courseIndex = courses.findIndex(c => c.id === courseId);
  if (courseIndex >= 0) {
    const lessonIndex = courses[courseIndex].lessons.findIndex(l => l.id === lessonId);
    if (lessonIndex >= 0) {
      if (!courses[courseIndex].lessons[lessonIndex].slides) {
        courses[courseIndex].lessons[lessonIndex].slides = [];
      }
      courses[courseIndex].lessons[lessonIndex].slides!.push(slide);
      saveCourses(courses);
    }
  }
};

export const deleteSlide = (courseId: string, lessonId: string, slideId: string): void => {
  const courses = getCourses();
  const courseIndex = courses.findIndex(c => c.id === courseId);
  if (courseIndex >= 0) {
    const lessonIndex = courses[courseIndex].lessons.findIndex(l => l.id === lessonId);
    if (lessonIndex >= 0 && courses[courseIndex].lessons[lessonIndex].slides) {
      courses[courseIndex].lessons[lessonIndex].slides = courses[courseIndex].lessons[lessonIndex].slides!.filter(s => s.id !== slideId);
      saveCourses(courses);
    }
  }
};

export const addVideo = (courseId: string, lessonId: string, video: Video): void => {
  const courses = getCourses();
  const courseIndex = courses.findIndex(c => c.id === courseId);
  if (courseIndex >= 0) {
    const lessonIndex = courses[courseIndex].lessons.findIndex(l => l.id === lessonId);
    if (lessonIndex >= 0) {
      if (!courses[courseIndex].lessons[lessonIndex].videos) {
        courses[courseIndex].lessons[lessonIndex].videos = [];
      }
      courses[courseIndex].lessons[lessonIndex].videos!.push(video);
      saveCourses(courses);
    }
  }
};

export const deleteVideo = (courseId: string, lessonId: string, videoId: string): void => {
  const courses = getCourses();
  const courseIndex = courses.findIndex(c => c.id === courseId);
  if (courseIndex >= 0) {
    const lessonIndex = courses[courseIndex].lessons.findIndex(l => l.id === lessonId);
    if (lessonIndex >= 0 && courses[courseIndex].lessons[lessonIndex].videos) {
      courses[courseIndex].lessons[lessonIndex].videos = courses[courseIndex].lessons[lessonIndex].videos!.filter(v => v.id !== videoId);
      saveCourses(courses);
    }
  }
};

export const addReference = (courseId: string, lessonId: string, reference: Reference): void => {
  const courses = getCourses();
  const courseIndex = courses.findIndex(c => c.id === courseId);
  if (courseIndex >= 0) {
    const lessonIndex = courses[courseIndex].lessons.findIndex(l => l.id === lessonId);
    if (lessonIndex >= 0) {
      if (!courses[courseIndex].lessons[lessonIndex].references) {
        courses[courseIndex].lessons[lessonIndex].references = [];
      }
      courses[courseIndex].lessons[lessonIndex].references!.push(reference);
      saveCourses(courses);
    }
  }
};

export const deleteReference = (courseId: string, lessonId: string, referenceId: string): void => {
  const courses = getCourses();
  const courseIndex = courses.findIndex(c => c.id === courseId);
  if (courseIndex >= 0) {
    const lessonIndex = courses[courseIndex].lessons.findIndex(l => l.id === lessonId);
    if (lessonIndex >= 0 && courses[courseIndex].lessons[lessonIndex].references) {
      courses[courseIndex].lessons[lessonIndex].references = courses[courseIndex].lessons[lessonIndex].references!.filter(r => r.id !== referenceId);
      saveCourses(courses);
    }
  }
};

// Exercises
export const getExercises = (): Exercise[] => {
  return getItem<Exercise[]>(STORAGE_KEYS.EXERCISES, []);
};

export const getExercisesByCourse = (courseId: string): Exercise[] => {
  const exercises = getExercises();
  return exercises.filter(e => e.courseId === courseId);
};

export const getExercise = (id: string): Exercise | null => {
  const exercises = getExercises();
  return exercises.find(e => e.id === id) || null;
};

export const saveExercises = (exercises: Exercise[]): void => {
  setItem(STORAGE_KEYS.EXERCISES, exercises);
};

// Quizzes
export const getQuizzes = (): Quiz[] => {
  return getItem<Quiz[]>(STORAGE_KEYS.QUIZZES, []);
};

export const getQuizzesByCourse = (courseId: string): Quiz[] => {
  const quizzes = getQuizzes();
  return quizzes.filter(q => q.courseId === courseId);
};

export const getQuiz = (id: string): Quiz | null => {
  const quizzes = getQuizzes();
  return quizzes.find(q => q.id === id) || null;
};

export const saveQuizzes = (quizzes: Quiz[]): void => {
  setItem(STORAGE_KEYS.QUIZZES, quizzes);
};

// Helper function for admin - delete quiz (used in admin pages)
export const deleteQuiz = (id: string): void => {
  const quizzes = getQuizzes();
  const filtered = quizzes.filter(q => q.id !== id);
  saveQuizzes(filtered);
};

export const deleteExercise = (id: string): void => {
  const exercises = getExercises();
  const filtered = exercises.filter(e => e.id !== id);
  saveExercises(filtered);
};

// Progress
export const getStudentProgress = (studentId: string, courseId: string): StudentProgress | null => {
  const allProgress = getItem<StudentProgress[]>(STORAGE_KEYS.PROGRESS, []);
  return allProgress.find(p => p.studentId === studentId && p.courseId === courseId) || null;
};

export const getAllStudentProgress = (studentId: string): StudentProgress[] => {
  const allProgress = getItem<StudentProgress[]>(STORAGE_KEYS.PROGRESS, []);
  return allProgress.filter(p => p.studentId === studentId);
};

export const saveStudentProgress = (progress: StudentProgress): void => {
  const allProgress = getItem<StudentProgress[]>(STORAGE_KEYS.PROGRESS, []);
  const index = allProgress.findIndex(
    p => p.studentId === progress.studentId && p.courseId === progress.courseId
  );
  if (index >= 0) {
    allProgress[index] = progress;
  } else {
    allProgress.push(progress);
  }
  setItem(STORAGE_KEYS.PROGRESS, allProgress);
};

// Exercise Attempts
export const saveExerciseAttempt = (attempt: ExerciseAttempt): void => {
  const attempts = getItem<ExerciseAttempt[]>(STORAGE_KEYS.EXERCISE_ATTEMPTS, []);
  attempts.push(attempt);
  setItem(STORAGE_KEYS.EXERCISE_ATTEMPTS, attempts);
};

export const getExerciseAttempts = (studentId: string, exerciseId?: string): ExerciseAttempt[] => {
  const attempts = getItem<ExerciseAttempt[]>(STORAGE_KEYS.EXERCISE_ATTEMPTS, []);
  let filtered = studentId ? attempts.filter(a => a.studentId === studentId) : attempts;
  if (exerciseId) {
    filtered = filtered.filter(a => a.exerciseId === exerciseId);
  }
  return filtered;
};

// Quiz Attempts
export const saveQuizAttempt = (attempt: QuizAttempt): void => {
  const attempts = getItem<QuizAttempt[]>(STORAGE_KEYS.QUIZ_ATTEMPTS, []);
  attempts.push(attempt);
  setItem(STORAGE_KEYS.QUIZ_ATTEMPTS, attempts);
};

export const getQuizAttempts = (studentId: string, quizId?: string): QuizAttempt[] => {
  const attempts = getItem<QuizAttempt[]>(STORAGE_KEYS.QUIZ_ATTEMPTS, []);
  let filtered = studentId ? attempts.filter(a => a.studentId === studentId) : attempts;
  if (quizId) {
    filtered = filtered.filter(a => a.quizId === quizId);
  }
  return filtered;
};

// Statistics (for teachers)
export const getStatistics = (): Statistics => {
  const courses = getCourses();
  const allProgress = getItem<StudentProgress[]>(STORAGE_KEYS.PROGRESS, []);
  const allQuizAttempts = getItem<QuizAttempt[]>(STORAGE_KEYS.QUIZ_ATTEMPTS, []);
  const allExerciseAttempts = getItem<ExerciseAttempt[]>(STORAGE_KEYS.EXERCISE_ATTEMPTS, []);

  const uniqueStudents = new Set([
    ...allProgress.map(p => p.studentId),
    ...allQuizAttempts.map(a => a.studentId),
    ...allExerciseAttempts.map(a => a.studentId),
  ]);

  const allScores = [
    ...allQuizAttempts.map(a => (a.score / a.maxScore) * 100),
    ...allExerciseAttempts.map(a => (a.score / a.maxScore) * 100),
  ];
  const averageScore = allScores.length > 0
    ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
    : 0;

  const courseStats: Statistics['courseStats'] = courses.map(course => {
    const courseProgress = allProgress.filter(p => p.courseId === course.id);
    const courseQuizAttempts = allQuizAttempts.filter(a => {
      const quiz = getQuiz(a.quizId);
      return quiz?.courseId === course.id;
    });
    const courseExerciseAttempts = allExerciseAttempts.filter(a => {
      const exercise = getExercise(a.exerciseId);
      return exercise?.courseId === course.id;
    });

    const courseScores = [
      ...courseQuizAttempts.map(a => (a.score / a.maxScore) * 100),
      ...courseExerciseAttempts.map(a => (a.score / a.maxScore) * 100),
    ];
    const courseAvgScore = courseScores.length > 0
      ? courseScores.reduce((sum, score) => sum + score, 0) / courseScores.length
      : 0;

    const topPerformers = Array.from(new Set(courseProgress.map(p => p.studentId)))
      .map(studentId => {
        const studentAttempts = [
          ...courseQuizAttempts.filter(a => a.studentId === studentId),
          ...courseExerciseAttempts.filter(a => a.studentId === studentId),
        ];
        const totalScore = studentAttempts.reduce((sum, a) => sum + (a.score / a.maxScore) * 100, 0);
        const avgScore = studentAttempts.length > 0 ? totalScore / studentAttempts.length : 0;
        return { studentId, name: `Student ${studentId}`, score: avgScore };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    return {
      courseId: course.id,
      courseName: course.name,
      enrolledStudents: new Set(courseProgress.map(p => p.studentId)).size,
      averageScore: courseAvgScore,
      completionRate: courseProgress.length > 0 ? (courseProgress[0].completedLessons.length / course.lessons.length) * 100 : 0,
      topPerformers,
    };
  });

  return {
    totalStudents: uniqueStudents.size,
    totalExercises: getExercises().length,
    totalQuizzes: getQuizzes().length,
    averageScore,
    completionRate: 0, // Calculate based on your logic
    courseStats,
  };
};

