import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
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
import { toSlug } from '../../utils/slug';
import type { Quiz, Course } from '../../types';

export default function AdminQuizEdit() {
  const { slug } = useParams<{ slug: string }>();
  const [id, setId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirm();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setId(null);
    setLoading(true);
    const OBJECT_ID_REGEX = /^[a-f0-9]{24}$/i;
    if (OBJECT_ID_REGEX.test(slug)) {
      setId(slug);
      return;
    }
    // Lookup ID from slug
    quizService
      .getAllQuiz()
      .then((quizzes) => {
        const found = quizzes.find((q) => toSlug(q.title) === slug);
        setId(found?._id ?? null);
        if (!found) {
          toast.error('Không tìm thấy bài kiểm tra');
          setLoading(false);
        }
      })
      .catch(() => {
        toast.error('Lỗi khi tìm bài kiểm tra');
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([quizService.getQuizById(id), courseService.getAllCourse()])
      .then(([quizData, coData]) => {
        if (!cancelled) {
          setQuiz(quizData);
          setCourses(coData);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled && axios.isAxiosError(e)) {
          const msg =
            (e.response?.data as { message?: string })?.message ??
            e.response?.statusText ??
            'Không thể tải quiz';
          toast.error(String(msg));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDeleteSection = async (sectionId: string) => {
    if (!id) return;
    const ok = await confirm({
      title: 'Xác nhận xóa phần',
      message: 'Bạn có chắc muốn xóa phần này?',
      confirmText: 'Xóa',
      confirmColor: 'error',
    });
    if (!ok) return;
    try {
      setDeleting(true);
      const updated = await quizService.removeSection(id, sectionId);
      setQuiz(updated);
      toast.success('Đã xóa phần');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể xóa phần';
        toast.error(String(msg));
      } else {
        toast.error('Không thể xóa phần');
      }
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !id) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!quiz) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin/quizzes')}
          sx={{ mb: 2 }}
        >
          Quay lại
        </Button>
        <Typography color="text.secondary">Không tìm thấy quiz.</Typography>
      </Box>
    );
  }

  const courseName =
    courses.find((c) => c._id === quiz.courseId)?.name ?? 'N/A';

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/admin/quizzes')}
        sx={{ mb: 2 }}
      >
        Quay lại
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <QuizIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
            <Box>
              <Typography variant="h5">{quiz.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {courseName} · {quiz.timeLimit} phút ·{' '}
                {quiz.sections?.length ?? 0} phần
              </Typography>
            </Box>
          </Box>
          {quiz.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {quiz.description}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 2 }}>
        Các phần quiz
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() =>
          navigate(`/admin/quizzes/${toSlug(quiz.title ?? '')}/sections/new`)
        }
        sx={{ mb: 2 }}
      >
        Thêm phần
      </Button>

      {(quiz.sections?.length ?? 0) === 0 ? (
        <Typography color="text.secondary">
          Chưa có phần nào. Nhấn &quot;Thêm phần&quot; để tạo.
        </Typography>
      ) : (
        <List>
          {(quiz.sections ?? []).map((section) => (
            <ListItem key={section._id} sx={{ mb: 1, p: 0 }}>
              <Card sx={{ width: '100%' }}>
                <CardContent
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    '&:last-child': { pb: 2 },
                  }}
                >
                  <ListItemText
                    primary={section.title}
                    secondary={
                      <Box
                        component="span"
                        sx={{ display: 'flex', gap: 1, mt: 0.5 }}
                      >
                        <Chip
                          label={section.sectionType}
                          size="small"
                          variant="outlined"
                        />
                        <Chip label={section.questionType} size="small" />
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          {section.questions?.length ?? 0} câu hỏi
                        </Typography>
                      </Box>
                    }
                  />
                  <Box>
                    <IconButton
                      onClick={() =>
                        navigate(
                          `/admin/quizzes/${toSlug(quiz.title ?? '')}/sections/${toSlug(section.title ?? '')}`,
                        )
                      }
                      sx={{ mr: 0.5 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteSection(section._id)}
                      disabled={deleting}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </ListItem>
          ))}
        </List>
      )}

      {ConfirmDialog}
    </Box>
  );
}
