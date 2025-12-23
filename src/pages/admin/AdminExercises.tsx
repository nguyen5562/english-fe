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
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { getExercises, getCourses, saveExercises } from '../../services/storage';

export default function AdminExercises() {
  const [exercises, setExercises] = useState(() => getExercises());
  const courses = useMemo(() => getCourses(), []);

  const refreshExercises = () => {
    setExercises(getExercises());
  };

  const handleDelete = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa bài tập này?')) {
      const updated = exercises.filter(e => e.id !== id);
      saveExercises(updated);
      refreshExercises();
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Quản lý Bài tập</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => alert('Tính năng thêm bài tập sẽ được phát triển sau')}
        >
          Thêm Bài tập
        </Button>
      </Box>

      {exercises.length === 0 ? (
        <Card>
          <CardContent>
            <Alert severity="info">Chưa có bài tập nào. Hãy thêm bài tập mới!</Alert>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {exercises.map((exercise) => (
            // @ts-expect-error - MUI v7 Grid still works with item prop
            <Grid item xs={12} md={6} key={exercise.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                      <AssignmentIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                      <Box>
                        <Typography variant="h6">{exercise.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {courses.find(c => c.id === exercise.courseId)?.name || 'N/A'}
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
                        onClick={() => handleDelete(exercise.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={`${exercise.sections.length} phần`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={`${exercise.sections.reduce(
                        (total, section) => total + section.questions.length,
                        0
                      )} câu hỏi`}
                      size="small"
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

