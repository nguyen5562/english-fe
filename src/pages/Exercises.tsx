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
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { getExercises, getCourses, getExerciseAttempts, getUser } from '../services/storage';
import type { Exercise } from '../types';

export default function Exercises() {
  const [exercises] = useState<Exercise[]>(() => getExercises());
  const [courses] = useState<{ id: string; name: string }[]>(() => 
    getCourses().map(c => ({ id: c.id, name: c.name }))
  );
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const navigate = useNavigate();
  const user = getUser();

  const filteredExercises = selectedCourse === 'all'
    ? exercises
    : exercises.filter(e => e.courseId === selectedCourse);

  const getBestScore = (exerciseId: string): number | null => {
    if (!user) return null;
    const attempts = getExerciseAttempts(user.id, exerciseId);
    if (attempts.length === 0) return null;
    const bestAttempt = attempts.reduce((best, current) => {
      const currentPercentage = (current.score / current.maxScore) * 100;
      const bestPercentage = (best.score / best.maxScore) * 100;
      return currentPercentage > bestPercentage ? current : best;
    });
    return Math.round((bestAttempt.score / bestAttempt.maxScore) * 100);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Bài tập</Typography>
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

      {filteredExercises.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              Chưa có bài tập nào
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredExercises.map((exercise) => {
            const bestScore = getBestScore(exercise.id);
            return (
              // @ts-expect-error - MUI v7 Grid still works with item prop
              <Grid item xs={12} md={6} key={exercise.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <AssignmentIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">{exercise.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {courses.find(c => c.id === exercise.courseId)?.name}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                      <Chip
                        label={`${(exercise.sections ?? []).length} phần`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        label={`${(exercise.sections ?? []).reduce(
                          (total, section) => total + (section.questions?.length ?? 0),
                          0
                        )} câu hỏi`}
                        size="small"
                      />
                    </Box>
                    {bestScore !== null && (
                      <Typography variant="body2" color="success.main" sx={{ mb: 1 }}>
                        Điểm cao nhất: {bestScore}%
                      </Typography>
                    )}
                  </CardContent>
                  <CardActions>
                    <Button
                      variant="contained"
                      startIcon={<PlayArrowIcon />}
                      fullWidth
                      onClick={() => navigate(`/exercises/${exercise.id}`)}
                    >
                      Làm bài tập
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

