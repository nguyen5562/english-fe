import { API_ROUTES } from "../const/apiConfig";
import type { QuizAttempt } from "../types";
import type { QuizAttemptDto, SubmitAttemptDto } from "../types/dto";
import { api } from "./api";

const createQuizAttempt = async (dto: QuizAttemptDto): Promise<QuizAttempt> => {
  const response = await api.post(API_ROUTES.QUIZ_ATTEMPT, dto);
  return response.data;
};

const submitQuiz = async (
  quizAttemptId: string,
  dto: SubmitAttemptDto
): Promise<QuizAttempt> => {
  const response = await api.post(
    `${API_ROUTES.QUIZ_ATTEMPT}/${quizAttemptId}`,
    dto
  );
  return response.data;
};

const getQuizAttemptByUserId = async (
  userId: string
): Promise<QuizAttempt[]> => {
  const response = await api.get(`${API_ROUTES.QUIZ_ATTEMPT}/user/${userId}`);
  return response.data;
};

const getQuizAttemptByQuizId = async (
  quizId: string
): Promise<QuizAttempt[]> => {
  const response = await api.get(`${API_ROUTES.QUIZ_ATTEMPT}/quiz/${quizId}`);
  return response.data;
};

const getQuizAttemptById = async (id: string): Promise<QuizAttempt> => {
  const response = await api.get(`${API_ROUTES.QUIZ_ATTEMPT}/${id}`);
  return response.data;
};

export const quizAttemptService = {
  createQuizAttempt,
  submitQuiz,
  getQuizAttemptByUserId,
  getQuizAttemptByQuizId,
  getQuizAttemptById,
};
