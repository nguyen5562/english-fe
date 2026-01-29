import { useState } from 'react';
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
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
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
import {
  getCourses,
  addCourse,
  updateCourse,
  deleteCourse,
  addLesson,
  updateLesson,
  deleteLesson,
  addSlide,
  deleteSlide,
  addVideo,
  deleteVideo,
  addReference,
  deleteReference,
  getUser,
} from '../../types old/storage';
import type { Course, Lesson, Slide, Video, Reference } from '../../types old';

export default function AdminContent() {
  const [courses, setCourses] = useState(getCourses());
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [openCourseDialog, setOpenCourseDialog] = useState(false);
  const [openLessonDialog, setOpenLessonDialog] = useState(false);
  const [openSlideDialog, setOpenSlideDialog] = useState(false);
  const [openVideoDialog, setOpenVideoDialog] = useState(false);
  const [openReferenceDialog, setOpenReferenceDialog] = useState(false);
  
  const [courseForm, setCourseForm] = useState({ name: '', code: '', description: '' });
  const [lessonForm, setLessonForm] = useState({ title: '', order: 1 });
  const [slideForm, setSlideForm] = useState({ title: '', fileUrl: '', order: 1 });
  const [videoForm, setVideoForm] = useState({ title: '', url: '', duration: 0, order: 1 });
  const [referenceForm, setReferenceForm] = useState({ title: '', type: 'pdf' as 'pdf' | 'link' | 'document', url: '' });

  const user = getUser();
  const isTeacher = user?.role === 'teacher';

  if (!isTeacher) {
    return (
      <Box>
        <Alert severity="error">Bạn không có quyền truy cập trang này. Chỉ dành cho giảng viên.</Alert>
      </Box>
    );
  }

  const refreshCourses = () => {
    setCourses(getCourses());
  };

  // Course handlers
  const handleAddCourse = () => {
    setCourseForm({ name: '', code: '', description: '' });
    setOpenCourseDialog(true);
  };

  const handleEditCourse = (course: Course) => {
    setCourseForm({ name: course.name, code: course.code, description: course.description });
    setSelectedCourse(course);
    setOpenCourseDialog(true);
  };

  const handleSaveCourse = () => {
    if (!courseForm.name || !courseForm.code) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (selectedCourse) {
      updateCourse(selectedCourse.id, courseForm);
    } else {
      const newCourse: Course = {
        id: Date.now().toString(),
        ...courseForm,
        lessons: [],
      };
      addCourse(newCourse);
    }
    refreshCourses();
    setOpenCourseDialog(false);
    setSelectedCourse(null);
  };

  const handleDeleteCourse = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa học phần này? Tất cả bài học và tài liệu sẽ bị xóa.')) {
      deleteCourse(id);
      refreshCourses();
    }
  };

  // Lesson handlers
  const handleAddLesson = (course: Course) => {
    setSelectedCourse(course);
    setLessonForm({ title: '', order: course.lessons.length + 1 });
    setOpenLessonDialog(true);
  };

  const handleEditLesson = (course: Course, lesson: Lesson) => {
    setSelectedCourse(course);
    setSelectedLesson(lesson);
    setLessonForm({ title: lesson.title, order: lesson.order });
    setOpenLessonDialog(true);
  };

  const handleSaveLesson = () => {
    if (!selectedCourse || !lessonForm.title) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (selectedLesson) {
      updateLesson(selectedCourse.id, selectedLesson.id, lessonForm);
    } else {
      const newLesson: Lesson = {
        id: Date.now().toString(),
        courseId: selectedCourse.id,
        ...lessonForm,
        slides: [],
        videos: [],
        references: [],
      };
      addLesson(selectedCourse.id, newLesson);
    }
    refreshCourses();
    setOpenLessonDialog(false);
    setSelectedLesson(null);
  };

  const handleDeleteLesson = (courseId: string, lessonId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa bài học này? Tất cả slides, videos và tài liệu sẽ bị xóa.')) {
      deleteLesson(courseId, lessonId);
      refreshCourses();
    }
  };

  // Slide handlers
  const handleAddSlide = (course: Course, lesson: Lesson) => {
    setSelectedCourse(course);
    setSelectedLesson(lesson);
    setSlideForm({ title: '', fileUrl: '', order: (lesson.slides?.length || 0) + 1 });
    setOpenSlideDialog(true);
  };

  const handleSaveSlide = () => {
    if (!selectedCourse || !selectedLesson || !slideForm.title || !slideForm.fileUrl) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const newSlide: Slide = {
      id: Date.now().toString(),
      lessonId: selectedLesson.id,
      ...slideForm,
    };
    addSlide(selectedCourse.id, selectedLesson.id, newSlide);
    refreshCourses();
    setOpenSlideDialog(false);
  };

  const handleDeleteSlide = (courseId: string, lessonId: string, slideId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa slide này?')) {
      deleteSlide(courseId, lessonId, slideId);
      refreshCourses();
    }
  };

  // Video handlers
  const handleAddVideo = (course: Course, lesson: Lesson) => {
    setSelectedCourse(course);
    setSelectedLesson(lesson);
    setVideoForm({ title: '', url: '', duration: 0, order: (lesson.videos?.length || 0) + 1 });
    setOpenVideoDialog(true);
  };

  const handleSaveVideo = () => {
    if (!selectedCourse || !selectedLesson || !videoForm.title || !videoForm.url) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const newVideo: Video = {
      id: Date.now().toString(),
      lessonId: selectedLesson.id,
      ...videoForm,
    };
    addVideo(selectedCourse.id, selectedLesson.id, newVideo);
    refreshCourses();
    setOpenVideoDialog(false);
  };

  const handleDeleteVideo = (courseId: string, lessonId: string, videoId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa video này?')) {
      deleteVideo(courseId, lessonId, videoId);
      refreshCourses();
    }
  };

  // Reference handlers
  const handleAddReference = (course: Course, lesson: Lesson) => {
    setSelectedCourse(course);
    setSelectedLesson(lesson);
    setReferenceForm({ title: '', type: 'pdf', url: '' });
    setOpenReferenceDialog(true);
  };

  const handleSaveReference = () => {
    if (!selectedCourse || !selectedLesson || !referenceForm.title || !referenceForm.url) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    const newReference: Reference = {
      id: Date.now().toString(),
      lessonId: selectedLesson.id,
      ...referenceForm,
    };
    addReference(selectedCourse.id, selectedLesson.id, newReference);
    refreshCourses();
    setOpenReferenceDialog(false);
  };

  const handleDeleteReference = (courseId: string, lessonId: string, referenceId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) {
      deleteReference(courseId, lessonId, referenceId);
      refreshCourses();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Quản lý Nội dung Học tập</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddCourse}
        >
          Thêm Học phần
        </Button>
      </Box>

      {courses.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              Chưa có học phần nào. Hãy thêm học phần mới!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {courses.map((course) => (
            <Accordion key={course.id} defaultExpanded={courses.length === 1}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
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
                        handleDeleteCourse(course.id);
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

                {course.lessons.length === 0 ? (
                  <Alert severity="info">Chưa có bài học nào trong học phần này.</Alert>
                ) : (
                  <Box>
                    {course.lessons.map((lesson) => (
                      <Card key={lesson.id} sx={{ mb: 2 }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <MenuBookIcon sx={{ mr: 1, color: 'primary.main' }} />
                              <Box>
                                <Typography variant="h6">{lesson.title}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Thứ tự: {lesson.order}
                                </Typography>
                              </Box>
                            </Box>
                            <Box>
                              <IconButton
                                size="small"
                                onClick={() => handleEditLesson(course, lesson)}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteLesson(course.id, lesson.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>

                          <Divider sx={{ my: 2 }} />

                          {/* Slides */}
                          <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="subtitle1">
                                <SlideshowIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
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
                                  <ListItem key={slide.id}>
                                    <ListItemText
                                      primary={slide.title}
                                      secondary={`Thứ tự: ${slide.order}`}
                                    />
                                    <ListItemSecondaryAction>
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleDeleteSlide(course.id, lesson.id, slide.id)}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </ListItemSecondaryAction>
                                  </ListItem>
                                ))}
                              </List>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                                Chưa có slide nào
                              </Typography>
                            )}
                          </Box>

                          {/* Videos */}
                          <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="subtitle1">
                                <VideoLibraryIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
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
                                  <ListItem key={video.id}>
                                    <ListItemText
                                      primary={video.title}
                                      secondary={`URL: ${video.url} | Thời lượng: ${Math.floor(video.duration / 60)}:${video.duration % 60}`}
                                    />
                                    <ListItemSecondaryAction>
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleDeleteVideo(course.id, lesson.id, video.id)}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </ListItemSecondaryAction>
                                  </ListItem>
                                ))}
                              </List>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                                Chưa có video nào
                              </Typography>
                            )}
                          </Box>

                          {/* References */}
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Typography variant="subtitle1">
                                <DescriptionIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                                Tài liệu tham khảo ({lesson.references?.length || 0})
                              </Typography>
                              <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() => handleAddReference(course, lesson)}
                              >
                                Thêm Tài liệu
                              </Button>
                            </Box>
                            {lesson.references && lesson.references.length > 0 ? (
                              <List dense>
                                {lesson.references.map((ref) => (
                                  <ListItem key={ref.id}>
                                    <ListItemText
                                      primary={ref.title}
                                      secondary={
                                        <Box>
                                          <Chip label={ref.type.toUpperCase()} size="small" sx={{ mr: 1 }} />
                                          {ref.url}
                                        </Box>
                                      }
                                    />
                                    <ListItemSecondaryAction>
                                      <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleDeleteReference(course.id, lesson.id, ref.id)}
                                      >
                                        <DeleteIcon fontSize="small" />
                                      </IconButton>
                                    </ListItemSecondaryAction>
                                  </ListItem>
                                ))}
                              </List>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
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
          ))}
        </Box>
      )}

      {/* Course Dialog */}
      <Dialog open={openCourseDialog} onClose={() => setOpenCourseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedCourse ? 'Sửa Học phần' : 'Thêm Học phần'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tên học phần"
                value={courseForm.name}
                onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
                required
              />
            </Grid>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mã học phần"
                value={courseForm.code}
                onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
                required
              />
            </Grid>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Mô tả"
                value={courseForm.description}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCourseDialog(false)}>Hủy</Button>
          <Button onClick={handleSaveCourse} variant="contained">
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={openLessonDialog} onClose={() => setOpenLessonDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{selectedLesson ? 'Sửa Bài học' : 'Thêm Bài học'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tiêu đề bài học"
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                required
              />
            </Grid>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Thứ tự"
                type="number"
                value={lessonForm.order}
                onChange={(e) => setLessonForm({ ...lessonForm, order: parseInt(e.target.value) || 1 })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLessonDialog(false)}>Hủy</Button>
          <Button onClick={handleSaveLesson} variant="contained">
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Slide Dialog */}
      <Dialog open={openSlideDialog} onClose={() => setOpenSlideDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Thêm Slide</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tiêu đề slide"
                value={slideForm.title}
                onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })}
                required
              />
            </Grid>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="URL file PowerPoint (.pptx)"
                value={slideForm.fileUrl}
                onChange={(e) => setSlideForm({ ...slideForm, fileUrl: e.target.value })}
                placeholder="https://example.com/slides/lesson1.pptx hoặc đường dẫn file"
                required
                helperText="Nhập URL hoặc đường dẫn đến file PowerPoint"
              />
            </Grid>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Thứ tự"
                type="number"
                value={slideForm.order}
                onChange={(e) => setSlideForm({ ...slideForm, order: parseInt(e.target.value) || 1 })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSlideDialog(false)}>Hủy</Button>
          <Button onClick={handleSaveSlide} variant="contained">
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Video Dialog */}
      <Dialog open={openVideoDialog} onClose={() => setOpenVideoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Thêm Video</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tiêu đề video"
                value={videoForm.title}
                onChange={(e) => setVideoForm({ ...videoForm, title: e.target.value })}
                required
              />
            </Grid>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="URL video"
                value={videoForm.url}
                onChange={(e) => setVideoForm({ ...videoForm, url: e.target.value })}
                required
              />
            </Grid>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Thời lượng (giây)"
                type="number"
                value={videoForm.duration}
                onChange={(e) => setVideoForm({ ...videoForm, duration: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Thứ tự"
                type="number"
                value={videoForm.order}
                onChange={(e) => setVideoForm({ ...videoForm, order: parseInt(e.target.value) || 1 })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenVideoDialog(false)}>Hủy</Button>
          <Button onClick={handleSaveVideo} variant="contained">
            Lưu
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reference Dialog */}
      <Dialog open={openReferenceDialog} onClose={() => setOpenReferenceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Thêm Tài liệu tham khảo</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tiêu đề tài liệu"
                value={referenceForm.title}
                onChange={(e) => setReferenceForm({ ...referenceForm, title: e.target.value })}
                required
              />
            </Grid>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Loại tài liệu</InputLabel>
                <Select
                  value={referenceForm.type}
                  label="Loại tài liệu"
                  onChange={(e) => setReferenceForm({ ...referenceForm, type: e.target.value as 'pdf' | 'link' | 'document' })}
                >
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="link">Link</MenuItem>
                  <MenuItem value="document">Document</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="URL"
                value={referenceForm.url}
                onChange={(e) => setReferenceForm({ ...referenceForm, url: e.target.value })}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReferenceDialog(false)}>Hủy</Button>
          <Button onClick={handleSaveReference} variant="contained">
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

