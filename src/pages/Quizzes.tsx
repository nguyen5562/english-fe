import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Alert,
} from '@mui/material';
import {
  Quiz as QuizIcon,
  AccessTime as AccessTimeIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { getQuizzes, getCourses, getQuizAttempts, getUser } from '../services/storage';
import type { Quiz } from '../types';

export default function Quizzes() {
  const [quizzes] = useState<Quiz[]>(() => getQuizzes());
  const [courses] = useState<{ id: string; name: string }[]>(() => 
    getCourses().map(c => ({ id: c.id, name: c.name }))
  );
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const navigate = useNavigate();
  const user = getUser();

  const filteredQuizzes = selectedCourse === 'all'
    ? quizzes
    : quizzes.filter(q => q.courseId === selectedCourse);

  const getBestAttempt = (quizId: string) => {
    if (!user) return null;
    const attempts = getQuizAttempts(user.id, quizId);
    if (attempts.length === 0) return null;
    return attempts.reduce((best, current) => {
      return current.percentage > best.percentage ? current : best;
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
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
              <MenuItem key={course.id} value={course.id}>
                {course.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {filteredQuizzes.length === 0 ? (
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
            const bestAttempt = getBestAttempt(quiz.id);
            return (
              // @ts-expect-error - MUI v7 Grid still works with item prop
              <Grid item xs={12} md={6} key={quiz.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <QuizIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">{quiz.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {courses.find(c => c.id === quiz.courseId)?.name}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" paragraph>
                      {quiz.description}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      <Chip
                        label={`${quiz.questions.length} câu hỏi`}
                        size="small"
                      />
                      <Chip
                        icon={<AccessTimeIcon />}
                        label={`${quiz.timeLimit} phút`}
                        size="small"
                      />
                      <Chip
                        label={`Điểm đạt: ${quiz.passingScore}%`}
                        size="small"
                        color={bestAttempt && bestAttempt.passed ? 'success' : 'default'}
                      />
                    </Box>
                    {bestAttempt && (
                      <Alert severity={bestAttempt.passed ? 'success' : 'warning'} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CheckCircleIcon sx={{ mr: 1 }} />
                          <Typography variant="body2">
                            Điểm cao nhất: {bestAttempt.percentage.toFixed(1)}%
                            {bestAttempt.passed ? ' (Đã đạt)' : ' (Chưa đạt)'}
                          </Typography>
                        </Box>
                      </Alert>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button
                      variant="contained"
                      startIcon={<PlayArrowIcon />}
                      fullWidth
                      onClick={() => navigate(`/quizzes/${quiz.id}`)}
                      color={bestAttempt && bestAttempt.passed ? 'success' : 'primary'}
                    >
                      {bestAttempt ? 'Làm lại' : 'Bắt đầu làm'}
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

