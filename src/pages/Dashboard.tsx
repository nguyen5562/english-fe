import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  LinearProgress,
} from '@mui/material';
import {
  MenuBook as MenuBookIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { getCourses, getAllStudentProgress, getUser } from '../services/storage';

export default function Dashboard() {
  const courses = useMemo(() => getCourses(), []);
  const user = getUser();
  const progress = useMemo(() => {
    if (user?.role === 'student' && user.id) {
      return getAllStudentProgress(user.id);
    }
    return [];
  }, [user]);
  const navigate = useNavigate();

  const getCourseProgress = (courseId: string): number => {
    const courseProgress = progress.find(p => p.courseId === courseId);
    if (!courseProgress) return 0;
    const course = courses.find(c => c.id === courseId);
    if (!course) return 0;
    return (courseProgress.completedLessons.length / course.lessons.length) * 100;
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Chào mừng, {user?.name}!
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        {user?.role === 'teacher'
          ? 'Quản lý và theo dõi tình hình học tập của sinh viên'
          : 'Bắt đầu hành trình học tiếng Anh của bạn'}
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {courses.map((course) => {
          const progressPercent = getCourseProgress(course.id);
          return (
            // @ts-expect-error - MUI v7 Grid still works with item prop
            <Grid item xs={12} md={6} key={course.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <MenuBookIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                    <Box>
                      <Typography variant="h5">{course.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {course.code}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" paragraph>
                    {course.description}
                  </Typography>
                  {user?.role === 'student' && (
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">Tiến độ</Typography>
                        <Typography variant="body2">{Math.round(progressPercent)}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={progressPercent} />
                    </Box>
                  )}
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate(`/materials?course=${course.id}`)}
                  >
                    Xem chi tiết
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', bgcolor: 'primary.main', color: 'white' }}>
            <CardContent>
              <AssignmentIcon sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Bài tập
              </Typography>
              <Typography variant="body2" paragraph>
                Luyện tập với các bài tập tương tác
              </Typography>
              <Button
                variant="contained"
                sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: 'grey.100' } }}
                fullWidth
                onClick={() => navigate('/exercises')}
              >
                Làm bài tập
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', bgcolor: 'secondary.main', color: 'white' }}>
            <CardContent>
              <QuizIcon sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Quiz & Kiểm tra
              </Typography>
              <Typography variant="body2" paragraph>
                Làm bài kiểm tra và đánh giá kiến thức
              </Typography>
              <Button
                variant="contained"
                sx={{ bgcolor: 'white', color: 'secondary.main', '&:hover': { bgcolor: 'grey.100' } }}
                fullWidth
                onClick={() => navigate('/quizzes')}
              >
                Làm quiz
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {user?.role === 'student' && (
          // @ts-expect-error - MUI v7 Grid still works with item prop
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', bgcolor: 'success.main', color: 'white' }}>
              <CardContent>
                <AssessmentIcon sx={{ fontSize: 48, mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Tiến độ học tập
                </Typography>
                <Typography variant="body2" paragraph>
                  Theo dõi kết quả và sự tiến bộ của bạn
                </Typography>
                <Button
                  variant="contained"
                  sx={{ bgcolor: 'white', color: 'success.main', '&:hover': { bgcolor: 'grey.100' } }}
                  fullWidth
                  onClick={() => navigate('/progress')}
                >
                  Xem tiến độ
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

