import { API_ROUTES } from '../const/apiConfig';
import type { Exercise } from '../types';
import type {
  CreateExerciseDto,
  QuestionDto,
  SectionDto,
  UpdateExerciseDto,
} from '../types/dto';
import { api } from './api';

// Exercise
const createExercise = async (dto: CreateExerciseDto): Promise<Exercise> => {
  const response = await api.post(API_ROUTES.EXERCISE, dto);
  return response.data;
};

const updateExercise = async (
  id: string,
  dto: UpdateExerciseDto,
): Promise<Exercise> => {
  const response = await api.put(`${API_ROUTES.EXERCISE}/${id}`, dto);
  return response.data;
};

const deleteExercise = async (id: string): Promise<void> => {
  return await api.delete(`${API_ROUTES.EXERCISE}/${id}`);
};

const getAllExercise = async (): Promise<Exercise[]> => {
  const response = await api.get(API_ROUTES.EXERCISE);
  return response.data;
};

const getExerciseById = async (id: string): Promise<Exercise> => {
  const response = await api.get(`${API_ROUTES.EXERCISE}/${id}`);
  return response.data;
};

// Section
const addSection = async (
  exerciseId: string,
  section: SectionDto,
): Promise<Exercise> => {
  const response = await api.post(
    `${API_ROUTES.EXERCISE}/${exerciseId}/section`,
    section,
  );
  return response.data;
};

const updateSection = async (
  exerciseId: string,
  sectionId: string,
  section: SectionDto,
): Promise<Exercise> => {
  const response = await api.put(
    `${API_ROUTES.EXERCISE}/${exerciseId}/section/${sectionId}`,
    section,
  );
  return response.data;
};

const removeSection = async (
  exerciseId: string,
  sectionId: string,
): Promise<Exercise> => {
  const response = await api.delete(
    `${API_ROUTES.EXERCISE}/${exerciseId}/section/${sectionId}`,
  );
  return response.data;
};

// Question
const addQuestion = async (
  exerciseId: string,
  sectionId: string,
  question: QuestionDto,
): Promise<Exercise> => {
  const reponse = await api.post(
    `${API_ROUTES.EXERCISE}/${exerciseId}/section/${sectionId}/question`,
    question,
  );
  return reponse.data;
};

const updateQuestion = async (
  exerciseId: string,
  sectionId: string,
  questionId: string,
  question: QuestionDto,
): Promise<Exercise> => {
  const response = await api.put(
    `${API_ROUTES.EXERCISE}/${exerciseId}/section/${sectionId}/question/${questionId}`,
    question,
  );
  return response.data;
};

const removeQuestion = async (
  exerciseId: string,
  sectionId: string,
  questionId: string,
): Promise<Exercise> => {
  const response = await api.delete(
    `${API_ROUTES.EXERCISE}/${exerciseId}/section/${sectionId}/question/${questionId}`,
  );
  return response.data;
};

// Service
export const exerciseService = {
  createExercise,
  updateExercise,
  deleteExercise,
  getAllExercise,
  getExerciseById,
  addSection,
  updateSection,
  removeSection,
  addQuestion,
  updateQuestion,
  removeQuestion,
};
