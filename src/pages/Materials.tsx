import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button,
  CircularProgress,
  Grid,
  TextField,
  InputAdornment,
  Divider,
  Paper,
  IconButton,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Slideshow as SlideshowIcon,
  VideoLibrary as VideoLibraryIcon,
  Description as DescriptionIcon,
  PlayArrow as PlayArrowIcon,
  PictureAsPdf as PdfIcon,
  Link as LinkIcon,
  Search as SearchIcon,
  School as CourseIcon,
  MenuBook as LessonIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { courseService } from '../services/course.service';
import { lessonService } from '../services/lesson.service';
import { toast } from '../utils/toast';
import type { Course, Lesson } from '../types';
import { resolveUrl } from '../utils/questionHelpers';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

export default function Materials() {
  const [searchParams, setSearchParams] = useSearchParams();
  const courseIdFromUrl = searchParams.get('course');
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [tabValues, setTabValues] = useState<{ [key: string]: number }>({});
  const [searchQuery, setSearchQuery] = useState('');

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
        courseService
          .getCourseById(courseIdFromUrl)
          .then((course) => {
            setSelectedCourse(course);
          })
          .catch(() => {
            setSelectedCourse(null);
          });
      }
    } else {
      setSelectedCourse(null);
    }
  }, [courseIdFromUrl, courses]);

  useEffect(() => {
    if (!selectedCourse?._id) {
      setLessons([]);
      return;
    }
    let cancelled = false;
    setLoadingLessons(true);
    lessonService
      .getLessonByCourseId(selectedCourse._id)
      .then((data) => {
        if (!cancelled) {
          setLessons(data);
        }
      })
      .catch((e: unknown) => {
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
      })
      .finally(() => {
        if (!cancelled) setLoadingLessons(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCourse?._id]);

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setSearchParams({ course: course._id });
  };

  const handleBackToCourses = () => {
    setSelectedCourse(null);
    setSearchParams({});
  };

  const handleTabChange = (lessonId: string, newValue: number) => {
    setTabValues((prev) => ({ ...prev, [lessonId]: newValue }));
  };

  const filteredCourses = useMemo(() => {
    return courses.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [courses, searchQuery]);

  const renderLessonContent = (lesson: Lesson) => {
    const currentTab = tabValues[lesson._id] || 0;
    return (
      <Accordion
        key={lesson._id}
        sx={{
          mb: 2,
          borderRadius: '12px !important',
          boxShadow: 'none',
          border: '1px solid',
          borderColor: 'divider',
          '&:before': { display: 'none' },
          overflow: 'hidden',
          '&:hover': { borderColor: 'primary.light' },
          transition: 'border-color 0.2s',
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            py: 1,
            px: 2,
            bgcolor: 'background.paper',
            '&.Mui-expanded': {
              borderBottom: '1px solid',
              borderColor: 'divider',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LessonIcon sx={{ mr: 2, color: 'primary.main', opacity: 0.7 }} />
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 500, fontSize: '1.1rem' }}
            >
              {lesson.title}
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <Box sx={{ px: 2, pt: 1 }}>
            <Tabs
              value={currentTab}
              onChange={(_, val) => handleTabChange(lesson._id, val)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                minHeight: 44,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '1rem',
                  minHeight: 44,
                },
              }}
            >
              <Tab
                label="Slides"
                icon={<SlideshowIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
              <Tab
                label="Videos"
                icon={<VideoLibraryIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
              <Tab
                label="Tài liệu"
                icon={<DescriptionIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          <Box sx={{ p: 2 }}>
            <TabPanel value={currentTab} index={0}>
              {lesson.slides && lesson.slides.length > 0 ? (
                <Grid container spacing={2}>
                  {lesson.slides.map((slide) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={slide._id}>
                      <Card
                        variant="outlined"
                        sx={{ borderRadius: 2, borderStyle: 'dashed' }}
                      >
                        <CardContent sx={{ p: '12px !important' }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              mb: 1,
                            }}
                          >
                            <SlideshowIcon
                              sx={{
                                mr: 1,
                                color: 'primary.main',
                                fontSize: 18,
                              }}
                            />
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: 400 }}
                              noWrap
                            >
                              {slide.title}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="text"
                            href={resolveUrl(slide.url) ?? ''}
                            target="_blank"
                            sx={{
                              borderRadius: 1.5,
                              textTransform: 'none',
                              py: 0,
                            }}
                          >
                            Mở slide
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography
                  color="text.secondary"
                  variant="body1"
                  align="center"
                  sx={{ py: 2 }}
                >
                  Chưa có slides
                </Typography>
              )}
            </TabPanel>

            <TabPanel value={currentTab} index={1}>
              {lesson.videos && lesson.videos.length > 0 ? (
                <Grid container spacing={2}>
                  {lesson.videos.map((video) => (
                    <Grid size={{ xs: 12, sm: 6 }} key={video._id}>
                      <Card
                        variant="outlined"
                        sx={{ borderRadius: 2, borderStyle: 'dashed' }}
                      >
                        <CardContent sx={{ p: '12px !important' }}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              mb: 1,
                            }}
                          >
                            <VideoLibraryIcon
                              sx={{
                                mr: 1,
                                color: 'primary.main',
                                fontSize: 18,
                              }}
                            />
                            <Typography
                              variant="body1"
                              sx={{ fontWeight: 400 }}
                              noWrap
                            >
                              {video.title}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            variant="text"
                            startIcon={<PlayArrowIcon sx={{ fontSize: 16 }} />}
                            href={resolveUrl(video.url) ?? ''}
                            target="_blank"
                            sx={{
                              borderRadius: 1.5,
                              textTransform: 'none',
                              py: 0,
                            }}
                          >
                            Phát video
                          </Button>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography
                  color="text.secondary"
                  variant="body1"
                  align="center"
                  sx={{ py: 2 }}
                >
                  Chưa có video
                </Typography>
              )}
            </TabPanel>

            <TabPanel value={currentTab} index={2}>
              {lesson.references && lesson.references.length > 0 ? (
                <Grid container spacing={2}>
                  {lesson.references.map((ref) => {
                    const isPdf = /\.pdf$/i.test(ref.url);
                    return (
                      <Grid size={{ xs: 12, sm: 6 }} key={ref._id}>
                        <Card
                          variant="outlined"
                          sx={{ borderRadius: 2, borderStyle: 'dashed' }}
                        >
                          <CardContent sx={{ p: '12px !important' }}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                mb: 1,
                              }}
                            >
                              {isPdf ? (
                                <PdfIcon
                                  sx={{
                                    mr: 1,
                                    color: 'error.main',
                                    fontSize: 18,
                                  }}
                                />
                              ) : (
                                <LinkIcon
                                  sx={{
                                    mr: 1,
                                    color: 'primary.main',
                                    fontSize: 18,
                                  }}
                                />
                              )}
                              <Typography
                                variant="body1"
                                sx={{ fontWeight: 400 }}
                                noWrap
                              >
                                {ref.title}
                              </Typography>
                            </Box>
                            <Button
                              size="small"
                              variant="text"
                              href={resolveUrl(ref.url) ?? ''}
                              target="_blank"
                              sx={{
                                borderRadius: 1.5,
                                textTransform: 'none',
                                py: 0,
                              }}
                            >
                              Xem tài liệu
                            </Button>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              ) : (
                <Typography
                  color="text.secondary"
                  variant="body1"
                  align="center"
                  sx={{ py: 2 }}
                >
                  Chưa có tài liệu tham khảo
                </Typography>
              )}
            </TabPanel>
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  };

  const renderCourses = () => (
    <Box>
      <Box
        sx={{
          mb: 4,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 500, color: 'text.primary', mb: 1 }}
          >
            Khóa học
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Tìm khóa học..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            width: { xs: '100%', sm: 300 },
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: 'background.paper',
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {loadingCourses ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      ) : filteredCourses.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 4,
            bgcolor: 'grey.50',
          }}
          elevation={0}
        >
          <CourseIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
          <Typography color="text.secondary">
            Không tìm thấy khóa học nào phù hợp.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredCourses.map((course) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={course._id}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 4,
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.05)',
                    borderColor: 'primary.main',
                  },
                }}
                onClick={() => handleCourseSelect(course)}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box
                    sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}
                  >
                    <Box
                      sx={{
                        p: 1.5,
                        borderRadius: 3,
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                        mr: 2,
                        display: 'flex',
                        opacity: 0.8,
                      }}
                    >
                      <CourseIcon sx={{ fontSize: 24 }} />
                    </Box>
                    <Box>
                      <Typography
                        variant="h6"
                        sx={{ fontWeight: 500, lineHeight: 1.2, mb: 0.5 }}
                      >
                        {course.name}
                      </Typography>
                      <Chip
                        label={course.code}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          bgcolor: 'grey.100',
                          border: 'none',
                        }}
                      />
                    </Box>
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: 1.6,
                      mb: 2,
                      minHeight: '3rem',
                    }}
                  >
                    {course.description}
                  </Typography>
                  <Divider sx={{ mb: 2, opacity: 0.6 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 500,
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      Xem bài học{' '}
                      <ArrowBackIcon
                        sx={{
                          fontSize: 14,
                          ml: 0.5,
                          transform: 'rotate(180deg)',
                        }}
                      />
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  const renderLessons = () => (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
        <IconButton
          onClick={handleBackToCourses}
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': { bgcolor: 'grey.50' },
          }}
        >
          <ArrowBackIcon fontSize="small" />
        </IconButton>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1.5 }}>
            <Typography
              variant="h4"
              sx={{ fontWeight: 500, color: 'text.primary' }}
            >
              {selectedCourse?.name}
            </Typography>
            <Chip
              label={selectedCourse?.code}
              variant="outlined"
              size="small"
              sx={{ fontWeight: 500, borderRadius: 1.5 }}
            />
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 800 }}
          >
            {selectedCourse?.description}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ mb: 4 }} />

      <Box
        sx={{
          mb: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 500 }}>
          Danh sách bài học
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {lessons.length} bài học hiện có
        </Typography>
      </Box>

      {loadingLessons ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : lessons.length === 0 ? (
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 4,
            bgcolor: 'grey.50',
          }}
          elevation={0}
        >
          <LessonIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Chưa có bài học nào được đăng tải cho khóa học này.
          </Typography>
        </Paper>
      ) : (
        <Box sx={{ width: '100%' }}>
          {lessons.map((lesson) => renderLessonContent(lesson))}
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', py: 2 }}>
      {selectedCourse ? renderLessons() : renderCourses()}
    </Box>
  );
}
