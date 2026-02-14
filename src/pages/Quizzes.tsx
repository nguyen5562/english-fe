import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Quiz as QuizIcon,
  AccessTime as AccessTimeIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { quizService } from '../services/quiz.service';
import { courseService } from '../services/course.service';
import { quizAttemptService } from '../services/quiz-attempt.service';
import { useAuthStore } from '../store/auth.store';
import { toast } from '../utils/toast';

import type { Quiz, Course, QuizAttempt } from '../types';

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
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
            const attemptsData =
              await quizAttemptService.getQuizAttemptByUserId(user._id);
            setQuizAttempts(attemptsData);
          } catch (e) {
            console.error('Failed to load quiz attempts:', e);
          }
        }
      } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
          const msg =
            (e.response?.data as { message?: string })?.message ??
            e.response?.statusText ??
            'Không thể tải danh sách quiz';
          toast.error(String(msg));
        } else {
          toast.error('Không thể tải danh sách quiz');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?._id]);

  const filteredQuizzes =
    selectedCourse === 'all'
      ? quizzes
      : quizzes.filter((q) => q.courseId === selectedCourse);

  const getBestAttempt = (quizId: string): QuizAttempt | null => {
    const attempts = quizAttempts.filter(
      (a) => a.quizId === quizId && a.submittedAt != null,
    );
    if (attempts.length === 0) return null;
    return attempts.reduce((best, current) =>
      (current.totalScore ?? 0) > (best.totalScore ?? 0) ? current : best,
    );
  };

  const getMaxScore = (quiz: Quiz): number => {
    return (quiz.sections ?? []).reduce(
      (sum, section) =>
        sum + (section.questions ?? []).reduce((s, q) => s + (q.point ?? 0), 0),
      0,
    );
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4">Quiz</Typography>
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
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
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
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={quiz._id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: '1px solid',
                    borderColor: 'divider',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                      borderColor: 'secondary.main',
                    },
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <CardContent
                    sx={{
                      flexGrow: 1,
                      p: 3,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        mb: 2,
                        height: '3.6rem', // Fixed header area height
                      }}
                    >
                      <Box
                        sx={{
                          color: 'secondary.main',
                          display: 'flex',
                          alignItems: 'center',
                          mr: 2,
                        }}
                      >
                        <QuizIcon sx={{ fontSize: 32 }} />
                      </Box>
                      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            lineHeight: 1.1,
                            mb: 0.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            height: '2.2rem', // Height for 2 lines
                          }}
                        >
                          {quiz.title}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          sx={{ fontWeight: 600, display: 'block' }}
                        >
                          {courses.find((c) => c._id === quiz.courseId)?.name}
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
                        height: '2.8rem', // Fixed height for description area
                        lineHeight: 1.4,
                      }}
                    >
                      {quiz.description ||
                        'Không có mô tả cho bài kiểm tra này.'}
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1.5,
                        flexWrap: 'wrap',
                        mt: 'auto', // Push chips to bottom of body
                      }}
                    >
                      <Chip
                        label={`${(quiz.sections ?? []).reduce(
                          (sum, section) =>
                            sum + (section.questions?.length ?? 0),
                          0,
                        )} câu hỏi`}
                        size="small"
                        sx={{ fontWeight: 600, bgcolor: 'action.hover' }}
                      />
                      <Chip
                        icon={
                          <AccessTimeIcon
                            sx={{ fontSize: '1rem !important' }}
                          />
                        }
                        label={`${quiz.timeLimit} phút`}
                        size="small"
                        sx={{ fontWeight: 600, bgcolor: 'action.hover' }}
                      />
                    </Box>
                  </CardContent>

                  <Divider sx={{ opacity: 0.6 }} />

                  <Box sx={{ p: 2, px: 3, bgcolor: 'background.default' }}>
                    {bestPercent != null ? (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          mb: 2,
                        }}
                      >
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                        >
                          <CheckCircleIcon
                            sx={{
                              color: hasPassed
                                ? 'success.main'
                                : 'warning.main',
                              fontSize: 18,
                            }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {hasPassed ? 'Đã đạt' : 'Chưa đạt 60%'}
                          </Typography>
                        </Box>
                        <Typography
                          variant="h6"
                          color={hasPassed ? 'success.main' : 'warning.main'}
                          sx={{ fontWeight: 800 }}
                        >
                          {bestPercent}%
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ mb: 2 }}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ fontStyle: 'italic' }}
                        >
                          Chưa có lượt làm bài nào
                        </Typography>
                      </Box>
                    )}

                    <Button
                      variant="contained"
                      startIcon={<PlayArrowIcon />}
                      fullWidth
                      onClick={() => navigate(`/quizzes/${quiz._id}`)}
                      color={bestAttempt && hasPassed ? 'success' : 'primary'}
                      sx={{
                        borderRadius: 2,
                        py: 1,
                        textTransform: 'none',
                        fontWeight: 700,
                        boxShadow: 'none',
                        '&:hover': { boxShadow: 'none' },
                      }}
                    >
                      {bestAttempt ? 'Làm lại' : 'Bắt đầu làm'}
                    </Button>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}
