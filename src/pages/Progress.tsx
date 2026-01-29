import { useMemo } from 'react';
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
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { getAllStudentProgress, getCourses, getExerciseAttempts, getQuizAttempts, getUser, getExercise, getQuiz } from '../types old/storage';
import type { StudentProgress } from '../types old';

export default function Progress() {
  const user = getUser();
  const progress = useMemo(() => 
    user?.id ? getAllStudentProgress(user.id) : []
  , [user]);
  const courses = useMemo(() => 
    getCourses().map(c => ({ id: c.id, name: c.name, code: c.code }))
  , []);

  const getCourseProgress = (courseId: string): StudentProgress | undefined => {
    return progress.find(p => p.courseId === courseId);
  };

  const getTotalScore = (courseId: string): number => {
    if (!user) return 0;
    const allExerciseAttempts = getExerciseAttempts(user.id);
    const allQuizAttempts = getQuizAttempts(user.id);
    
    const exerciseAttempts = allExerciseAttempts.filter(a => {
      const exercise = getExercise(a.exerciseId);
      return exercise?.courseId === courseId;
    });
    const quizAttempts = allQuizAttempts.filter(a => {
      const quiz = getQuiz(a.quizId);
      return quiz?.courseId === courseId;
    });

    const allScores = [
      ...exerciseAttempts.map(a => (a.score / a.maxScore) * 100),
      ...quizAttempts.map(a => a.percentage),
    ];

    return allScores.length > 0
      ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
      : 0;
  };

  const getRecentAttempts = () => {
    if (!user) return [];
    const exerciseAttempts = getExerciseAttempts(user.id);
    const quizAttempts = getQuizAttempts(user.id);
    const allAttempts = [
      ...exerciseAttempts.map(a => ({ ...a, type: 'exercise' as const })),
      ...quizAttempts.map(a => ({ ...a, type: 'quiz' as const })),
    ];
    return allAttempts
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      .slice(0, 10);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Tiến độ học tập
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Theo dõi kết quả và sự tiến bộ của bạn
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {courses.map((course) => {
          const courseProgress = getCourseProgress(course.id);
          const totalScore = getTotalScore(course.id);
          const courseData = getCourses().find(c => c.id === course.id);
          const completionPercent = courseProgress && courseData
            ? (courseProgress.completedLessons.length / courseData.lessons.length) * 100
            : 0;

          return (
            // @ts-expect-error - MUI v7 Grid still works with item prop
            <Grid item xs={12} md={6} key={course.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                    <Box>
                      <Typography variant="h6">{course.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {course.code}
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Hoàn thành bài học</Typography>
                      <Typography variant="body2">{Math.round(completionPercent)}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={completionPercent} />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2">Điểm trung bình</Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {totalScore.toFixed(1)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={totalScore}
                      color={totalScore >= 70 ? 'success' : totalScore >= 50 ? 'warning' : 'error'}
                    />
                  </Box>

                  {courseProgress && (
                    <Typography variant="body2" color="text.secondary">
                      Đã hoàn thành: {courseProgress.completedLessons.length} / {courseData?.lessons.length || 0} bài học
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}

        {/* @ts-expect-error - MUI v7 Grid still works with item prop */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <TrendingUpIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                Lịch sử làm bài gần đây
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Loại</TableCell>
                      <TableCell>Điểm số</TableCell>
                      <TableCell>Thời gian</TableCell>
                      <TableCell>Trạng thái</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getRecentAttempts().map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell>
                          <Chip
                            label={attempt.type === 'exercise' ? 'Bài tập' : 'Quiz'}
                            size="small"
                            color={attempt.type === 'exercise' ? 'primary' : 'secondary'}
                          />
                        </TableCell>
                        <TableCell>
                          {attempt.type === 'exercise'
                            ? `${attempt.score} / ${attempt.maxScore}`
                            : `${attempt.percentage.toFixed(1)}%`}
                        </TableCell>
                        <TableCell>
                          {new Date(attempt.completedAt).toLocaleString('vi-VN')}
                        </TableCell>
                        <TableCell>
                          {attempt.type === 'quiz' && 'passed' in attempt && (
                            <Chip
                              icon={<CheckCircleIcon />}
                              label={attempt.passed ? 'Đạt' : 'Chưa đạt'}
                              size="small"
                              color={attempt.passed ? 'success' : 'default'}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {getRecentAttempts().length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          <Typography color="text.secondary">
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
        </Grid>
      </Grid>
    </Box>
  );
}

