import { api } from './api';
import { API_ROUTES } from '../const/apiConfig';
import type { User } from '../types';
import type { RegisterDto } from '../types/dto';

const login = async (
  email: string,
  password: string,
): Promise<{ user: User; access_token: string }> => {
  const response = await api.post(API_ROUTES.AUTH + '/login', {
    email,
    password,
  });
  return response.data;
};

const register = async (dto: RegisterDto): Promise<User> => {
  const response = await api.post(API_ROUTES.AUTH + '/register', dto);
  return response.data;
};

const changePassword = async (
  oldPassword: string,
  newPassword: string,
): Promise<void> => {
  await api.post(API_ROUTES.AUTH + '/change-password', {
    oldPassword,
    newPassword,
  });
};

export const authService = {
  login,
  register,
  changePassword,
};
