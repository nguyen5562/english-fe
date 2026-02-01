import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  IconButton,
  Chip,
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
import { useConfirm } from '../../components/ConfirmDialog';
import { toast } from '../../utils/toast';
import { toSlug } from '../../utils/slug';
import type { Exercise, Course } from '../../types';
import type { CreateExerciseDto } from '../../types/dto';

export default function AdminExercises() {
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirm();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [openAddExercise, setOpenAddExercise] = useState(false);
  const [saving, setSaving] = useState(false);

  const [addForm, setAddForm] = useState<{
    courseId: string;
    title: string;
    description: string;
  }>({
    courseId: '',
    title: '',
    description: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [exData, coData] = await Promise.all([
        exerciseService.getAllExercise(),
        courseService.getAllCourse(),
      ]);
      setExercises(exData);
      setCourses(coData);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể tải dữ liệu';
        toast.error(String(msg));
      } else {
        toast.error('Không thể tải dữ liệu');
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
      title: 'Xác nhận xóa bài tập',
      message: 'Bạn có chắc muốn xóa bài tập này?',
      confirmText: 'Xóa',
      confirmColor: 'error',
    });
    if (!ok) return;
    try {
      await exerciseService.deleteExercise(id);
      toast.success('Đã xóa bài tập');
      fetchData();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể xóa';
        toast.error(String(msg));
      } else {
        toast.error('Không thể xóa bài tập');
      }
    }
  };

  const handleAddExercise = () => {
    setAddForm({ courseId: courses[0]?._id ?? '', title: '', description: '' });
    setOpenAddExercise(true);
  };

  const handleSaveNewExercise = async () => {
    if (!addForm.courseId || !addForm.title.trim()) {
      toast.error('Vui lòng chọn khóa học và nhập tên bài tập');
      return;
    }
    try {
      setSaving(true);
      const dto: CreateExerciseDto = {
        courseId: addForm.courseId,
        title: addForm.title.trim(),
        description: addForm.description.trim() || null,
      };
      const created = await exerciseService.createExercise(dto);
      toast.success('Đã thêm bài tập');
      setOpenAddExercise(false);
      fetchData();
      navigate(`/admin/exercises/${toSlug(created.title ?? '')}`);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể thêm bài tập';
        toast.error(String(msg));
      } else {
        toast.error('Không thể thêm bài tập');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (exercise: Exercise) => {
    navigate(`/admin/exercises/${toSlug(exercise.title ?? '')}`);
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
        <Typography variant="h4">Quản lý Bài tập</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddExercise}
        >
          Thêm Bài tập
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : exercises.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              Chưa có bài tập nào. Hãy thêm bài tập mới!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {exercises.map((exercise) => (
            // @ts-expect-error - MUI v7 Grid item
            <Grid item xs={12} md={6} key={exercise._id}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      mb: 2,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        flexGrow: 1,
                      }}
                    >
                      <AssignmentIcon
                        sx={{ fontSize: 40, color: 'primary.main', mr: 2 }}
                      />
                      <Box>
                        <Typography variant="h6">{exercise.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {courses.find((c) => c._id === exercise.courseId)
                            ?.name ?? 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(exercise)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(exercise._id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={`${exercise.sections?.length ?? 0} phần`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={`${(exercise.sections ?? []).reduce(
                        (total, s) => total + (s.questions?.length ?? 0),
                        0,
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

      {/* Dialog: Thêm bài tập */}
      <Dialog
        open={openAddExercise}
        onClose={() => setOpenAddExercise(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Thêm bài tập</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Khóa học</InputLabel>
            <Select
              value={addForm.courseId}
              label="Khóa học"
              onChange={(e) =>
                setAddForm((f) => ({ ...f, courseId: e.target.value }))
              }
            >
              {courses.map((c) => (
                <MenuItem key={c._id} value={c._id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Tên bài tập"
            value={addForm.title}
            onChange={(e) =>
              setAddForm((f) => ({ ...f, title: e.target.value }))
            }
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            label="Mô tả"
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
          <Button onClick={() => setOpenAddExercise(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handleSaveNewExercise}
            disabled={saving}
          >
            {saving ? 'Đang lưu...' : 'Thêm'}
          </Button>
        </DialogActions>
      </Dialog>

      {ConfirmDialog}
    </Box>
  );
}
