import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  People as PeopleIcon,
  BarChart as BarChartIcon,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useAuthStore } from "../../store/auth.store";
import { courseService } from "../../services/course.service";
import { exerciseService } from "../../services/exercise.service";
import { quizService } from "../../services/quiz.service";
import { userService } from "../../services/user.service";
import { toast } from "../../utils/toast";

type AdminStats = {
  courses: number;
  exercises: number;
  quizzes: number;
  students: number;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<AdminStats>({
    courses: 0,
    exercises: 0,
    quizzes: 0,
    students: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [courses, exercises, quizzes, students] = await Promise.all([
          courseService.getAllCourse(),
          exerciseService.getAllExercise(),
          quizService.getAllQuiz(),
          userService.getAllStudent(),
        ]);

        setStats({
          courses: courses.length,
          exercises: exercises.length,
          quizzes: quizzes.length,
          students: students.length,
        });
      } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
          const msg =
            (e.response?.data as { message?: string })?.message ??
            e.response?.statusText ??
            "Không thể tải thống kê";
          toast.error(String(msg));
        } else {
          toast.error("Không thể tải thống kê");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const cards = [
    {
      title: "Học phần",
      count: stats.courses,
      icon: <SchoolIcon sx={{ fontSize: 40 }} />,
      color: "primary.main",
      path: "/admin/content",
    },
    {
      title: "Bài tập",
      count: stats.exercises,
      icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
      color: "info.main",
      path: "/admin/exercises",
    },
    {
      title: "Quiz",
      count: stats.quizzes,
      icon: <QuizIcon sx={{ fontSize: 40 }} />,
      color: "warning.main",
      path: "/admin/quizzes",
    },
    {
      title: "Sinh viên",
      count: stats.students,
      icon: <PeopleIcon sx={{ fontSize: 40 }} />,
      color: "success.main",
      path: "/admin/students",
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Chào mừng, {user?.username ?? "Admin"}!
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Trang quản trị hệ thống học tiếng Anh
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {cards.map((stat) => (
          // @ts-expect-error - MUI v7 Grid still works with item prop
          <Grid item xs={12} sm={6} md={3} key={stat.title}>
            <Card sx={{ height: "100%", bgcolor: stat.color, color: "white" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  {stat.icon}
                  <Box sx={{ ml: 2, flexGrow: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {loading ? (
                        <CircularProgress size={32} sx={{ color: "white" }} />
                      ) : (
                        <Typography variant="h4">{stat.count}</Typography>
                      )}
                    </Box>
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

