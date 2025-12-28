import { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  IconButton,
  Chip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Quiz as QuizIcon,
} from '@mui/icons-material';
import { getQuizzes, getCourses, saveQuizzes } from '../../services/storage';

export default function AdminQuizzes() {
  const [quizzes, setQuizzes] = useState(() => getQuizzes());
  const courses = useMemo(() => getCourses(), []);

  const refreshQuizzes = () => {
    setQuizzes(getQuizzes());
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa quiz này?')) {
      const updated = quizzes.filter(q => q.id !== id);
      saveQuizzes(updated);
      refreshQuizzes();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Quản lý Quiz</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => alert('Tính năng thêm quiz sẽ được phát triển sau')}
        >
          Thêm Quiz
        </Button>
      </Box>

      {quizzes.length === 0 ? (
        <Card>
          <CardContent>
            <Alert severity="info">Chưa có quiz nào. Hãy thêm quiz mới!</Alert>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {quizzes.map((quiz) => (
            // @ts-expect-error - MUI v7 Grid still works with item prop
            <Grid item xs={12} md={6} key={quiz.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                      <QuizIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                      <Box>
                        <Typography variant="h6">{quiz.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {courses.find(c => c.id === quiz.courseId)?.name || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => alert('Tính năng sửa sẽ được phát triển sau')}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(quiz.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  <Typography variant="body2" paragraph>
                    {quiz.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={`${quiz.sections.reduce((sum, section) => sum + section.questions.length, 0)} câu hỏi`}
                      size="small"
                    />
                    <Chip
                      label={`${quiz.timeLimit} phút`}
                      size="small"
                    />
                    <Chip
                      label={`Điểm đạt: ${quiz.passingScore}%`}
                      size="small"
                      color="success"
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

