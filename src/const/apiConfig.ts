export const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error(
    'Missing environment variable: VITE_API_URL. Please check your .env file.',
  );
}

export const API_ROUTES = {
  AUTH: '/auth',
  USER: '/user',
  COURSE: '/course',
  LESSON: '/lesson',
  EXERCISE: '/exercise',
  QUIZ: '/quiz',
  EXERCISE_ATTEMPT: '/exercise-attempt',
  QUIZ_ATTEMPT: '/quiz-attempt',
  FILE_MANAGER: '/file-manager',
  RESOURCES: '/resources',
};
