import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { courseService } from '../services/course.service';
import { exerciseService } from '../services/exercise.service';
import { quizService } from '../services/quiz.service';
import { exerciseAttemptService } from '../services/exercise-attempt.service';
import { quizAttemptService } from '../services/quiz-attempt.service';
import { useAuthStore } from '../store/auth.store';
import { toast } from '../utils/toast';
import type {
  Course,
  Exercise,
  Quiz,
  ExerciseAttempt,
  QuizAttempt,
} from '../types';

type CourseProgress = {
  courseId: string;
  courseName: string;
  courseCode: string;
  totalExercises: number;
  completedExercises: number;
  totalQuizzes: number;
  completedQuizzes: number;
  averageScore: number;
  completionPercent: number;
};

type RecentActivity = {
  id: string;
  type: 'exercise' | 'quiz';
  title: string;
  score: number;
  maxScore: number;
  completedAt: Date;
  courseId: string;
};

export default function Progress() {
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [exerciseAttempts, setExerciseAttempts] = useState<ExerciseAttempt[]>(
    [],
  );
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [
          coursesData,
          exercisesData,
          quizzesData,
          exerciseAttemptsData,
          quizAttemptsData,
        ] = await Promise.all([
          courseService.getAllCourse(),
          exerciseService.getAllExercise(),
          quizService.getAllQuiz(),
          exerciseAttemptService.getExerciseAttemptByUserId(user._id),
          quizAttemptService.getQuizAttemptByUserId(user._id),
        ]);

        setCourses(coursesData);
        setExercises(exercisesData);
        setQuizzes(quizzesData);
        setExerciseAttempts(exerciseAttemptsData);
        setQuizAttempts(quizAttemptsData);
      } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
          const msg =
            (e.response?.data as { message?: string })?.message ??
            e.response?.statusText ??
            'Không thể tải dữ liệu tiến độ';
          toast.error(String(msg));
        } else {
          toast.error('Không thể tải dữ liệu tiến độ');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?._id]);

  const getCourseProgress = (courseId: string): CourseProgress => {
    const course = courses.find((c) => c._id === courseId);
    const courseExercises = exercises.filter((e) => e.courseId === courseId);
    const courseQuizzes = quizzes.filter((q) => q.courseId === courseId);

    // Count total sections and completed sections
    let totalSections = 0;
    let completedSections = 0;

    courseExercises.forEach((exercise) => {
      const exerciseSections = exercise.sections ?? [];
      totalSections += exerciseSections.length;

      // Count how many sections of this exercise have been attempted
      exerciseSections.forEach((section) => {
        const hasAttempt = exerciseAttempts.some((attempt) => {
          const attemptExerciseId =
            typeof attempt.exerciseId === 'object'
              ? (attempt.exerciseId as any)._id
              : attempt.exerciseId;

          if (String(attemptExerciseId) !== String(exercise._id)) return false;

          return (attempt.sectionAttempts ?? []).some((sectionAttempt) => {
            const sectionId =
              typeof sectionAttempt.sectionId === 'object'
                ? (sectionAttempt.sectionId as any)._id
                : sectionAttempt.sectionId;
            return String(sectionId) === String(section._id);
          });
        });

        if (hasAttempt) completedSections++;
      });
    });

    // Count completed quizzes
    const completedQuizzes = courseQuizzes.filter((quiz) => {
      return quizAttempts.some((attempt) => {
        return (
          String(attempt.quizId) === String(quiz._id) &&
          attempt.submittedAt != null
        );
      });
    }).length;

    // Calculate average score
    const courseExerciseAttempts = exerciseAttempts.filter((attempt) => {
      const attemptExerciseId =
        typeof attempt.exerciseId === 'object'
          ? (attempt.exerciseId as any)._id
          : attempt.exerciseId;
      const exercise = exercises.find(
        (e) => String(e._id) === String(attemptExerciseId),
      );
      return exercise?.courseId === courseId;
    });

    const courseQuizAttempts = quizAttempts.filter((attempt) => {
      const quiz = quizzes.find(
        (q) => String(q._id) === String(attempt.quizId),
      );
      return quiz?.courseId === courseId && attempt.submittedAt != null;
    });

    let totalScore = 0;
    let totalMaxScore = 0;

    // Exercise scores (section-based)
    courseExerciseAttempts.forEach((attempt) => {
      (attempt.sectionAttempts ?? []).forEach((sectionAttempt) => {
        const attemptExerciseId =
          typeof attempt.exerciseId === 'object'
            ? (attempt.exerciseId as any)._id
            : attempt.exerciseId;
        const exercise = exercises.find(
          (e) => String(e._id) === String(attemptExerciseId),
        );
        const sectionId =
          typeof sectionAttempt.sectionId === 'object'
            ? (sectionAttempt.sectionId as any)._id
            : sectionAttempt.sectionId;
        const section = exercise?.sections.find(
          (s) => String(s._id) === String(sectionId),
        );

        if (
          section &&
          !['pronunciation', 'video-recording', 'writing'].includes(
            section.questionType,
          )
        ) {
          const maxScore = (section.questions ?? []).reduce(
            (sum, q) => sum + (q.point ?? 0),
            0,
          );
          totalScore += sectionAttempt.score || 0;
          totalMaxScore += maxScore;
        }
      });
    });

    // Quiz scores
    courseQuizAttempts.forEach((attempt) => {
      const quiz = quizzes.find(
        (q) => String(q._id) === String(attempt.quizId),
      );
      if (quiz) {
        const maxScore = (quiz.sections ?? []).reduce((sum, section) => {
          if (
            ['pronunciation', 'video-recording', 'writing'].includes(
              section.questionType,
            )
          ) {
            return sum;
          }
          return (
            sum +
            (section.questions ?? []).reduce((s, q) => s + (q.point ?? 0), 0)
          );
        }, 0);
        totalScore += attempt.totalScore ?? 0;
        totalMaxScore += maxScore;
      }
    });

    const averageScore =
      totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

    const totalItems = totalSections + courseQuizzes.length;
    const completedItems = completedSections + completedQuizzes;
    const completionPercent =
      totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

    return {
      courseId,
      courseName: course?.name ?? 'Unknown Course',
      courseCode: course?.code ?? '',
      totalExercises: totalSections, // Now represents total sections
      completedExercises: completedSections, // Now represents completed sections
      totalQuizzes: courseQuizzes.length,
      completedQuizzes,
      averageScore,
      completionPercent,
    };
  };

  const getRecentActivities = (): RecentActivity[] => {
    const activities: RecentActivity[] = [];

    // Exercise activities - create an entry for each section attempt
    exerciseAttempts.forEach((attempt) => {
      const attemptExerciseId =
        typeof attempt.exerciseId === 'object'
          ? (attempt.exerciseId as any)._id
          : attempt.exerciseId;
      const exercise = exercises.find(
        (e) => String(e._id) === String(attemptExerciseId),
      );

      if (
        exercise &&
        attempt.sectionAttempts &&
        attempt.sectionAttempts.length > 0
      ) {
        // Create an activity for each section attempt
        attempt.sectionAttempts.forEach((sectionAttempt) => {
          const sectionId =
            typeof sectionAttempt.sectionId === 'object'
              ? (sectionAttempt.sectionId as any)._id
              : sectionAttempt.sectionId;
          const section = exercise.sections.find(
            (s) => String(s._id) === String(sectionId),
          );

          if (section) {
            const maxScore = (section.questions ?? []).reduce(
              (sum, q) => sum + (q.point ?? 0),
              0,
            );

            activities.push({
              id: `exercise-${attempt._id}-${sectionId}-${sectionAttempt.tries}`,
              type: 'exercise',
              title: `${exercise.title} - ${section.title}`,
              score: sectionAttempt.score ?? 0,
              maxScore,
              completedAt: sectionAttempt.submittedAt
                ? new Date(sectionAttempt.submittedAt)
                : new Date(),
              courseId: exercise.courseId,
            });
          }
        });
      }
    });

    // Quiz activities
    quizAttempts.forEach((attempt) => {
      if (attempt.submittedAt) {
        const quiz = quizzes.find(
          (q) => String(q._id) === String(attempt.quizId),
        );
        if (quiz) {
          const maxScore = (quiz.sections ?? []).reduce((sum, section) => {
            if (
              ['pronunciation', 'video-recording', 'writing'].includes(
                section.questionType,
              )
            ) {
              return sum;
            }
            return (
              sum +
              (section.questions ?? []).reduce((s, q) => s + (q.point ?? 0), 0)
            );
          }, 0);

          activities.push({
            id: `quiz-${attempt._id}`,
            type: 'quiz',
            title: quiz.title,
            score: attempt.totalScore ?? 0,
            maxScore,
            completedAt: new Date(attempt.submittedAt),
            courseId: quiz.courseId,
          });
        }
      }
    });

    return activities
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
      .slice(0, 20);
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>
          Tiến độ học tập
        </Typography>
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              Vui lòng đăng nhập để xem tiến độ học tập
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const courseProgresses = courses.map((course) =>
    getCourseProgress(course._id),
  );
  const recentActivities = getRecentActivities();

  // Count total sections across all exercises
  const totalSections = exercises.reduce(
    (sum, ex) => sum + (ex.sections ?? []).length,
    0,
  );
  const completedSectionsSet = new Set<string>();
  exerciseAttempts.forEach((attempt) => {
    (attempt.sectionAttempts ?? []).forEach((sectionAttempt) => {
      const attemptExerciseId =
        typeof attempt.exerciseId === 'object'
          ? (attempt.exerciseId as any)._id
          : attempt.exerciseId;
      const sectionId =
        typeof sectionAttempt.sectionId === 'object'
          ? (sectionAttempt.sectionId as any)._id
          : sectionAttempt.sectionId;
      completedSectionsSet.add(`${attemptExerciseId}-${sectionId}`);
    });
  });
  const completedSections = completedSectionsSet.size;

  const totalQuizzes = quizzes.length;
  const completedQuizzes = quizAttempts.filter(
    (a) => a.submittedAt != null,
  ).length;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Tiến độ học tập
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Theo dõi kết quả và sự tiến bộ của bạn
      </Typography>

      {/* Overall Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AssignmentIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Phần bài tập
                </Typography>
              </Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: 'primary.main' }}
              >
                {completedSections}/{totalSections}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Đã hoàn thành
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <QuizIcon sx={{ color: 'secondary.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Quiz
                </Typography>
              </Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: 'secondary.main' }}
              >
                {completedQuizzes}/{totalQuizzes}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Đã hoàn thành
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <SchoolIcon sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Khóa học
                </Typography>
              </Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: 'success.main' }}
              >
                {courses.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Đang theo học
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TrendingUpIcon sx={{ color: 'warning.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Hoạt động
                </Typography>
              </Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 700, color: 'warning.main' }}
              >
                {completedSections + completedQuizzes}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tổng số hoạt động
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Course Progress */}
      <Typography
        variant="h5"
        gutterBottom
        sx={{ mt: 4, mb: 2, fontWeight: 600 }}
      >
        Tiến độ theo khóa học
      </Typography>
      <Grid container spacing={3}>
        {courseProgresses.map((progress) => (
          <Grid size={{ xs: 12, md: 6 }} key={progress.courseId}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AssessmentIcon
                    sx={{ fontSize: 40, color: 'primary.main', mr: 2 }}
                  />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {progress.courseName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {progress.courseCode}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      mb: 1,
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Hoàn thành tổng thể
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {Math.round(progress.completionPercent)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={progress.completionPercent}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                {progress.averageScore > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        Điểm trung bình
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {progress.averageScore.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={progress.averageScore}
                      color={
                        progress.averageScore >= 80
                          ? 'success'
                          : progress.averageScore >= 60
                            ? 'warning'
                            : 'error'
                      }
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Phần bài tập
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {progress.completedExercises}/{progress.totalExercises}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Quiz
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {progress.completedQuizzes}/{progress.totalQuizzes}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent Activities */}
      <Typography
        variant="h5"
        gutterBottom
        sx={{ mt: 4, mb: 2, fontWeight: 600 }}
      >
        <TrendingUpIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
        Lịch sử làm bài gần đây
      </Typography>
      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Loại</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Tiêu đề</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Điểm số</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Thời gian</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentActivities.map((activity) => {
                  const percentage =
                    activity.maxScore > 0
                      ? (activity.score / activity.maxScore) * 100
                      : 0;
                  const course = courses.find(
                    (c) => c._id === activity.courseId,
                  );

                  return (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <Chip
                          label={
                            activity.type === 'exercise' ? 'Bài tập' : 'Quiz'
                          }
                          size="small"
                          color={
                            activity.type === 'exercise'
                              ? 'primary'
                              : 'secondary'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {activity.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {course?.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {activity.maxScore > 0 ? (
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600 }}
                            >
                              {activity.score} / {activity.maxScore}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              ({percentage.toFixed(0)}%)
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Đã hoàn thành
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {activity.completedAt.toLocaleDateString('vi-VN')}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {activity.completedAt.toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {recentActivities.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography color="text.secondary" sx={{ py: 4 }}>
                        Chưa có lịch sử làm bài
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
