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
import { useConfirm } from '../../components/ConfirmDialog';
import { toast } from '../../utils/toast';

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
      navigate(`/admin/exercises/${created._id}`);
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
    navigate(`/admin/exercises/${exercise._id}`);
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
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={exercise._id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
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
                        bgcolor: 'primary.light',
                        color: 'primary.main',
                        p: 1.5,
                        borderRadius: 2,
                        display: 'flex',
                        mr: 2,
                      }}
                    >
                      <AssignmentIcon sx={{ fontSize: 24 }} />
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
                    {exercise.description || 'Không có mô tả.'}
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
                        Phần
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
                        Câu hỏi
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
