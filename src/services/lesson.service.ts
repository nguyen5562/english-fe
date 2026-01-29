import { API_ROUTES } from "../const/apiConfig";
import type { Lesson } from "../types";
import type {
  CreateLessonDto,
  LessonObjType,
  UpdateLessonDto,
} from "../types/dto";
import { api } from "./api";

const createLesson = async (dto: CreateLessonDto): Promise<Lesson> => {
  const response = await api.post(API_ROUTES.LESSON, dto);
  return response.data;
};

const updateLesson = async (
  id: string,
  dto: UpdateLessonDto
): Promise<Lesson> => {
  const reponse = await api.put(API_ROUTES.LESSON + "/" + id, dto);
  return reponse.data;
};

const getAllLesson = async (): Promise<Lesson[]> => {
  const response = await api.get(API_ROUTES.LESSON);
  return response.data;
};

const getLessonById = async (id: string): Promise<Lesson> => {
  const response = await api.get(API_ROUTES.LESSON + "/" + id);
  return response.data;
};

const getLessonByCourseId = async (courseId: string): Promise<Lesson[]> => {
  const response = await api.get(API_ROUTES.LESSON + "/course/" + courseId);
  return response.data;
};

const deleteLesson = async (id: string): Promise<void> => {
  return await api.delete(API_ROUTES.LESSON + "/" + id);
};

const addSlide = async (
  lessonId: string,
  dto: LessonObjType
): Promise<Lesson> => {
  const response = await api.post(
    API_ROUTES.LESSON + "/" + lessonId + "/slide",
    dto
  );
  return response.data;
};

const updateSlide = async (
  lessonId: string,
  slideId: string,
  dto: LessonObjType
): Promise<Lesson> => {
  const response = await api.put(
    API_ROUTES.LESSON + "/" + lessonId + "/slide/" + slideId,
    dto
  );
  return response.data;
};

const removeSlide = async (
  lessonId: string,
  slideId: string
): Promise<Lesson> => {
  const response = await api.delete(
    API_ROUTES.LESSON + "/" + lessonId + "/slide/" + slideId
  );
  return response.data;
};

const addVideo = async (
  lessonId: string,
  dto: LessonObjType
): Promise<Lesson> => {
  const response = await api.post(
    API_ROUTES.LESSON + "/" + lessonId + "/video",
    dto
  );
  return response.data;
};

const updateVideo = async (
  lessonId: string,
  videoId: string,
  dto: LessonObjType
): Promise<Lesson> => {
  const response = await api.put(
    API_ROUTES.LESSON + "/" + lessonId + "/video/" + videoId,
    dto
  );
  return response.data;
};

const removeVideo = async (
  lessonId: string,
  videoId: string
): Promise<Lesson> => {
  const response = await api.delete(
    API_ROUTES.LESSON + "/" + lessonId + "/video/" + videoId
  );
  return response.data;
};

const addReference = async (
  lessonId: string,
  dto: LessonObjType
): Promise<Lesson> => {
  const response = await api.post(
    API_ROUTES.LESSON + "/" + lessonId + "/reference",
    dto
  );
  return response.data;
};

const updateReference = async (
  lessonId: string,
  referenceId: string,
  dto: LessonObjType
): Promise<Lesson> => {
  const response = await api.put(
    API_ROUTES.LESSON + "/" + lessonId + "/reference/" + referenceId,
    dto
  );
  return response.data;
};

const removeReference = async (
  lessonId: string,
  referenceId: string
): Promise<Lesson> => {
  const response = await api.delete(
    API_ROUTES.LESSON + "/" + lessonId + "/reference/" + referenceId
  );
  return response.data;
};

export const lessonService = {
  createLesson,
  updateLesson,
  getAllLesson,
  getLessonById,
  getLessonByCourseId,
  deleteLesson,
  addSlide,
  updateSlide,
  removeSlide,
  addVideo,
  updateVideo,
  removeVideo,
  addReference,
  updateReference,
  removeReference,
};
