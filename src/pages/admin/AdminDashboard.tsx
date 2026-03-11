import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  People as PeopleIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
  FolderOpen as FolderOpenIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuthStore } from '../../store/auth.store';
import { courseService } from '../../services/course.service';
import { exerciseService } from '../../services/exercise.service';
import { quizService } from '../../services/quiz.service';
import { userService } from '../../services/user.service';
import { toast } from '../../utils/toast';

type AdminStats = {
  courses: number;
  exercises: number;
  quizzes: number;
  users: number;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<AdminStats>({
    courses: 0,
    exercises: 0,
    quizzes: 0,
    users: 0,
  });
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<Window | null>(null);

  const openFileManager = () => {
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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [courses, exercises, quizzes, users] = await Promise.all([
          courseService.getAllCourse(),
          exerciseService.getAllExercise(),
          quizService.getAllQuiz(),
          userService.getAllUser(),
        ]);

        setStats({
          courses: courses.length,
          exercises: exercises.length,
          quizzes: quizzes.length,
          users: users.length,
        });
      } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
          const msg =
            (e.response?.data as { message?: string })?.message ??
            e.response?.statusText ??
            'Failed to load statistics';
          toast.error(String(msg));
        } else {
          toast.error('Failed to load statistics');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    {
      title: 'Courses',
      count: stats.courses,
      icon: <SchoolIcon sx={{ fontSize: 40 }} />,
      color: 'primary.main',
      path: '/admin/content',
    },
    {
      title: 'Exercises',
      count: stats.exercises,
      icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
      color: 'info.main',
      path: '/admin/exercises',
    },
    {
      title: 'Quizzes',
      count: stats.quizzes,
      icon: <QuizIcon sx={{ fontSize: 40 }} />,
      color: 'warning.main',
      path: '/admin/quizzes',
    },
    {
      title: 'Users',
      count: stats.users,
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      color: 'success.main',
      path: '/admin/students',
    },
  ];

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 4,
        }}
      >
        <SettingsIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2.5 }} />
        <Box>
          <Typography
            variant="h4"
            sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}
          >
            Welcome, {user?.username ?? 'Admin'}!
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 500 }}
          >
            Online English training management system
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {cards.map((stat) => (
          // @ts-expect-error - MUI v7 Grid still works with item prop
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            <Card
              sx={{
                height: '100%',
                bgcolor: stat.color,
                color: 'white',
                borderRadius: 4,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: `0 12px 24px ${stat.color.includes('primary') ? 'rgba(25, 118, 210, 0.4)' : 'rgba(0,0,0,0.2)'}`,
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2 }}
                >
                  {stat.icon}
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {loading ? (
                        <CircularProgress size={32} sx={{ color: 'white' }} />
                      ) : (
                        <Typography variant="h4" sx={{ fontWeight: 800 }}>
                          {stat.count}
                        </Typography>
                      )}
                    </Box>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, opacity: 0.9 }}
                    >
                      {stat.title}
                    </Typography>
                  </Box>
                </Box>
                <Button
                  size="small"
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.5)',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)',
                    },
                    textTransform: 'none',
                    fontWeight: 700,
                  }}
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate(stat.path)}
                >
                  Manage {stat.title}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 3,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                borderColor: 'secondary.main',
              },
            }}
          >
            <CardContent
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BarChartIcon
                  sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }}
                />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Statistics
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    View system report
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ flexGrow: 1 }} />
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                onClick={() => navigate('/statistics')}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
              >
                View details
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: '100%',
              borderRadius: 3,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              border: '1px solid',
              borderColor: 'divider',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                borderColor: 'info.main',
              },
            }}
          >
            <CardContent
              sx={{
                p: 3,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <FolderOpenIcon
                  sx={{ fontSize: 40, color: 'info.main', mr: 2 }}
                />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Resources
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage files & media
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ flexGrow: 1 }} />
              <Button
                variant="contained"
                color="info"
                fullWidth
                onClick={openFileManager}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
              >
                Open file manager
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
