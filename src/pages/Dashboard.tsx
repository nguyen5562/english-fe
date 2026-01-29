import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
} from "@mui/material";
import {
  MenuBook as MenuBookIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
} from "@mui/icons-material";
import axios from "axios";
import { useAuthStore } from "../store/auth.store";
import { courseService } from "../services/course.service";
import { toast } from "../utils/toast";
import type { Course } from "../types";

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
            "Không thể tải danh sách khóa học";
          toast.error(String(msg));
        } else {
          toast.error("Không thể tải danh sách khóa học");
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
        Chào mừng, {user?.username ?? "bạn"}!
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        {user?.role === 'teacher'
          ? 'Quản lý và theo dõi tình hình học tập của sinh viên'
          : 'Bắt đầu hành trình học tiếng Anh của bạn'}
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              Chưa có khóa học nào
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          {courses.map((course) => {
            return (
              // @ts-expect-error - MUI v7 Grid still works with item prop
              <Grid item xs={12} md={6} key={course._id}>
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
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => navigate(`/materials?course=${course._id}`)}
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

        </Grid>
      )}
    </Box>
  );
}

