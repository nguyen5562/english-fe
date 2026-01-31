import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import {
  Quiz as QuizIcon,
  AccessTime as AccessTimeIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import axios from "axios";
import { quizService } from "../services/quiz.service";
import { courseService } from "../services/course.service";
import { quizAttemptService } from "../services/quiz-attempt.service";
import { useAuthStore } from "../store/auth.store";
import { toast } from "../utils/toast";
import { buildSlugId } from "../utils/slug";
import type { Quiz, Course, QuizAttempt } from "../types";

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [quizzesData, coursesData] = await Promise.all([
          quizService.getAllQuiz(),
          courseService.getAllCourse(),
        ]);
        setQuizzes(quizzesData);
        setCourses(coursesData);

        if (user?._id) {
          try {
            const attemptsData = await quizAttemptService.getQuizAttemptByUserId(user._id);
            setQuizAttempts(attemptsData);
          } catch (e) {
            console.error("Failed to load quiz attempts:", e);
          }
        }
      } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
          const msg =
            (e.response?.data as { message?: string })?.message ??
            e.response?.statusText ??
            "Không thể tải danh sách quiz";
          toast.error(String(msg));
        } else {
          toast.error("Không thể tải danh sách quiz");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?._id]);

  const filteredQuizzes =
    selectedCourse === "all"
      ? quizzes
      : quizzes.filter((q) => q.courseId === selectedCourse);

  const getBestAttempt = (quizId: string): QuizAttempt | null => {
    const attempts = quizAttempts.filter(
      (a) => a.quizId === quizId && a.submittedAt != null
    );
    if (attempts.length === 0) return null;
    return attempts.reduce((best, current) =>
      (current.totalScore ?? 0) > (best.totalScore ?? 0) ? current : best
    );
  };

  const getMaxScore = (quiz: Quiz): number => {
    return (quiz.sections ?? []).reduce(
      (sum, section) =>
        sum +
        (section.questions ?? []).reduce((s, q) => s + (q.point ?? 0), 0),
      0
    );
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h4">Quiz & Kiểm tra</Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Lọc theo khóa học</InputLabel>
          <Select
            value={selectedCourse}
            label="Lọc theo khóa học"
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <MenuItem value="all">Tất cả</MenuItem>
            {courses.map((course) => (
              <MenuItem key={course._id} value={course._id}>
                {course.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredQuizzes.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              Chưa có quiz nào
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredQuizzes.map((quiz) => {
            const bestAttempt = getBestAttempt(quiz._id);
            const maxScore = getMaxScore(quiz);
            const bestPercent =
              bestAttempt != null && maxScore > 0
                ? Math.round(((bestAttempt.totalScore ?? 0) / maxScore) * 100)
                : null;
            const hasPassed = bestPercent != null && bestPercent >= 60;

            return (
              // @ts-expect-error - MUI v7 Grid still works with item prop
              <Grid item xs={12} md={6} key={quiz._id}>
                <Card>
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        mb: 2,
                      }}
                    >
                      <QuizIcon
                        sx={{ fontSize: 40, color: "secondary.main", mr: 2 }}
                      />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">{quiz.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {courses.find((c) => c._id === quiz.courseId)?.name}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" paragraph>
                      {quiz.description ?? ""}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        mb: 2,
                        flexWrap: "wrap",
                      }}
                    >
                      <Chip
                        label={`${(quiz.sections ?? []).reduce(
                          (sum, section) =>
                            sum + (section.questions?.length ?? 0),
                          0
                        )} câu hỏi`}
                        size="small"
                      />
                      <Chip
                        icon={<AccessTimeIcon />}
                        label={`${quiz.timeLimit} phút`}
                        size="small"
                      />
                      {bestPercent != null && (
                        <Chip
                          label={`Điểm cao nhất: ${bestPercent}%`}
                          size="small"
                          color={hasPassed ? "success" : "default"}
                        />
                      )}
                    </Box>
                    {bestAttempt != null && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <CheckCircleIcon
                          sx={{
                            color: hasPassed ? "success.main" : "warning.main",
                            fontSize: 20,
                          }}
                        />
                        <Typography variant="body2">
                          Điểm cao nhất: {bestPercent}%
                          {hasPassed ? " (Đạt)" : " (Chưa đạt 60%)"}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button
                      variant="contained"
                      startIcon={<PlayArrowIcon />}
                      fullWidth
                      onClick={() => navigate(`/quizzes/${buildSlugId(quiz.title ?? "", quiz._id)}`)}
                      color={
                        bestAttempt && hasPassed ? "success" : "primary"
                      }
                    >
                      {bestAttempt ? "Làm lại" : "Bắt đầu làm"}
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
