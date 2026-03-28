import { API_ROUTES } from '../const/apiConfig';
import type { Unit } from '../types';
import type { CreateUnitDto, UpdateUnitDto } from '../types/dto';
import { api } from './api';

const createUnit = async (dto: CreateUnitDto): Promise<Unit> => {
  const response = await api.post(API_ROUTES.UNIT, dto);
  return response.data;
};

const updateUnit = async (id: string, dto: UpdateUnitDto): Promise<Unit> => {
  const response = await api.put(`${API_ROUTES.UNIT}/${id}`, dto);
  return response.data;
};

const deleteUnit = async (id: string): Promise<void> => {
  await api.delete(`${API_ROUTES.UNIT}/${id}`);
};

const getAllUnits = async (): Promise<Unit[]> => {
  const response = await api.get(API_ROUTES.UNIT);
  return response.data;
};

const getUnitsByCourseId = async (courseId: string): Promise<Unit[]> => {
  const response = await api.get(`${API_ROUTES.UNIT}/course/${courseId}`);
  return response.data;
};

export const unitService = {
  createUnit,
  updateUnit,
  deleteUnit,
  getAllUnits,
  getUnitsByCourseId,
};
