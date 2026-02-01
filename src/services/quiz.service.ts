import { API_ROUTES } from '../const/apiConfig';
import type { Quiz } from '../types';
import type {
  CreateQuizDto,
  QuestionDto,
  SectionDto,
  UpdateQuizDto,
} from '../types/dto';
import { api } from './api';

// Quiz
const createQuiz = async (dto: CreateQuizDto): Promise<Quiz> => {
  const response = await api.post(API_ROUTES.QUIZ, dto);
  return response.data;
};

const updateQuiz = async (id: string, dto: UpdateQuizDto): Promise<Quiz> => {
  const response = await api.put(`${API_ROUTES.QUIZ}/${id}`, dto);
  return response.data;
};

const deleteQuiz = async (id: string): Promise<void> => {
  return await api.delete(`${API_ROUTES.QUIZ}/${id}`);
};

const getAllQuiz = async (): Promise<Quiz[]> => {
  const response = await api.get(API_ROUTES.QUIZ);
  return response.data;
};

const getQuizById = async (id: string): Promise<Quiz> => {
  const response = await api.get(`${API_ROUTES.QUIZ}/${id}`);
  return response.data;
};

// Section
const addSection = async (
  quizId: string,
  section: SectionDto,
): Promise<Quiz> => {
  const response = await api.post(
    `${API_ROUTES.QUIZ}/${quizId}/section`,
    section,
  );
  return response.data;
};

const updateSection = async (
  quizId: string,
  sectionId: string,
  section: SectionDto,
): Promise<Quiz> => {
  const response = await api.put(
    `${API_ROUTES.QUIZ}/${quizId}/section/${sectionId}`,
    section,
  );
  return response.data;
};

const removeSection = async (
  quizId: string,
  sectionId: string,
): Promise<Quiz> => {
  const response = await api.delete(
    `${API_ROUTES.QUIZ}/${quizId}/section/${sectionId}`,
  );
  return response.data;
};

// Question
const addQuestion = async (
  quizId: string,
  sectionId: string,
  question: QuestionDto,
): Promise<Quiz> => {
  const reponse = await api.post(
    `${API_ROUTES.QUIZ}/${quizId}/section/${sectionId}/question`,
    question,
  );
  return reponse.data;
};

const updateQuestion = async (
  quizId: string,
  sectionId: string,
  questionId: string,
  question: QuestionDto,
): Promise<Quiz> => {
  const response = await api.put(
    `${API_ROUTES.QUIZ}/${quizId}/section/${sectionId}/question/${questionId}`,
    question,
  );
  return response.data;
};

const removeQuestion = async (
  quizId: string,
  sectionId: string,
  questionId: string,
): Promise<Quiz> => {
  const response = await api.delete(
    `${API_ROUTES.QUIZ}/${quizId}/section/${sectionId}/question/${questionId}`,
  );
  return response.data;
};

// Service
export const quizService = {
  createQuiz,
  updateQuiz,
  deleteQuiz,
  getAllQuiz,
  getQuizById,
  addSection,
  updateSection,
  removeSection,
  addQuestion,
  updateQuestion,
  removeQuestion,
};
