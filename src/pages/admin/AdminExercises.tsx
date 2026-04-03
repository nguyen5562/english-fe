import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Grid,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { exerciseService } from '../../services/exercise.service';
import { courseService } from '../../services/course.service';
import { unitService } from '../../services/unit.service';
import { useConfirm } from '../../components/ConfirmDialog';
import { toast } from '../../utils/toast';

import type { Exercise, Course, Unit } from '../../types';
import type { CreateExerciseDto } from '../../types/dto';

export default function AdminExercises() {
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirm();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(false);
  const [openAddExercise, setOpenAddExercise] = useState(false);
  const [saving, setSaving] = useState(false);

  const [addForm, setAddForm] = useState<{
    courseId: string;
    unitId: string;
    title: string;
    description: string;
  }>({
    courseId: '',
    unitId: '',
    title: '',
    description: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [exData, coData, unData] = await Promise.all([
        exerciseService.getAllExercise(),
        courseService.getAllCourse(),
        unitService.getAllUnits(),
      ]);
      setExercises(exData);
      setCourses(coData);
      setUnits(unData);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Failed to load data';
        toast.error(String(msg));
      } else {
        toast.error('Failed to load data');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Confirm delete exercise',
      message: 'Are you sure you want to delete this exercise?',
      confirmText: 'Delete',
      confirmColor: 'error',
    });
    if (!ok) return;
    try {
      await exerciseService.deleteExercise(id);
      toast.success('Deleted exercise successfully');
      fetchData();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Failed to delete exercise';
        toast.error(String(msg));
      } else {
        toast.error('Failed to delete exercise');
      }
    }
  };

  const handleAddExercise = () => {
    setAddForm({ courseId: courses[0]?._id ?? '', unitId: '', title: '', description: '' });
    setOpenAddExercise(true);
  };

  const handleSaveNewExercise = async () => {
    if (!addForm.courseId || !addForm.title.trim()) {
      toast.error('Please select a course and enter an exercise name');
      return;
    }
    try {
      setSaving(true);
      const dto: CreateExerciseDto = {
        courseId: addForm.courseId,
        unitId: addForm.unitId || undefined,
        title: addForm.title.trim(),
        description: addForm.description.trim() || null,
      };
      const created = await exerciseService.createExercise(dto);
      toast.success('Added exercise successfully');
      setOpenAddExercise(false);
      fetchData();
      navigate(`/admin/exercises/${created._id}`);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Failed to add exercise';
        toast.error(String(msg));
      } else {
        toast.error('Failed to add exercise');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (exercise: Exercise) => {
    navigate(`/admin/exercises/${exercise._id}`);
  };

  const addFormCourseUnits = units.filter(u => u.courseId === addForm.courseId);

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          mb: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AssignmentIcon
            sx={{ fontSize: 40, color: 'primary.main', mr: 2.5 }}
          />
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}
            >
              Exercise Management
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              Create and manage exercises for students
            </Typography>
          </Box>
        </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddExercise}
              sx={{
                borderRadius: 2.5,
                px: 3,
                py: 1.2,
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                '&:hover': { boxShadow: '0 6px 16px rgba(25, 118, 210, 0.4)' },
              }}
            >
              Add New Exercise
            </Button>
          </Box>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : exercises.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              No exercises found. Please add a new exercise!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {[...exercises].sort((a,b) => (a.order || 0) - (b.order || 0)).map((exercise) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={exercise._id}>
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
                    borderColor: 'primary.main',
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
                      height: '3.2rem', // Fixed header area height
                    }}
                  >
                    <Box
                      sx={{
                        color: 'primary.main',
                        display: 'flex',
                        alignItems: 'center',
                        mr: 2,
                      }}
                    >
                      <AssignmentIcon sx={{ fontSize: 32 }} />
                    </Box>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 700,
                          lineHeight: 1.2,
                          mb: 0.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          height: '2.4rem', // Height for 2 lines
                        }}
                      >
                        {exercise.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ fontWeight: 500, display: 'block' }}
                      >
                        {courses.find((c) => c._id === exercise.courseId)
                          ?.name ?? 'N/A'} 
                        {exercise.unitId && ` - ${units.find(u => u._id === exercise.unitId)?.title}`}
                        {` (Order: ${exercise.order || 0})`}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      mb: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      height: '2.8rem', // Fixed height for description
                      lineHeight: 1.4,
                    }}
                  >
                    {exercise.description || 'No description.'}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1.5, mt: 'auto' }}>
                    <Box
                      sx={{
                        flex: 1,
                        p: 1,
                        bgcolor: 'action.hover',
                        borderRadius: 2,
                        textAlign: 'center',
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 800,
                          color: 'primary.main',
                          lineHeight: 1,
                        }}
                      >
                        {exercise.sections?.length ?? 0}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: 'text.secondary',
                          display: 'block',
                        }}
                      >
                        Sections
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        flex: 1,
                        p: 1,
                        bgcolor: 'action.hover',
                        borderRadius: 2,
                        textAlign: 'center',
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 800,
                          color: 'text.primary',
                          lineHeight: 1,
                        }}
                      >
                        {(exercise.sections ?? []).reduce(
                          (t, s) => t + (s.questions?.length ?? 0),
                          0,
                        )}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          color: 'text.secondary',
                          display: 'block',
                        }}
                      >
                        Questions
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>

                <Divider sx={{ opacity: 0.6 }} />

                <Box
                  sx={{
                    p: 1.5,
                    px: 2,
                    bgcolor: 'background.default',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 1,
                  }}
                >
                  <IconButton
                    size="small"
                    color="primary"
                    sx={{
                      bgcolor: 'white',
                      border: '1px solid #edf2f7',
                      '&:hover': { bgcolor: 'primary.light' },
                    }}
                    onClick={() => handleEdit(exercise)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    sx={{
                      bgcolor: 'white',
                      border: '1px solid #edf2f7',
                      '&:hover': { bgcolor: 'error.light' },
                    }}
                    onClick={() => handleDelete(exercise._id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog: Thêm bài tập */}
      <Dialog
        open={openAddExercise}
        onClose={() => setOpenAddExercise(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Exercise</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Course</InputLabel>
            <Select
              value={addForm.courseId}
              label="Course"
              onChange={(e) =>
                setAddForm((f) => ({ ...f, courseId: e.target.value, unitId: '' }))
              }
            >
              {courses.map((c) => (
                <MenuItem key={c._id} value={c._id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Unit (Optional)</InputLabel>
            <Select
              value={addForm.unitId}
              label="Unit (Optional)"
              onChange={(e) =>
                setAddForm((f) => ({ ...f, unitId: e.target.value }))
              }
            >
              <MenuItem value="">-- No Unit --</MenuItem>
              {addFormCourseUnits.map((u) => (
                <MenuItem key={u._id} value={u._id}>
                  {u.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Exercise Name"
            value={addForm.title}
            onChange={(e) =>
              setAddForm((f) => ({ ...f, title: e.target.value }))
            }
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
            value={addForm.description}
            onChange={(e) =>
              setAddForm((f) => ({ ...f, description: e.target.value }))
            }
            multiline
            rows={2}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddExercise(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveNewExercise}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {ConfirmDialog}
    </Box>
  );
}
