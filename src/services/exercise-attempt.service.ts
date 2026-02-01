import { API_ROUTES } from '../const/apiConfig';
import type { ExerciseAttempt } from '../types';
import type { ExerciseAttemptDto, SectionAttemptDto } from '../types/dto';
import { api } from './api';

const createExerciseAttempt = async (
  dto: ExerciseAttemptDto,
): Promise<ExerciseAttempt> => {
  const response = await api.post(API_ROUTES.EXERCISE_ATTEMPT, dto);
  return response.data;
};

const submitSection = async (
  exerciseAttemptId: string,
  dto: SectionAttemptDto,
): Promise<ExerciseAttempt> => {
  const response = await api.post(
    `${API_ROUTES.EXERCISE_ATTEMPT}/${exerciseAttemptId}/sections`,
    dto,
  );
  return response.data;
};

const getExerciseAttemptByUserId = async (
  userId: string,
): Promise<ExerciseAttempt[]> => {
  const response = await api.get(
    `${API_ROUTES.EXERCISE_ATTEMPT}/user/${userId}`,
  );
  return response.data;
};

const getExerciseAttemptByExerciseId = async (
  exerciseId: string,
): Promise<ExerciseAttempt[]> => {
  const response = await api.get(
    `${API_ROUTES.EXERCISE_ATTEMPT}/exercise/${exerciseId}`,
  );
  return response.data;
};

const getExerciseAttemptById = async (id: string): Promise<ExerciseAttempt> => {
  const response = await api.get(`${API_ROUTES.EXERCISE_ATTEMPT}/${id}`);
  return response.data;
};

export const exerciseAttemptService = {
  createExerciseAttempt,
  submitSection,
  getExerciseAttemptByUserId,
  getExerciseAttemptByExerciseId,
  getExerciseAttemptById,
};
