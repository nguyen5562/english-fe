import { useState, useMemo, useEffect } from 'react';
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
import { getCourses, getCourse } from '../types old/storage';
import type { Course, Lesson } from '../types old';

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
  const courseId = searchParams.get('course');
  const [courses] = useState<Course[]>(() => getCourses());
  const initialCourse = useMemo(() => {
    const loadedCourses = getCourses();
    if (courseId) {
      const course = getCourse(courseId);
      return course || (loadedCourses.length > 0 ? loadedCourses[0] : null);
    }
    return loadedCourses.length > 0 ? loadedCourses[0] : null;
  }, [courseId]);
  
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(initialCourse);
  const [tabValue, setTabValue] = useState(0);
  
  // Update when courseId changes - this is necessary for URL parameter changes
  useEffect(() => {
    if (courseId) {
      const course = getCourse(courseId);
      if (course) {
        setSelectedCourse(course);
      }
    } else if (courses.length > 0 && !selectedCourse) {
      setSelectedCourse(courses[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const renderLessonContent = (lesson: Lesson) => (
    <Accordion key={lesson.id}>
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
                <Card key={slide.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <SlideshowIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">{slide.title}</Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      href={slide.fileUrl}
                      target="_blank"
                      sx={{ mt: 1 }}
                    >
                      Tải PowerPoint
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
                <Card key={video.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <VideoLibraryIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6">{video.title}</Typography>
                      <Chip label={`${Math.floor(video.duration / 60)}:${video.duration % 60}`} size="small" sx={{ ml: 2 }} />
                    </Box>
                    <Button
                      variant="outlined"
                      startIcon={<PlayArrowIcon />}
                      href={video.url}
                      target="_blank"
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
              {lesson.references.map((ref) => (
                <Card key={ref.id} sx={{ mb: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      {ref.type === 'pdf' ? (
                        <PdfIcon sx={{ mr: 1, color: 'error.main' }} />
                      ) : (
                        <LinkIcon sx={{ mr: 1, color: 'primary.main' }} />
                      )}
                      <Typography variant="h6">{ref.title}</Typography>
                      <Chip label={ref.type.toUpperCase()} size="small" sx={{ ml: 2 }} />
                    </Box>
                    <Button
                      variant="outlined"
                      href={ref.url}
                      target="_blank"
                      sx={{ mt: 1 }}
                    >
                      Mở tài liệu
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </List>
          ) : (
            <Typography color="text.secondary">Chưa có tài liệu tham khảo cho bài học này</Typography>
          )}
        </TabPanel>
      </AccordionDetails>
    </Accordion>
  );

  if (!selectedCourse) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Tài liệu học tập
        </Typography>
        <Typography color="text.secondary">Đang tải...</Typography>
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
                key={course.id}
                label={course.name}
                onClick={() => setSelectedCourse(course)}
                color={selectedCourse.id === course.id ? 'primary' : 'default'}
                sx={{ mr: 1 }}
              />
            ))}
          </Box>
        )}
      </Box>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Danh sách bài học
      </Typography>
      {selectedCourse.lessons.map((lesson) => renderLessonContent(lesson))}
    </Box>
  );
}

