import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
} from '@mui/material';
import {
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  People as PeopleIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { getCourses, getExercises, getQuizzes, getUser } from '../../types old/storage';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = getUser();
  
  const courses = useMemo(() => getCourses(), []);
  const exercises = useMemo(() => getExercises(), []);
  const quizzes = useMemo(() => getQuizzes(), []);

  const stats = [
    {
      title: 'Học phần',
      count: courses.length,
      icon: <SchoolIcon sx={{ fontSize: 40 }} />,
      color: 'primary.main',
      path: '/admin/content',
    },
    {
      title: 'Bài tập',
      count: exercises.length,
      icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
      color: 'info.main',
      path: '/admin/exercises',
    },
    {
      title: 'Quiz',
      count: quizzes.length,
      icon: <QuizIcon sx={{ fontSize: 40 }} />,
      color: 'warning.main',
      path: '/admin/quizzes',
    },
    {
      title: 'Sinh viên',
      count: 0, // TODO: Get from storage
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      color: 'success.main',
      path: '/admin/students',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Chào mừng, {user?.name}!
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Trang quản trị hệ thống học tiếng Anh
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {stats.map((stat) => (
          // @ts-expect-error - MUI v7 Grid still works with item prop
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            <Card sx={{ height: '100%', bgcolor: stat.color, color: 'white' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {stat.icon}
                  <Box sx={{ ml: 2, flexGrow: 1 }}>
                    <Typography variant="h4">{stat.count}</Typography>
                    <Typography variant="body2">{stat.title}</Typography>
                  </Box>
                </Box>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  sx={{ color: 'white', borderColor: 'white' }}
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate(stat.path)}
                >
                  Quản lý
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}

        {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BarChartIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h6">Thống kê & Báo cáo</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Xem thống kê chi tiết về hệ thống
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="contained"
                fullWidth
                onClick={() => navigate('/admin/statistics')}
              >
                Xem thống kê
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SettingsIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h6">Cài đặt hệ thống</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cấu hình và quản lý hệ thống
                  </Typography>
                </Box>
              </Box>
              <Button
                variant="outlined"
                fullWidth
                disabled
              >
                Sắp có
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

