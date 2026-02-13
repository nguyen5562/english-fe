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
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Quiz as QuizIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { quizService } from '../../services/quiz.service';
import { courseService } from '../../services/course.service';
import { useConfirm } from '../../components/ConfirmDialog';
import { toast } from '../../utils/toast';

import type { Quiz, Course } from '../../types';
import type { CreateQuizDto } from '../../types/dto';

export default function AdminQuizzes() {
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirm();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [openAddQuiz, setOpenAddQuiz] = useState(false);
  const [saving, setSaving] = useState(false);

  const [addForm, setAddForm] = useState<{
    courseId: string;
    title: string;
    description: string;
    timeLimit: number;
  }>({
    courseId: '',
    title: '',
    description: '',
    timeLimit: 60,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quizData, coData] = await Promise.all([
        quizService.getAllQuiz(),
        courseService.getAllCourse(),
      ]);
      setQuizzes(quizData);
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

  const handleDelete = async (quizId: string) => {
    const ok = await confirm({
      title: 'Xác nhận xóa quiz',
      message: 'Bạn có chắc muốn xóa quiz này?',
      confirmText: 'Xóa',
      confirmColor: 'error',
    });
    if (!ok) return;
    try {
      await quizService.deleteQuiz(quizId);
      toast.success('Đã xóa quiz');
      fetchData();
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể xóa';
        toast.error(String(msg));
      } else {
        toast.error('Không thể xóa quiz');
      }
    }
  };

  const handleAddQuiz = () => {
    setAddForm({
      courseId: courses[0]?._id ?? '',
      title: '',
      description: '',
      timeLimit: 60,
    });
    setOpenAddQuiz(true);
  };

  const handleSaveNewQuiz = async () => {
    if (!addForm.courseId || !addForm.title.trim()) {
      toast.error('Vui lòng chọn khóa học và nhập tên quiz');
      return;
    }
    try {
      setSaving(true);
      const dto: CreateQuizDto = {
        courseId: addForm.courseId,
        title: addForm.title.trim(),
        description: addForm.description.trim() || null,
        timeLimit: addForm.timeLimit,
      };
      const created = await quizService.createQuiz(dto);
      toast.success('Đã thêm quiz');
      setOpenAddQuiz(false);
      fetchData();
      navigate(`/admin/quizzes/${created._id}`);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể thêm quiz';
        toast.error(String(msg));
      } else {
        toast.error('Không thể thêm quiz');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (quiz: Quiz) => {
    navigate(`/admin/quizzes/${quiz._id}`);
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
        <Typography variant="h4">Quản lý Quiz</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddQuiz}
        >
          Thêm Quiz
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : quizzes.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              Chưa có quiz nào. Hãy thêm quiz mới!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {quizzes.map((quiz) => (
            <Card
              key={quiz._id}
              sx={{
                borderRadius: 2,
                transition: 'all 0.2s',
                border: '1px solid #edf2f7',
                boxShadow: 'none',
                '&:hover': {
                  borderColor: 'secondary.main',
                  bgcolor: 'rgba(156, 39, 176, 0.02)',
                  transform: 'translateX(4px)',
                },
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  p: 1.5,
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'secondary.main',
                    color: 'white',
                    flexShrink: 0,
                  }}
                >
                  <QuizIcon fontSize="small" />
                </Box>

                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography
                    variant="subtitle1"
                    noWrap
                    sx={{ fontWeight: 600, color: '#1a202c', lineHeight: 1.2 }}
                  >
                    {quiz.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {courses.find((c) => c._id === quiz.courseId)?.name ??
                      'N/A'}
                    {quiz.description && ` • ${quiz.description}`}
                  </Typography>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    flexShrink: 0,
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 3 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: 'secondary.main' }}
                      >
                        {quiz.timeLimit}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          display: 'block',
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          mt: -0.5,
                        }}
                      >
                        Phút
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, color: '#4a5568' }}
                      >
                        {(quiz.sections ?? []).reduce(
                          (total, s) => total + (s.questions?.length ?? 0),
                          0,
                        )}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          display: 'block',
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          mt: -0.5,
                        }}
                      >
                        Câu hỏi
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      gap: 0.5,
                      borderLeft: '1px solid #edf2f7',
                      pl: 1,
                    }}
                  >
                    <IconButton
                      size="small"
                      color="secondary"
                      onClick={() => handleEdit(quiz)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(quiz._id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            </Card>
          ))}
        </Box>
      )}

      <Dialog
        open={openAddQuiz}
        onClose={() => setOpenAddQuiz(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Thêm Quiz</DialogTitle>
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
            label="Tên quiz"
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
          <TextField
            fullWidth
            type="number"
            label="Thời gian (phút)"
            value={addForm.timeLimit}
            onChange={(e) =>
              setAddForm((f) => ({
                ...f,
                timeLimit: Math.max(1, Number(e.target.value) || 60),
              }))
            }
            inputProps={{ min: 1 }}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddQuiz(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handleSaveNewQuiz}
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
