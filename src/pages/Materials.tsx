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
  // PictureAsPdf as PdfIcon,
  // Link as LinkIcon,
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

const getYoutubeId = (url: string) => {
  if (!url) return null;
  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

const ThumbnailPreview = ({
  url,
  type,
}: {
  url: string;
  type: 'slide' | 'video' | 'ref';
}) => {
  const ytId = getYoutubeId(url);
  const resolvedUrl = resolveUrl(url) ?? '';
  const ext = url.split('.').pop()?.toLowerCase() || '';

  if (ytId) {
    return (
      <Box
        component="img"
        src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
        onError={(e: any) => {
          e.target.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        }}
        sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        alt="youtube-thumbnail"
      />
    );
  }

  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext) || type === 'video') {
    return (
      <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
        <Box
          component="video"
          src={`${resolvedUrl}#t=0.5`}
          preload="metadata"
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <Box
          className="thumbnail-overlay"
          sx={{
            position: 'absolute',
            inset: 0,
            bgcolor: 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s',
          }}
        >
          <PlayArrowIcon
            className="thumbnail-icon"
            sx={{
              fontSize: 40,
              color: '#fff',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </Box>
      </Box>
    );
  }

  if (['pdf'].includes(ext)) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
          bgcolor: '#fff',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -24,
            left: -40,
            width: 'calc(100% + 80px)',
            height: 'calc(100% + 40px)',
            pointerEvents: 'none',
          }}
        >
          <iframe
            src={`${resolvedUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#fff',
            }}
            scrolling="no"
          />
        </Box>
        <Box
          className="thumbnail-overlay"
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            transition: 'background-color 0.2s',
          }}
        />
      </Box>
    );
  }

  if (['doc', 'docx', 'ppt', 'pptx'].includes(ext)) {
    const encodedUrl = encodeURIComponent(resolvedUrl);
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
    return (
      <Box
        sx={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          position: 'relative',
          bgcolor: '#fff',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: -30,
            left: -20,
            width: 'calc(100% + 40px)',
            height: 'calc(100% + 40px)',
            pointerEvents: 'none',
          }}
        >
          <iframe
            src={viewerUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#fff',
            }}
            scrolling="no"
          />
        </Box>
        <Box
          className="thumbnail-overlay"
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            transition: 'background-color 0.2s',
          }}
        />
      </Box>
    );
  }

  let Icon = DescriptionIcon;
  let color = '#00796b';
  let bgColor = '#e0f2f1';

  if (type === 'slide') {
    Icon = SlideshowIcon;
    color = '#1976d2';
    bgColor = '#e3f2fd';
  }

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: bgColor,
      }}
    >
      <Icon
        className="thumbnail-icon"
        sx={{
          fontSize: 64,
          color,
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
      <Box
        className="thumbnail-overlay"
        sx={{
          position: 'absolute',
          inset: 0,
          transition: 'background-color 0.2s',
        }}
      />
    </Box>
  );
};

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
            'Failed to load course list';
          toast.error(String(msg));
        } else {
          toast.error('Failed to load course list');
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
              'Failed to load lesson';
            toast.error(String(msg));
          } else {
            toast.error('Failed to load lesson');
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
                label="References"
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
                    <Grid size={{ xs: 12, md: 6 }} key={slide._id}>
                      <Card
                        variant="outlined"
                        sx={{
                          display: 'flex',
                          borderRadius: 3,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out',
                          borderColor: 'divider',
                          '&:hover': {
                            boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
                            borderColor: 'primary.main',
                            transform: 'translateY(-2px)',
                            '& .thumbnail-icon': {
                              transform: 'scale(1.15)',
                            },
                          },
                        }}
                        onClick={() =>
                          window.open(resolveUrl(slide.url) ?? '', '_blank')
                        }
                      >
                        <Box
                          sx={{
                            width: 220,
                            minHeight: 125,
                            flexShrink: 0,
                            bgcolor: '#e3f2fd',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRight: '1px solid',
                            borderColor: 'divider',
                            overflow: 'hidden',
                            position: 'relative',
                          }}
                        >
                          <ThumbnailPreview url={slide.url} type="slide" />
                        </Box>
                        <CardContent
                          sx={{
                            p: 1.5,
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            '&:last-child': { pb: 1.5 },
                          }}
                        >
                          <Typography
                            variant="subtitle1"
                            sx={{
                              fontWeight: 600,
                              mb: 0.5,
                              lineHeight: 1.2,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {slide.title}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 1 }}
                          >
                            Slide
                          </Typography>
                          <Box
                            sx={{
                              mt: 'auto',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Button
                              size="small"
                              variant="outlined"
                              sx={{
                                borderRadius: 1.5,
                                textTransform: 'none',
                                py: 0.25,
                                px: 1.5,
                                fontWeight: 500,
                              }}
                            >
                              Open slide
                            </Button>
                          </Box>
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
                  No slides
                </Typography>
              )}
            </TabPanel>

            <TabPanel value={currentTab} index={1}>
              {lesson.videos && lesson.videos.length > 0 ? (
                <Grid container spacing={2}>
                  {lesson.videos.map((video) => {
                    // const ytId = getYoutubeId(video.url);
                    const resolvedUrl = resolveUrl(video.url) ?? '';
                    return (
                      <Grid size={{ xs: 12, md: 6 }} key={video._id}>
                        <Card
                          variant="outlined"
                          sx={{
                            display: 'flex',
                            borderRadius: 3,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out',
                            borderColor: 'divider',
                            '&:hover': {
                              boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
                              borderColor: 'error.main',
                              transform: 'translateY(-2px)',
                              '& .thumbnail-overlay': {
                                bgcolor: 'rgba(0,0,0,0.1)',
                              },
                              '& .play-icon': {
                                transform: 'scale(1.15)',
                              },
                            },
                          }}
                          onClick={() => window.open(resolvedUrl, '_blank')}
                        >
                          <Box
                            sx={{
                              width: 220,
                              minHeight: 125,
                              flexShrink: 0,
                              bgcolor: '#000',
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRight: '1px solid',
                              borderColor: 'divider',
                              overflow: 'hidden',
                            }}
                          >
                            <ThumbnailPreview url={video.url} type="video" />
                          </Box>
                          <CardContent
                            sx={{
                              p: 1.5,
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              '&:last-child': { pb: 1.5 },
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 600,
                                mb: 0.5,
                                lineHeight: 1.2,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {video.title}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 1 }}
                            >
                              Video
                            </Typography>
                            <Box
                              sx={{
                                mt: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                startIcon={
                                  <PlayArrowIcon sx={{ fontSize: 16 }} />
                                }
                                sx={{
                                  borderRadius: 1.5,
                                  textTransform: 'none',
                                  py: 0.25,
                                  px: 1.5,
                                  fontWeight: 500,
                                }}
                              >
                                Play video
                              </Button>
                            </Box>
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
                  No video
                </Typography>
              )}
            </TabPanel>

            <TabPanel value={currentTab} index={2}>
              {lesson.references && lesson.references.length > 0 ? (
                <Grid container spacing={2}>
                  {lesson.references.map((ref) => {
                    const isPdf = /\.pdf$/i.test(ref.url);
                    const resolvedUrl = resolveUrl(ref.url) ?? '';
                    return (
                      <Grid size={{ xs: 12, md: 6 }} key={ref._id}>
                        <Card
                          variant="outlined"
                          sx={{
                            display: 'flex',
                            borderRadius: 3,
                            overflow: 'hidden',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease-in-out',
                            borderColor: 'divider',
                            position: 'relative',
                            '&:hover': {
                              boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
                              borderColor: isPdf
                                ? 'error.main'
                                : 'primary.main',
                              transform: 'translateY(-2px)',
                              '& .thumbnail-icon': {
                                transform: 'scale(1.15)',
                              },
                              '& .pdf-overlay': {
                                bgcolor: 'rgba(0,0,0,0)',
                              },
                            },
                          }}
                          onClick={() => window.open(resolvedUrl, '_blank')}
                        >
                          <Box
                            sx={{
                              width: 220,
                              minHeight: 125,
                              flexShrink: 0,
                              bgcolor: isPdf ? '#f5f5f5' : '#e0f2f1',
                              position: 'relative',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRight: '1px solid',
                              borderColor: 'divider',
                              overflow: 'hidden',
                            }}
                          >
                            <ThumbnailPreview url={ref.url} type="ref" />
                          </Box>
                          <CardContent
                            sx={{
                              p: 1.5,
                              flex: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              '&:last-child': { pb: 1.5 },
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{
                                fontWeight: 600,
                                mb: 0.5,
                                lineHeight: 1.2,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {ref.title}
                            </Typography>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 1 }}
                            >
                              {isPdf ? 'PDF' : 'Document'}
                            </Typography>
                            <Box
                              sx={{
                                mt: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <Button
                                size="small"
                                color={isPdf ? 'error' : 'primary'}
                                variant="outlined"
                                sx={{
                                  borderRadius: 1.5,
                                  textTransform: 'none',
                                  py: 0.25,
                                  px: 1.5,
                                  fontWeight: 500,
                                }}
                              >
                                {isPdf ? 'Open PDF' : 'Open document'}
                              </Button>
                            </Box>
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
                  No references
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
            Courses
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Search courses..."
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
            No courses found.
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
                      View lesson{' '}
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
          Lessons
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {lessons.length} lessons available
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
            No lessons available for this course.
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
