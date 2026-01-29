import { API_ROUTES } from "../const/apiConfig";
import type { Course } from "../types";
import { api } from "./api";

const createCourse = async (dto: Omit<Course, "_id">): Promise<Course> => {
  const response = await api.post(API_ROUTES.COURSE, dto);
  return response.data;
};

const updateCourse = async (
  id: string,
  dto: Partial<Omit<Course, "_id">>
): Promise<Course> => {
  const response = await api.put(API_ROUTES.COURSE + "/" + id, dto);
  return response.data;
};

const deleteCourse = async (id: string): Promise<void> => {
  return await api.delete(API_ROUTES.COURSE + "/" + id);
};

const getAllCourse = async (): Promise<Course[]> => {
  const response = await api.get(API_ROUTES.COURSE);
  return response.data;
};

const getCourseById = async (id: string): Promise<Course> => {
  const response = await api.get(API_ROUTES.COURSE + "/" + id);
  return response.data;
};

export const courseService = {
  createCourse,
  updateCourse,
  deleteCourse,
  getAllCourse,
  getCourseById,
};
