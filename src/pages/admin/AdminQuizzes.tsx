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
          alignItems: 'flex-start',
          mb: 4,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <QuizIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2.5 }} />
          <Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 600, color: 'text.primary', mb: 0.5 }}
            >
              Quản lý Quiz
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              Thiết lập các bài kiểm tra đánh giá trình độ tổng hợp
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          color="secondary"
          startIcon={<AddIcon />}
          onClick={handleAddQuiz}
          sx={{
            borderRadius: 2.5,
            px: 3,
            py: 1.2,
            textTransform: 'none',
            // fontWeight: 700,
            boxShadow: '0 4px 12px rgba(156, 39, 176, 0.3)',
            '&:hover': { boxShadow: '0 6px 16px rgba(156, 39, 176, 0.4)' },
          }}
        >
          Thêm Quiz mới
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
        <Grid container spacing={3}>
          {quizzes.map((quiz) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={quiz._id}>
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
                    borderColor: 'secondary.main',
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
                        color: 'secondary.main',
                        display: 'flex',
                        alignItems: 'center',
                        mr: 2,
                      }}
                    >
                      <QuizIcon sx={{ fontSize: 32 }} />
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
                        {quiz.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ fontWeight: 500, display: 'block' }}
                      >
                        {courses.find((c) => c._id === quiz.courseId)?.name ??
                          'N/A'}
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
                    {quiz.description || 'Không có mô tả.'}
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
                          color: 'secondary.main',
                          lineHeight: 1,
                        }}
                      >
                        {quiz.timeLimit}
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
                        Phút
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
                        {(quiz.sections ?? []).reduce(
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
                    color="secondary"
                    sx={{
                      bgcolor: 'white',
                      border: '1px solid #edf2f7',
                      '&:hover': { bgcolor: 'secondary.light' },
                    }}
                    onClick={() => handleEdit(quiz)}
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
                    onClick={() => handleDelete(quiz._id)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
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
