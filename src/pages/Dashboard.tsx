import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
} from '@mui/material';
import {
  MenuBook as MenuBookIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import { courseService } from '../services/course.service';
import { toast } from '../utils/toast';
import type { Course } from '../types';

export default function Dashboard() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  useEffect(() => {
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
            'Không thể tải danh sách khóa học';
          toast.error(String(msg));
        } else {
          toast.error('Không thể tải danh sách khóa học');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Chào mừng, {user?.username ?? 'bạn'}!
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        {user?.role === 'teacher'
          ? 'Quản lý và theo dõi tình hình học tập của sinh viên'
          : 'Bắt đầu hành trình học tiếng Anh của bạn'}
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {/* Courses Section */}
          <Typography
            variant="h5"
            sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}
          >
            Khóa học của bạn
          </Typography>
          {courses.length === 0 ? (
            <Card
              sx={{
                mb: 4,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography color="text.secondary" align="center">
                  Chưa có khóa học nào
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={3} sx={{ mb: 5 }}>
              {courses.map((course) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={course._id}>
                  <Card
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 3,
                      overflow: 'hidden',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.05)',
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', mb: 2 }}
                      >
                        <MenuBookIcon
                          sx={{ fontSize: 32, color: 'primary.main', mr: 2 }}
                        />
                        <Box>
                          <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 600 }}
                          >
                            {course.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontWeight: 500 }}
                          >
                            {course.code}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 3,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          height: '2.8rem',
                          lineHeight: 1.6,
                        }}
                      >
                        {course.description}
                      </Typography>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() =>
                          navigate(`/materials?course=${course._id}`)
                        }
                        sx={{
                          borderRadius: 2,
                          textTransform: 'none',
                          fontWeight: 600,
                          boxShadow: 'none',
                        }}
                      >
                        Xem chi tiết
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Quick Actions Section */}
          <Typography
            variant="h5"
            sx={{ fontWeight: 600, mb: 2, color: 'text.primary' }}
          >
            Luyện tập & Kiểm tra
          </Typography>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.05)',
                    borderColor: 'primary.main',
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AssignmentIcon
                      sx={{ fontSize: 40, color: 'primary.main', mr: 2 }}
                    />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Bài tập
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3, lineHeight: 1.6 }}
                  >
                    Luyện tập với các bài tập tương tác hàng ngày để cải thiện
                    kỹ năng ngôn ngữ của bạn một cách nhanh chóng.
                  </Typography>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => navigate('/exercises')}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      py: 1,
                    }}
                  >
                    Làm bài tập ngay
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 24px rgba(0,0,0,0.05)',
                    borderColor: 'secondary.main',
                  },
                }}
              >
                <CardContent sx={{ p: 4 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <QuizIcon
                      sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }}
                    />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Quiz
                    </Typography>
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 3, lineHeight: 1.6 }}
                  >
                    Thực hiện các bài kiểm tra đánh giá kiến thức sau mỗi chương
                    học để theo dõi sự tiến bộ của bản thân.
                  </Typography>
                  <Button
                    variant="outlined"
                    color="secondary"
                    fullWidth
                    onClick={() => navigate('/quizzes')}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      fontWeight: 600,
                      py: 1,
                    }}
                  >
                    Bắt đầu Quiz
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}
    </Box>
  );
}
