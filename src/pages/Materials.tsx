import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  List,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Slideshow as SlideshowIcon,
  VideoLibrary as VideoLibraryIcon,
  Description as DescriptionIcon,
  PlayArrow as PlayArrowIcon,
  PictureAsPdf as PdfIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { courseService } from '../services/course.service';
import { lessonService } from '../services/lesson.service';
import { toast } from '../utils/toast';
import type { Course, Lesson } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function Materials() {
  const [searchParams] = useSearchParams();
  const courseIdFromUrl = searchParams.get('course');
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        const data = await courseService.getAllCourse();
        setCourses(data);
      } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
          const msg =
            (e.response?.data as { message?: string })?.message ??
            e.response?.statusText ??
            'Không thể tải danh sách khóa học';
          toast.error(String(msg));
        } else {
          toast.error('Không thể tải danh sách khóa học');
        }
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    if (courses.length === 0) return;
    if (courseIdFromUrl) {
      const found = courses.find((c) => c._id === courseIdFromUrl);
      if (found) {
        setSelectedCourse(found);
      } else {
        courseService.getCourseById(courseIdFromUrl).then((course) => {
          setSelectedCourse(course);
        }).catch(() => {
          setSelectedCourse(courses[0]);
        });
      }
    } else {
      setSelectedCourse((prev) => prev ?? courses[0]);
    }
  }, [courseIdFromUrl, courses]);

  useEffect(() => {
    if (!selectedCourse?._id) {
      setLessons([]);
      return;
    }
    let cancelled = false;
    setLoadingLessons(true);
    lessonService.getLessonByCourseId(selectedCourse._id).then((data) => {
      if (!cancelled) {
        setLessons(data);
      }
    }).catch((e: unknown) => {
      if (!cancelled) {
        if (axios.isAxiosError(e)) {
          const msg =
            (e.response?.data as { message?: string })?.message ??
            e.response?.statusText ??
            'Không thể tải bài học';
          toast.error(String(msg));
        } else {
          toast.error('Không thể tải bài học');
        }
        setLessons([]);
      }
    }).finally(() => {
      if (!cancelled) setLoadingLessons(false);
    });
    return () => { cancelled = true; };
  }, [selectedCourse?._id]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const renderLessonContent = (lesson: Lesson) => (
    <Accordion key={lesson._id}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h6">{lesson.title}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Slides" icon={<SlideshowIcon />} iconPosition="start" />
          <Tab label="Videos" icon={<VideoLibraryIcon />} iconPosition="start" />
          <Tab label="Tài liệu tham khảo" icon={<DescriptionIcon />} iconPosition="start" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          {lesson.slides && lesson.slides.length > 0 ? (
            <List>
              {lesson.slides.map((slide) => (
                <Card key={slide._id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <SlideshowIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">{slide.title}</Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      href={slide.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ mt: 1 }}
                    >
                      Xem slide
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">Chưa có slides cho bài học này</Typography>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {lesson.videos && lesson.videos.length > 0 ? (
            <List>
              {lesson.videos.map((video) => (
                <Card key={video._id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <VideoLibraryIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">{video.title}</Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      startIcon={<PlayArrowIcon />}
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ mt: 1 }}
                    >
                      Xem video
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">Chưa có video cho bài học này</Typography>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          {lesson.references && lesson.references.length > 0 ? (
            <List>
              {lesson.references.map((ref) => {
                const isPdf = /\.pdf$/i.test(ref.url);
                return (
                  <Card key={ref._id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        {isPdf ? (
                          <PdfIcon sx={{ mr: 1, color: 'error.main' }} />
                        ) : (
                          <LinkIcon sx={{ mr: 1, color: 'primary.main' }} />
                        )}
                        <Typography variant="h6">{ref.title}</Typography>
                        {isPdf && <Chip label="PDF" size="small" sx={{ ml: 2 }} />}
                      </Box>
                      <Button
                        variant="outlined"
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ mt: 1 }}
                      >
                        Mở tài liệu
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </List>
          ) : (
            <Typography color="text.secondary">Chưa có tài liệu tham khảo cho bài học này</Typography>
          )}
        </TabPanel>
      </AccordionDetails>
    </Accordion>
  );

  if (loadingCourses || (!selectedCourse && courses.length === 0)) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Tài liệu học tập
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (!selectedCourse) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Tài liệu học tập
        </Typography>
        <Typography color="text.secondary">Chưa có khóa học nào.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {selectedCourse.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {selectedCourse.code} - {selectedCourse.description}
          </Typography>
        </Box>
        {courses.length > 1 && (
          <Box>
            {courses.map((course) => (
              <Chip
                key={course._id}
                label={course.name}
                onClick={() => setSelectedCourse(course)}
                color={selectedCourse._id === course._id ? 'primary' : 'default'}
                sx={{ mr: 1 }}
              />
            ))}
          </Box>
        )}
      </Box>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Danh sách bài học
      </Typography>
      {loadingLessons ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress />
        </Box>
      ) : lessons.length === 0 ? (
        <Typography color="text.secondary">Chưa có bài học nào trong khóa này.</Typography>
      ) : (
        lessons.map((lesson) => renderLessonContent(lesson))
      )}
    </Box>
  );
}

