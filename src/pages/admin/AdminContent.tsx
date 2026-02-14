import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  School as SchoolIcon,
  MenuBook as MenuBookIcon,
  Slideshow as SlideshowIcon,
  VideoLibrary as VideoLibraryIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuthStore } from '../../store/auth.store';
import { courseService } from '../../services/course.service';
import { lessonService } from '../../services/lesson.service';
import { useConfirm } from '../../components/ConfirmDialog';
import { toast } from '../../utils/toast';
import type { Course, Lesson } from '../../types';
import type { LessonObjType } from '../../types/dto';

// FilePicker Component
function FilePicker({
  value,
  onChange,
  label,
  disabled,
  helperText,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  disabled?: boolean;
  helperText?: string;
}) {
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      // chặn domain lạ
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'FM_PICK' && typeof e.data.url === 'string') {
        onChange(e.data.url);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [onChange]);

  const openPopup = () => {
    // nếu đã mở rồi thì focus
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }

    popupRef.current = window.open(
      '/file-manager-popup',
      'FileManager',
      'width=1200,height=800',
    );
  };

  return (
    <Box>
      <Typography
        variant="body2"
        sx={{
          mb: 1,
          fontWeight: 500,
          color: 'text.primary',
        }}
      >
        {label} <span style={{ color: 'red' }}>*</span>
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
        <TextField
          fullWidth
          placeholder="Nhập URL hoặc chọn file"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          helperText={helperText}
          disabled={disabled}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
            },
          }}
        />
        <Button
          variant="outlined"
          onClick={openPopup}
          disabled={disabled}
          sx={{
            height: '56px', // Match TextField height
            minWidth: '120px',
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 500,
            borderColor: 'primary.main',
            color: 'primary.main',
            whiteSpace: 'nowrap',
            '&:hover': {
              borderColor: 'primary.dark',
              backgroundColor: 'primary.light',
              color: 'primary.dark',
            },
          }}
        >
          Chọn file
        </Button>
      </Box>
    </Box>
  );
}

export default function AdminContent() {
  const user = useAuthStore((s) => s.user);
  const { confirm, ConfirmDialog } = useConfirm();
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessonsMap, setLessonsMap] = useState<Record<string, Lesson[]>>({});
  const [loadingLessons, setLoadingLessons] = useState<Record<string, boolean>>(
    {},
  );
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [openCourseDialog, setOpenCourseDialog] = useState(false);
  const [openLessonDialog, setOpenLessonDialog] = useState(false);
  const [openSlideDialog, setOpenSlideDialog] = useState(false);
  const [openVideoDialog, setOpenVideoDialog] = useState(false);
  const [openReferenceDialog, setOpenReferenceDialog] = useState(false);

  const [courseForm, setCourseForm] = useState({
    name: '',
    code: '',
    description: '',
  });
  const [lessonForm, setLessonForm] = useState({ title: '' });
  const [slideForm, setSlideForm] = useState({ title: '', url: '' });
  const [videoForm, setVideoForm] = useState({ title: '', url: '' });
  const [referenceForm, setReferenceForm] = useState({
    title: '',
    url: '',
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    if (isTeacher) {
      fetchCourses();
    }
  }, [isTeacher]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const coursesData = await courseService.getAllCourse();
      setCourses(coursesData);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể tải danh sách học phần';
        toast.error(String(msg));
      } else {
        toast.error('Không thể tải danh sách học phần');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLessonsForCourse = async (courseId: string) => {
    // Nếu đã load rồi thì không load lại
    if (lessonsMap[courseId] !== undefined) {
      return;
    }

    try {
      setLoadingLessons((prev) => ({ ...prev, [courseId]: true }));
      const lessons = await lessonService.getLessonByCourseId(courseId);
      setLessonsMap((prev) => ({ ...prev, [courseId]: lessons }));
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể tải danh sách bài học';
        toast.error(String(msg));
      } else {
        toast.error('Không thể tải danh sách bài học');
      }
    } finally {
      setLoadingLessons((prev) => ({ ...prev, [courseId]: false }));
    }
  };

  const handleAccordionChange = (courseId: string, expanded: boolean) => {
    if (expanded) {
      fetchLessonsForCourse(courseId);
    }
  };

  if (!isTeacher) {
    return (
      <Box>
        <Alert severity="error">
          Bạn không có quyền truy cập trang này. Chỉ dành cho giảng viên.
        </Alert>
      </Box>
    );
  }

  // Course handlers
  const handleAddCourse = () => {
    setCourseForm({ name: '', code: '', description: '' });
    setSelectedCourse(null);
    setOpenCourseDialog(true);
  };

  const handleEditCourse = (course: Course) => {
    setCourseForm({
      name: course.name,
      code: course.code,
      description: course.description,
    });
    setSelectedCourse(course);
    setOpenCourseDialog(true);
  };

  const handleSaveCourse = async () => {
    if (!courseForm.name || !courseForm.code) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      setSaving(true);
      if (selectedCourse) {
        await courseService.updateCourse(selectedCourse._id, courseForm);
      } else {
        await courseService.createCourse(courseForm);
      }
      await fetchCourses();
      setOpenCourseDialog(false);
      setSelectedCourse(null);
      toast.success(
        selectedCourse
          ? 'Đã cập nhật học phần thành công'
          : 'Đã thêm học phần thành công',
      );
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể lưu học phần';
        toast.error(String(msg));
      } else {
        toast.error('Không thể lưu học phần');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async (id: string) => {
    const confirmed = await confirm({
      title: 'Xác nhận xóa học phần',
      message:
        'Bạn có chắc chắn muốn xóa học phần này? Tất cả bài học và tài liệu sẽ bị xóa.',
      confirmText: 'Xóa',
      confirmColor: 'error',
    });
    if (!confirmed) {
      return;
    }

    try {
      await courseService.deleteCourse(id);
      await fetchCourses();
      // Xóa lessons khỏi map nếu có
      setLessonsMap((prev) => {
        const newMap = { ...prev };
        delete newMap[id];
        return newMap;
      });
      toast.success('Đã xóa học phần thành công');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể xóa học phần';
        toast.error(String(msg));
      } else {
        toast.error('Không thể xóa học phần');
      }
    }
  };

  // Lesson handlers
  const handleAddLesson = (course: Course) => {
    setSelectedCourse(course);
    setLessonForm({ title: '' });
    setSelectedLesson(null);
    setOpenLessonDialog(true);
  };

  const handleEditLesson = (course: Course, lesson: Lesson) => {
    setSelectedCourse(course);
    setSelectedLesson(lesson);
    setLessonForm({ title: lesson.title });
    setOpenLessonDialog(true);
  };

  const handleSaveLesson = async () => {
    if (!selectedCourse || !lessonForm.title) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      setSaving(true);
      if (selectedLesson) {
        await lessonService.updateLesson(selectedLesson._id, {
          title: lessonForm.title,
        });
      } else {
        await lessonService.createLesson({
          title: lessonForm.title,
          courseId: selectedCourse._id,
        });
      }
      // Refresh lessons của course này
      await fetchLessonsForCourse(selectedCourse._id);
      setOpenLessonDialog(false);
      setSelectedLesson(null);
      toast.success(
        selectedLesson
          ? 'Đã cập nhật bài học thành công'
          : 'Đã thêm bài học thành công',
      );
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể lưu bài học';
        toast.error(String(msg));
      } else {
        toast.error('Không thể lưu bài học');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async (courseId: string, lessonId: string) => {
    const confirmed = await confirm({
      title: 'Xác nhận xóa bài học',
      message:
        'Bạn có chắc chắn muốn xóa bài học này? Tất cả slides, videos và tài liệu sẽ bị xóa.',
      confirmText: 'Xóa',
      confirmColor: 'error',
    });
    if (!confirmed) {
      return;
    }

    try {
      await lessonService.deleteLesson(lessonId);
      // Refresh lessons của course này
      await fetchLessonsForCourse(courseId);
      toast.success('Đã xóa bài học thành công');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể xóa bài học';
        toast.error(String(msg));
      } else {
        toast.error('Không thể xóa bài học');
      }
    }
  };

  // Slide handlers
  const handleAddSlide = (course: Course, lesson: Lesson) => {
    setSelectedCourse(course);
    setSelectedLesson(lesson);
    setSlideForm({ title: '', url: '' });
    setOpenSlideDialog(true);
  };

  const handleSaveSlide = async () => {
    if (
      !selectedCourse ||
      !selectedLesson ||
      !slideForm.title ||
      !slideForm.url
    ) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      setSaving(true);
      const dto: LessonObjType = {
        title: slideForm.title,
        url: slideForm.url,
      };
      await lessonService.addSlide(selectedLesson._id, dto);
      // Refresh lessons của course này
      await fetchLessonsForCourse(selectedCourse._id);
      setOpenSlideDialog(false);
      toast.success('Đã thêm slide thành công');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể thêm slide';
        toast.error(String(msg));
      } else {
        toast.error('Không thể thêm slide');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlide = async (
    courseId: string,
    lessonId: string,
    slideId: string,
  ) => {
    const confirmed = await confirm({
      title: 'Xác nhận xóa slide',
      message: 'Bạn có chắc chắn muốn xóa slide này?',
      confirmText: 'Xóa',
      confirmColor: 'error',
    });
    if (!confirmed) {
      return;
    }

    try {
      await lessonService.removeSlide(lessonId, slideId);
      // Refresh lessons của course này
      await fetchLessonsForCourse(courseId);
      toast.success('Đã xóa slide thành công');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể xóa slide';
        toast.error(String(msg));
      } else {
        toast.error('Không thể xóa slide');
      }
    }
  };

  // Video handlers
  const handleAddVideo = (course: Course, lesson: Lesson) => {
    setSelectedCourse(course);
    setSelectedLesson(lesson);
    setVideoForm({ title: '', url: '' });
    setOpenVideoDialog(true);
  };

  const handleSaveVideo = async () => {
    if (
      !selectedCourse ||
      !selectedLesson ||
      !videoForm.title ||
      !videoForm.url
    ) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      setSaving(true);
      const dto: LessonObjType = {
        title: videoForm.title,
        url: videoForm.url,
      };
      await lessonService.addVideo(selectedLesson._id, dto);
      // Refresh lessons của course này
      await fetchLessonsForCourse(selectedCourse._id);
      setOpenVideoDialog(false);
      toast.success('Đã thêm video thành công');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể thêm video';
        toast.error(String(msg));
      } else {
        toast.error('Không thể thêm video');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVideo = async (
    courseId: string,
    lessonId: string,
    videoId: string,
  ) => {
    const confirmed = await confirm({
      title: 'Xác nhận xóa video',
      message: 'Bạn có chắc chắn muốn xóa video này?',
      confirmText: 'Xóa',
      confirmColor: 'error',
    });
    if (!confirmed) {
      return;
    }

    try {
      await lessonService.removeVideo(lessonId, videoId);
      // Refresh lessons của course này
      await fetchLessonsForCourse(courseId);
      toast.success('Đã xóa video thành công');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể xóa video';
        toast.error(String(msg));
      } else {
        toast.error('Không thể xóa video');
      }
    }
  };

  // Reference handlers
  const handleAddReference = (course: Course, lesson: Lesson) => {
    setSelectedCourse(course);
    setSelectedLesson(lesson);
    setReferenceForm({ title: '', url: '' });
    setOpenReferenceDialog(true);
  };

  const handleSaveReference = async () => {
    if (
      !selectedCourse ||
      !selectedLesson ||
      !referenceForm.title ||
      !referenceForm.url
    ) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      setSaving(true);
      const dto: LessonObjType = {
        title: referenceForm.title,
        url: referenceForm.url,
      };
      await lessonService.addReference(selectedLesson._id, dto);
      // Refresh lessons của course này
      await fetchLessonsForCourse(selectedCourse._id);
      setOpenReferenceDialog(false);
      toast.success('Đã thêm tài liệu thành công');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể thêm tài liệu';
        toast.error(String(msg));
      } else {
        toast.error('Không thể thêm tài liệu');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReference = async (
    courseId: string,
    lessonId: string,
    referenceId: string,
  ) => {
    const confirmed = await confirm({
      title: 'Xác nhận xóa tài liệu',
      message: 'Bạn có chắc chắn muốn xóa tài liệu này?',
      confirmText: 'Xóa',
      confirmColor: 'error',
    });
    if (!confirmed) {
      return;
    }

    try {
      await lessonService.removeReference(lessonId, referenceId);
      // Refresh lessons của course này
      await fetchLessonsForCourse(courseId);
      toast.success('Đã xóa tài liệu thành công');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể xóa tài liệu';
        toast.error(String(msg));
      } else {
        toast.error('Không thể xóa tài liệu');
      }
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <MenuBookIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2.5 }} />
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}
            >
              Nội dung học tập
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              Quản lý danh sách khóa học, bài dạy và tài liệu đính kèm
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddCourse}
          disabled={loading}
          sx={{
            borderRadius: 2.5,
            px: 3,
            py: 1.2,
            textTransform: 'none',
            // fontWeight: 700,
            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
            '&:hover': { boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)' },
          }}
        >
          Thêm Học phần mới
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              Chưa có học phần nào. Hãy thêm học phần mới!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {courses.map((course) => {
            const lessons = lessonsMap[course._id] || [];
            const isLoadingLessons = loadingLessons[course._id] || false;

            return (
              <Accordion
                key={course._id}
                defaultExpanded={courses.length === 1}
                onChange={(_, expanded) =>
                  handleAccordionChange(course._id, expanded)
                }
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                    }}
                  >
                    <SchoolIcon sx={{ mr: 2, color: 'primary.main' }} />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6">{course.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {course.code} - {course.description}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCourse(course);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCourse(course._id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => handleAddLesson(course)}
                      sx={{ mb: 2 }}
                    >
                      Thêm Bài học
                    </Button>
                  </Box>

                  {isLoadingLessons ? (
                    <Box
                      sx={{ display: 'flex', justifyContent: 'center', p: 2 }}
                    >
                      <CircularProgress size={24} />
                    </Box>
                  ) : lessons.length === 0 ? (
                    <Alert severity="info">
                      Chưa có bài học nào trong học phần này.
                    </Alert>
                  ) : (
                    <Box>
                      {lessons.map((lesson) => (
                        <Card key={lesson._id} sx={{ mb: 2 }}>
                          <CardContent>
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                mb: 2,
                              }}
                            >
                              <Box
                                sx={{ display: 'flex', alignItems: 'center' }}
                              >
                                <MenuBookIcon
                                  sx={{ mr: 1, color: 'primary.main' }}
                                />
                                <Box>
                                  <Typography variant="h6">
                                    {lesson.title}
                                  </Typography>
                                </Box>
                              </Box>
                              <Box>
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    handleEditLesson(course, lesson)
                                  }
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() =>
                                    handleDeleteLesson(course._id, lesson._id)
                                  }
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            {/* Slides */}
                            <Box sx={{ mb: 2 }}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  mb: 1,
                                }}
                              >
                                <Typography variant="subtitle1">
                                  <SlideshowIcon
                                    sx={{ verticalAlign: 'middle', mr: 1 }}
                                  />
                                  Slides ({lesson.slides?.length || 0})
                                </Typography>
                                <Button
                                  size="small"
                                  startIcon={<AddIcon />}
                                  onClick={() => handleAddSlide(course, lesson)}
                                >
                                  Thêm Slide
                                </Button>
                              </Box>
                              {lesson.slides && lesson.slides.length > 0 ? (
                                <List dense>
                                  {lesson.slides.map((slide) => (
                                    <ListItem key={slide._id}>
                                      <ListItemText
                                        primary={slide.title}
                                        secondary={`URL: ${slide.url}`}
                                      />
                                      <ListItemSecondaryAction>
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() =>
                                            handleDeleteSlide(
                                              course._id,
                                              lesson._id,
                                              slide._id,
                                            )
                                          }
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </ListItemSecondaryAction>
                                    </ListItem>
                                  ))}
                                </List>
                              ) : (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ ml: 4 }}
                                >
                                  Chưa có slide nào
                                </Typography>
                              )}
                            </Box>

                            {/* Videos */}
                            <Box sx={{ mb: 2 }}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  mb: 1,
                                }}
                              >
                                <Typography variant="subtitle1">
                                  <VideoLibraryIcon
                                    sx={{ verticalAlign: 'middle', mr: 1 }}
                                  />
                                  Videos ({lesson.videos?.length || 0})
                                </Typography>
                                <Button
                                  size="small"
                                  startIcon={<AddIcon />}
                                  onClick={() => handleAddVideo(course, lesson)}
                                >
                                  Thêm Video
                                </Button>
                              </Box>
                              {lesson.videos && lesson.videos.length > 0 ? (
                                <List dense>
                                  {lesson.videos.map((video) => (
                                    <ListItem key={video._id}>
                                      <ListItemText
                                        primary={video.title}
                                        secondary={`URL: ${video.url}`}
                                      />
                                      <ListItemSecondaryAction>
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() =>
                                            handleDeleteVideo(
                                              course._id,
                                              lesson._id,
                                              video._id,
                                            )
                                          }
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </ListItemSecondaryAction>
                                    </ListItem>
                                  ))}
                                </List>
                              ) : (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ ml: 4 }}
                                >
                                  Chưa có video nào
                                </Typography>
                              )}
                            </Box>

                            {/* References */}
                            <Box>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  mb: 1,
                                }}
                              >
                                <Typography variant="subtitle1">
                                  <DescriptionIcon
                                    sx={{ verticalAlign: 'middle', mr: 1 }}
                                  />
                                  Tài liệu tham khảo (
                                  {lesson.references?.length || 0})
                                </Typography>
                                <Button
                                  size="small"
                                  startIcon={<AddIcon />}
                                  onClick={() =>
                                    handleAddReference(course, lesson)
                                  }
                                >
                                  Thêm Tài liệu
                                </Button>
                              </Box>
                              {lesson.references &&
                              lesson.references.length > 0 ? (
                                <List dense>
                                  {lesson.references.map((ref) => (
                                    <ListItem key={ref._id}>
                                      <ListItemText
                                        primary={ref.title}
                                        secondary={`URL: ${ref.url}`}
                                      />
                                      <ListItemSecondaryAction>
                                        <IconButton
                                          size="small"
                                          color="error"
                                          onClick={() =>
                                            handleDeleteReference(
                                              course._id,
                                              lesson._id,
                                              ref._id,
                                            )
                                          }
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </ListItemSecondaryAction>
                                    </ListItem>
                                  ))}
                                </List>
                              ) : (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  sx={{ ml: 4 }}
                                >
                                  Chưa có tài liệu nào
                                </Typography>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      {/* Course Dialog */}
      <Dialog
        open={openCourseDialog}
        onClose={() => setOpenCourseDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedCourse ? 'Sửa Học phần' : 'Thêm Học phần'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tên học phần"
                value={courseForm.name}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, name: e.target.value })
                }
                required
                disabled={saving}
              />
            </Grid>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mã học phần"
                value={courseForm.code}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, code: e.target.value })
                }
                required
                disabled={saving}
              />
            </Grid>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mô tả"
                value={courseForm.description}
                onChange={(e) =>
                  setCourseForm({ ...courseForm, description: e.target.value })
                }
                multiline
                rows={3}
                disabled={saving}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCourseDialog(false)} disabled={saving}>
            Hủy
          </Button>
          <Button
            onClick={handleSaveCourse}
            variant="contained"
            disabled={saving}
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog
        open={openLessonDialog}
        onClose={() => setOpenLessonDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedLesson ? 'Sửa Bài học' : 'Thêm Bài học'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tiêu đề bài học"
                value={lessonForm.title}
                onChange={(e) =>
                  setLessonForm({ ...lessonForm, title: e.target.value })
                }
                required
                disabled={saving}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLessonDialog(false)} disabled={saving}>
            Hủy
          </Button>
          <Button
            onClick={handleSaveLesson}
            variant="contained"
            disabled={saving}
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Slide Dialog */}
      <Dialog
        open={openSlideDialog}
        onClose={() => setOpenSlideDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 2,
            borderBottom: 1,
            borderColor: 'divider',
            fontWeight: 600,
            fontSize: '1.5rem',
          }}
        >
          Thêm Slide
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <Typography
                variant="body2"
                sx={{
                  mb: 1,
                  fontWeight: 500,
                  color: 'text.primary',
                }}
              >
                Tiêu đề slide <span style={{ color: 'red' }}>*</span>
              </Typography>
              <TextField
                fullWidth
                placeholder="Nhập tiêu đề slide"
                value={slideForm.title}
                onChange={(e) =>
                  setSlideForm({ ...slideForm, title: e.target.value })
                }
                disabled={saving}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Grid>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <FilePicker
                value={slideForm.url}
                onChange={(url: string) => setSlideForm({ ...slideForm, url })}
                label="URL file PowerPoint (.pptx)"
                helperText="Nhấn 'Chọn file' để mở file manager hoặc nhập URL trực tiếp"
                disabled={saving}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: 1,
            borderColor: 'divider',
            gap: 1,
          }}
        >
          <Button
            onClick={() => setOpenSlideDialog(false)}
            disabled={saving}
            sx={{
              textTransform: 'none',
              px: 3,
            }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSaveSlide}
            variant="contained"
            disabled={saving}
            sx={{
              textTransform: 'none',
              px: 3,
              borderRadius: 2,
              fontWeight: 500,
            }}
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Video Dialog */}
      <Dialog
        open={openVideoDialog}
        onClose={() => setOpenVideoDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 2,
            borderBottom: 1,
            borderColor: 'divider',
            fontWeight: 600,
            fontSize: '1.5rem',
          }}
        >
          Thêm Video
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <Typography
                variant="body2"
                sx={{
                  mb: 1,
                  fontWeight: 500,
                  color: 'text.primary',
                }}
              >
                Tiêu đề video <span style={{ color: 'red' }}>*</span>
              </Typography>
              <TextField
                fullWidth
                placeholder="Nhập tiêu đề video"
                value={videoForm.title}
                onChange={(e) =>
                  setVideoForm({ ...videoForm, title: e.target.value })
                }
                disabled={saving}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Grid>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <FilePicker
                value={videoForm.url}
                onChange={(url: string) => setVideoForm({ ...videoForm, url })}
                label="URL video"
                helperText="Nhấn 'Chọn file' để mở file manager hoặc nhập URL trực tiếp"
                disabled={saving}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: 1,
            borderColor: 'divider',
            gap: 1,
          }}
        >
          <Button
            onClick={() => setOpenVideoDialog(false)}
            disabled={saving}
            sx={{
              textTransform: 'none',
              px: 3,
            }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSaveVideo}
            variant="contained"
            disabled={saving}
            sx={{
              textTransform: 'none',
              px: 3,
              borderRadius: 2,
              fontWeight: 500,
            }}
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reference Dialog */}
      <Dialog
        open={openReferenceDialog}
        onClose={() => setOpenReferenceDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          },
        }}
      >
        <DialogTitle
          sx={{
            pb: 2,
            borderBottom: 1,
            borderColor: 'divider',
            fontWeight: 600,
            fontSize: '1.5rem',
          }}
        >
          Thêm Tài liệu tham khảo
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={3}>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <Typography
                variant="body2"
                sx={{
                  mb: 1,
                  fontWeight: 500,
                  color: 'text.primary',
                }}
              >
                Tiêu đề tài liệu <span style={{ color: 'red' }}>*</span>
              </Typography>
              <TextField
                fullWidth
                placeholder="Nhập tiêu đề tài liệu"
                value={referenceForm.title}
                onChange={(e) =>
                  setReferenceForm({ ...referenceForm, title: e.target.value })
                }
                disabled={saving}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Grid>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <FilePicker
                value={referenceForm.url}
                onChange={(url: string) =>
                  setReferenceForm({ ...referenceForm, url })
                }
                label="URL tài liệu"
                helperText="Nhấn 'Chọn file' để mở file manager hoặc nhập URL trực tiếp"
                disabled={saving}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: 1,
            borderColor: 'divider',
            gap: 1,
          }}
        >
          <Button
            onClick={() => setOpenReferenceDialog(false)}
            disabled={saving}
            sx={{
              textTransform: 'none',
              px: 3,
            }}
          >
            Hủy
          </Button>
          <Button
            onClick={handleSaveReference}
            variant="contained"
            disabled={saving}
            sx={{
              textTransform: 'none',
              px: 3,
              borderRadius: 2,
              fontWeight: 500,
            }}
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>
      {ConfirmDialog}
    </Box>
  );
}
