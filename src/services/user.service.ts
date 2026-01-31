import { API_ROUTES } from "../const/apiConfig";
import type { User } from "../types";
import { api } from "./api";
import type { CreateUserDto, UpdateUserDto } from "../types/dto";

const createUser = async (dto: CreateUserDto): Promise<User> => {
  const response = await api.post(API_ROUTES.USER, dto);
  return response.data;
};

const updateUser = async (id: string, dto: UpdateUserDto): Promise<User> => {
  const response = await api.put(API_ROUTES.USER + "/" + id, dto);
  return response.data;
};

const getAllUser = async (): Promise<User[]> => {
  const response = await api.get(API_ROUTES.USER);
  return response.data;
};

const getUserById = async (id: string): Promise<User> => {
  const response = await api.get(API_ROUTES.USER + "/" + id);
  return response.data;
};

const getAllStudent = async (): Promise<User[]> => {
  const response = await api.get(API_ROUTES.USER + "/student");
  return response.data;
};

const deleteUser = async (id: string): Promise<void> => {
  await api.delete(API_ROUTES.USER + "/" + id);
};

export const userService = {
  createUser,
  updateUser,
  getAllUser,
  getUserById,
  getAllStudent,
  deleteUser,
};
