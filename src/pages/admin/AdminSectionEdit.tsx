import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  MenuBook as MenuBookIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { exerciseService } from '../../services/exercise.service';
import { courseService } from '../../services/course.service';
import { useConfirm } from '../../components/ConfirmDialog';
import { FilePicker } from '../../components/FilePicker';
import { toast } from '../../utils/toast';
import type { Exercise, Course, Section } from '../../types';
import type { QuestionType, SectionType } from '../../types';
import type { SectionDto, QuestionDto } from '../../types/dto';

const TYPES_WITH_OPTIONS: QuestionType[] = [
  'multiple-choice',
  'dropdown-choice',
  'picture-choice',
  'reading-mcq',
];
const TYPES_FILL_BLANK: QuestionType[] = ['fill-blank'];
const TYPES_SINGLE_ANSWER: QuestionType[] = [
  'fill-sentence',
  'word-order',
  'word-bank',
  'listening',
  'pronunciation',
  'writing',
  'video-recording',
  'paragraph-fill',
];
const TYPES_NEED_AUDIO: QuestionType[] = ['listening', 'pronunciation'];
const TYPES_NEED_VIDEO: QuestionType[] = ['video-recording'];
const TYPES_NEED_IMAGE: QuestionType[] = ['picture-choice'];

// Section fields theo kiểu câu hỏi (gen khác nhau)
const SECTION_NEED_PASSAGE: QuestionType[] = [
  'reading-mcq',
  'paragraph-fill',
  'fill-blank',
];
const SECTION_NEED_AUDIO: QuestionType[] = ['listening', 'pronunciation'];
const SECTION_NEED_VIDEO: QuestionType[] = ['video-recording'];
const SECTION_NEED_IMAGE: QuestionType[] = ['picture-choice'];
const SECTION_NEED_WORD_BANK: QuestionType[] = ['word-bank', 'paragraph-fill'];

const SECTION_TYPE_OPTIONS: { value: SectionType; label: string }[] = [
  { value: 'grammar', label: 'Grammar' },
  { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'listening', label: 'Listening' },
  { value: 'reading', label: 'Reading' },
  { value: 'speaking', label: 'Speaking' },
  { value: 'writing', label: 'Writing' },
  { value: 'pronunciation', label: 'Pronunciation' },
];

const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: 'multiple-choice', label: 'Trắc nghiệm' },
  { value: 'dropdown-choice', label: 'Chọn đáp án (dropdown)' },
  { value: 'fill-sentence', label: 'Điền câu' },
  { value: 'fill-blank', label: 'Điền từ vào chỗ trống' },
  { value: 'word-order', label: 'Sắp xếp từ' },
  { value: 'word-bank', label: 'Từ gợi ý' },
  { value: 'listening', label: 'Nghe' },
  { value: 'reading-mcq', label: 'Đọc hiểu trắc nghiệm' },
  { value: 'paragraph-fill', label: 'Điền vào đoạn văn' },
  { value: 'picture-choice', label: 'Chọn tranh' },
  { value: 'pronunciation', label: 'Phát âm' },
  { value: 'writing', label: 'Viết' },
  { value: 'video-recording', label: 'Ghi âm / Video' },
];

export default function AdminSectionEdit() {
  const { exerciseId, sectionId } = useParams<{
    exerciseId: string;
    sectionId: string;
  }>();
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirm();
  const isNew = sectionId === 'new';

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [sectionForm, setSectionForm] = useState<{
    sectionType: SectionType;
    questionType: QuestionType;
    title: string;
    description: string;
    passage: string;
    audioUrl: string;
    videoUrl: string;
    imageUrl: string;
    wordBankStr: string;
  }>({
    sectionType: 'grammar',
    questionType: 'multiple-choice',
    title: '',
    description: '',
    passage: '',
    audioUrl: '',
    videoUrl: '',
    imageUrl: '',
    wordBankStr: '',
  });

  const [openQuestionDialog, setOpenQuestionDialog] = useState(false);
  const [questionForm, setQuestionForm] = useState<
    QuestionDto & {
      audioUrl?: string;
      videoUrl?: string;
      imageUrl?: string;
      wordBankStr?: string;
    }
  >({
    title: '',
    point: 1,
    options: [],
    correctAnswer: [],
    audioUrl: '',
    videoUrl: '',
    imageUrl: '',
    wordBankStr: '',
  });
  const [optionsList, setOptionsList] = useState<string[]>([]);
  const [correctAnswerList, setCorrectAnswerList] = useState<string[]>([]);
  const [correctAnswerSingle, setCorrectAnswerSingle] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(
    null,
  );
  const pendingFilePickRef = useRef<
    | { type: 'option'; index: number }
    | { type: 'correctBlank'; index: number }
    | null
  >(null);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (
        e.origin !== window.location.origin ||
        e.data?.type !== 'FM_PICK' ||
        typeof e.data?.url !== 'string'
      )
        return;
      const pending = pendingFilePickRef.current;
      if (!pending) return;
      if (pending.type === 'option') {
        setOptionsList((prev) => {
          const next = [...prev];
          next[pending.index] = e.data.url;
          return next;
        });
      } else {
        setCorrectAnswerList((prev) => {
          const next = [...prev];
          next[pending.index] = e.data.url;
          return next;
        });
      }
      pendingFilePickRef.current = null;
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  useEffect(() => {
    if (!exerciseId) return;
    let cancelled = false;
    setLoading(true);
    // Explicitly cast exerciseId to string to satisfy type checker if needed, though useParams provides strings
    const eId = exerciseId as string;

    Promise.all([
      exerciseService.getExerciseById(eId),
      courseService.getAllCourse(),
    ])
      .then(([exData, coData]) => {
        if (!cancelled) {
          setExercise(exData);
          setCourses(coData);
          if (!isNew && sectionId) {
            const section = exData.sections?.find((s) => s._id === sectionId);
            if (section) {
              setSectionForm({
                sectionType: section.sectionType as SectionType,
                questionType: section.questionType as QuestionType,
                title: section.title ?? '',
                description: section.description ?? '',
                passage: section.passage ?? '',
                audioUrl: section.audioUrl ?? '',
                videoUrl: section.videoUrl ?? '',
                imageUrl: section.imageUrl ?? '',
                wordBankStr: (section.wordBank ?? []).join(', '),
              });
            }
          }
        }
      })
      .catch((e: unknown) => {
        if (!cancelled && axios.isAxiosError(e)) {
          const msg =
            (e.response?.data as { message?: string })?.message ??
            e.response?.statusText ??
            'Không thể tải dữ liệu';
          toast.error(String(msg));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [exerciseId, sectionId, isNew]);

  const currentSection: Section | undefined =
    !isNew && sectionId && exercise
      ? exercise.sections?.find((s) => s._id === sectionId)
      : undefined;

  const handleSaveSection = async () => {
    if (!exerciseId || !sectionForm.title.trim()) {
      toast.error('Vui lòng nhập tên phần');
      return;
    }
    try {
      setSaving(true);
      const wordBank = sectionForm.wordBankStr
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const dto: SectionDto = {
        sectionType: sectionForm.sectionType,
        questionType: sectionForm.questionType,
        title: sectionForm.title.trim(),
        description: sectionForm.description.trim() || undefined,
        passage: sectionForm.passage.trim() || undefined,
        audioUrl: sectionForm.audioUrl.trim() || undefined,
        videoUrl: sectionForm.videoUrl.trim() || undefined,
        imageUrl: sectionForm.imageUrl.trim() || undefined,
        wordBank: wordBank.length ? wordBank : undefined,
      };

      if (isNew) {
        await exerciseService.addSection(exerciseId, dto);
        toast.success(
          'Đã tạo phần. Bạn có thể thêm câu hỏi ở trang tiếp theo.',
        );
        const updated = await exerciseService.getExerciseById(exerciseId);
        const newSection =
          updated.sections?.find((s) => s.title === sectionForm.title.trim()) ??
          updated.sections?.slice(-1)[0];
        if (newSection?._id) {
          navigate(`/admin/exercises/${exerciseId}/sections/${newSection._id}`);
        } else {
          navigate(`/admin/exercises/${exerciseId}`);
        }
      } else if (sectionId) {
        await exerciseService.updateSection(exerciseId, sectionId, dto);
        toast.success('Đã cập nhật phần');
        const updated = await exerciseService.getExerciseById(exerciseId);
        setExercise(updated);
        // Navigate if title changed (slug changed)
        const updatedSection = updated.sections?.find(
          (s) => s._id === sectionId,
        );
        if (updatedSection && updatedSection._id !== sectionId) {
          navigate(
            `/admin/exercises/${exerciseId}/sections/${updatedSection._id}`,
            { replace: true },
          );
        }
      }
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể lưu phần';
        toast.error(String(msg));
      } else {
        toast.error('Không thể lưu phần');
      }
    } finally {
      setSaving(false);
    }
  };

  const openAddQuestion = () => {
    setEditingQuestionId(null);
    setQuestionForm({
      title: '',
      point: 1,
      options: [],
      correctAnswer: [],
      audioUrl: '',
      videoUrl: '',
      imageUrl: '',
      wordBankStr: '',
    });
    setOptionsList([]);
    setCorrectAnswerList([]);
    setCorrectAnswerSingle('');
    setOpenQuestionDialog(true);
  };

  const sectionQuestionType = sectionForm.questionType;

  const buildQuestionDto = (): QuestionDto => {
    const base: QuestionDto = {
      title: questionForm.title.trim(),
      point: questionForm.point,
    };
    if (questionForm.audioUrl?.trim())
      base.audioUrl = questionForm.audioUrl.trim();
    if (questionForm.videoUrl?.trim())
      base.videoUrl = questionForm.videoUrl.trim();
    if (questionForm.imageUrl?.trim())
      base.imageUrl = questionForm.imageUrl.trim();
    if (questionForm.wordBankStr?.trim()) {
      base.wordBank = questionForm.wordBankStr
        .split(/[,;\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (TYPES_WITH_OPTIONS.includes(sectionQuestionType)) {
      const opts = optionsList.map((s) => s.trim()).filter(Boolean);
      if (opts.length) base.options = opts;
      if (correctAnswerSingle.trim())
        base.correctAnswer = [correctAnswerSingle.trim()];
    } else if (TYPES_FILL_BLANK.includes(sectionQuestionType)) {
      const correct = correctAnswerList.map((s) => s.trim()).filter(Boolean);
      if (correct.length) base.correctAnswer = correct;
    } else {
      if (correctAnswerSingle.trim())
        base.correctAnswer = [correctAnswerSingle.trim()];
    }
    return base;
  };

  const handleAddQuestionToSection = async () => {
    if (!exerciseId || !sectionId || sectionId === 'new') return;
    if (!questionForm.title.trim()) {
      toast.error('Vui lòng nhập nội dung câu hỏi');
      return;
    }
    const dto = buildQuestionDto();
    if (
      TYPES_WITH_OPTIONS.includes(sectionQuestionType) &&
      (!dto.options?.length || !dto.correctAnswer?.length)
    ) {
      toast.error('Vui lòng thêm ít nhất một đáp án và chọn đáp án đúng');
      return;
    }
    if (
      TYPES_FILL_BLANK.includes(sectionQuestionType) &&
      !dto.correctAnswer?.length
    ) {
      toast.error('Vui lòng thêm ít nhất một đáp án đúng');
      return;
    }
    try {
      setSaving(true);
      let updated: Exercise;
      if (editingQuestionId) {
        updated = await exerciseService.updateQuestion(
          exerciseId,
          sectionId,
          editingQuestionId,
          dto,
        );
        toast.success('Đã cập nhật câu hỏi');
      } else {
        updated = await exerciseService.addQuestion(exerciseId, sectionId, dto);
        toast.success('Đã thêm câu hỏi');
      }
      setExercise(updated);
      setQuestionForm({
        title: '',
        point: 1,
        options: [],
        correctAnswer: [],
        audioUrl: '',
        videoUrl: '',
        imageUrl: '',
        wordBankStr: '',
      });
      setOptionsList([]);
      setCorrectAnswerList([]);
      setCorrectAnswerSingle('');
      setEditingQuestionId(null);
      setOpenQuestionDialog(false);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          (editingQuestionId
            ? 'Không thể cập nhật câu hỏi'
            : 'Không thể thêm câu hỏi');
        toast.error(String(msg));
      } else {
        toast.error(
          editingQuestionId
            ? 'Không thể cập nhật câu hỏi'
            : 'Không thể thêm câu hỏi',
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveQuestion = async (questionId: string) => {
    if (!exerciseId || !sectionId || sectionId === 'new') return;
    const ok = await confirm({
      title: 'Xác nhận xóa câu hỏi',
      message: 'Bạn có chắc muốn xóa câu hỏi này?',
      confirmText: 'Xóa',
      confirmColor: 'error',
    });
    if (!ok) return;
    try {
      setSaving(true);
      const updated = await exerciseService.removeQuestion(
        exerciseId,
        sectionId,
        questionId,
      );
      setExercise(updated);
      toast.success('Đã xóa câu hỏi');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể xóa câu hỏi';
        toast.error(String(msg));
      } else {
        toast.error('Không thể xóa câu hỏi');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEditQuestion = (q: any) => {
    setEditingQuestionId(q._id);
    setQuestionForm({
      title: q.title,
      point: q.point,
      options: q.options || [],
      correctAnswer: q.correctAnswer || [],
      audioUrl: q.audioUrl || '',
      videoUrl: q.videoUrl || '',
      imageUrl: q.imageUrl || '',
      wordBankStr: (q.wordBank || []).join(', '),
    });
    setOptionsList(q.options || []);
    setCorrectAnswerList(q.correctAnswer || []);
    setCorrectAnswerSingle(q.correctAnswer?.[0] || '');
    setOpenQuestionDialog(true);
  };

  if (loading || !exerciseId) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!exercise) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin/exercises')}
          sx={{ mb: 2 }}
        >
          Quay lại
        </Button>
        <Typography color="text.secondary">Không tìm thấy bài tập.</Typography>
      </Box>
    );
  }

  const courseName =
    courses.find((c) => c._id === exercise.courseId)?.name ?? 'N/A';

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/admin/exercises/${exercise?._id}`)}
        sx={{ mb: 2 }}
      >
        Quay lại
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <MenuBookIcon sx={{ fontSize: 32, color: 'primary.main', mr: 2 }} />
            <Box>
              <Typography variant="h6">{exercise.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {courseName}{' '}
                {isNew
                  ? '· Thêm phần mới'
                  : `· Sửa phần: ${currentSection?.title ?? ''}`}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 2 }}>
        {isNew
          ? 'Thông tin phần (chọn kiểu phần & kiểu câu hỏi trước)'
          : 'Thông tin phần'}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Loại phần</InputLabel>
            <Select
              value={sectionForm.sectionType}
              label="Loại phần"
              onChange={(e) =>
                setSectionForm((f) => ({
                  ...f,
                  sectionType: e.target.value as SectionType,
                }))
              }
            >
              {SECTION_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Kiểu câu hỏi</InputLabel>
            <Select
              value={sectionForm.questionType}
              label="Kiểu câu hỏi"
              disabled={!isNew}
              onChange={(e) =>
                setSectionForm((f) => ({
                  ...f,
                  questionType: e.target.value as QuestionType,
                }))
              }
            >
              {QUESTION_TYPE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            {!isNew && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Kiểu câu hỏi cố định sau khi tạo phần; mọi câu hỏi trong phần
                dùng chung kiểu này.
              </Typography>
            )}
          </FormControl>
          <TextField
            fullWidth
            label="Tên phần"
            value={sectionForm.title}
            onChange={(e) =>
              setSectionForm((f) => ({ ...f, title: e.target.value }))
            }
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Mô tả"
            value={sectionForm.description}
            onChange={(e) =>
              setSectionForm((f) => ({ ...f, description: e.target.value }))
            }
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
          {/* Trường section theo kiểu câu hỏi (gen khác nhau) */}
          {SECTION_NEED_PASSAGE.includes(sectionForm.questionType) && (
            <TextField
              fullWidth
              label={
                sectionForm.questionType === 'paragraph-fill'
                  ? 'Đoạn văn (dùng ____ cho mỗi chỗ trống)'
                  : 'Đoạn văn (passage)'
              }
              value={sectionForm.passage}
              onChange={(e) =>
                setSectionForm((f) => ({ ...f, passage: e.target.value }))
              }
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
          )}
          {(SECTION_NEED_AUDIO.includes(sectionForm.questionType) ||
            SECTION_NEED_VIDEO.includes(sectionForm.questionType) ||
            SECTION_NEED_IMAGE.includes(sectionForm.questionType)) && (
            <Box sx={{ mb: 2 }}>
              {SECTION_NEED_AUDIO.includes(sectionForm.questionType) && (
                <FilePicker
                  label="URL Audio (phần)"
                  value={sectionForm.audioUrl}
                  onChange={(url) =>
                    setSectionForm((f) => ({ ...f, audioUrl: url }))
                  }
                />
              )}
              {SECTION_NEED_VIDEO.includes(sectionForm.questionType) && (
                <FilePicker
                  label="URL Video (phần)"
                  value={sectionForm.videoUrl}
                  onChange={(url) =>
                    setSectionForm((f) => ({ ...f, videoUrl: url }))
                  }
                />
              )}
              {SECTION_NEED_IMAGE.includes(sectionForm.questionType) && (
                <FilePicker
                  label="URL Hình ảnh (phần)"
                  value={sectionForm.imageUrl}
                  onChange={(url) =>
                    setSectionForm((f) => ({ ...f, imageUrl: url }))
                  }
                />
              )}
            </Box>
          )}
          {SECTION_NEED_WORD_BANK.includes(sectionForm.questionType) && (
            <TextField
              fullWidth
              label="Từ gợi ý (cách nhau bởi dấu phẩy hoặc xuống dòng)"
              value={sectionForm.wordBankStr}
              onChange={(e) =>
                setSectionForm((f) => ({ ...f, wordBankStr: e.target.value }))
              }
              multiline
              rows={2}
            />
          )}
        </CardContent>
      </Card>

      {/* Phần câu hỏi: chỉ khi đã tạo section (sửa phần), không cho thêm câu hỏi lúc tạo phần mới */}
      {!isNew && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Câu hỏi trong phần (kiểu:{' '}
            {QUESTION_TYPE_OPTIONS.find(
              (o) => o.value === sectionForm.questionType,
            )?.label ?? sectionForm.questionType}
            )
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={openAddQuestion}
            sx={{ mb: 2 }}
          >
            Thêm câu hỏi
          </Button>
          {(currentSection?.questions?.length ?? 0) === 0 ? (
            <Typography color="text.secondary">
              Chưa có câu hỏi nào trong phần này.
            </Typography>
          ) : (
            <List>
              {(currentSection?.questions ?? []).map((q) => (
                <ListItem
                  key={q._id}
                  secondaryAction={
                    <Box>
                      <IconButton
                        color="primary"
                        onClick={() => handleEditQuestion(q)}
                        disabled={saving}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => handleRemoveQuestion(q._id)}
                        disabled={saving}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={q.title || '(Không tiêu đề)'}
                    secondary={`Điểm: ${q.point}`}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </>
      )}

      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          onClick={handleSaveSection}
          disabled={saving}
          sx={{ mr: 1 }}
        >
          {saving ? 'Đang lưu...' : isNew ? 'Tạo phần' : 'Lưu phần'}
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate(`/admin/exercises/${exercise?._id}`)}
        >
          Hủy
        </Button>
      </Box>

      {/* Dialog: Thêm câu hỏi - kiểu lấy từ section, form theo kiểu đó */}
      <Dialog
        open={openQuestionDialog}
        onClose={() => setOpenQuestionDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingQuestionId ? 'Sửa câu hỏi' : 'Thêm câu hỏi'} — Kiểu:{' '}
          {QUESTION_TYPE_OPTIONS.find((o) => o.value === sectionQuestionType)
            ?.label ?? sectionQuestionType}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={
              TYPES_FILL_BLANK.includes(sectionQuestionType)
                ? 'Nội dung câu (dùng ____ cho mỗi chỗ trống)'
                : 'Nội dung câu hỏi'
            }
            value={questionForm.title}
            onChange={(e) =>
              setQuestionForm((f) => ({ ...f, title: e.target.value }))
            }
            multiline={sectionQuestionType === 'writing'}
            rows={sectionQuestionType === 'writing' ? 4 : 2}
            sx={{ mt: 2 }}
          />
          <TextField
            fullWidth
            type="number"
            label="Điểm"
            value={questionForm.point}
            onChange={(e) =>
              setQuestionForm((f) => ({
                ...f,
                point: Math.max(0, Number(e.target.value) || 0),
              }))
            }
            inputProps={{ min: 0 }}
            sx={{ mt: 2 }}
          />

          {/* URL media câu hỏi: chỉ hiện theo kiểu câu hỏi của section (Listening/Pronunciation → audio, Video recording → video, Picture choice → image) */}
          {(TYPES_NEED_AUDIO.includes(sectionQuestionType) ||
            TYPES_NEED_VIDEO.includes(sectionQuestionType) ||
            TYPES_NEED_IMAGE.includes(sectionQuestionType)) && (
            <>
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                URL media câu hỏi (theo kiểu phần — chọn từ file manager)
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {TYPES_NEED_AUDIO.includes(sectionQuestionType) && (
                  <FilePicker
                    label="URL Audio"
                    value={questionForm.audioUrl ?? ''}
                    onChange={(url) =>
                      setQuestionForm((f) => ({ ...f, audioUrl: url }))
                    }
                  />
                )}
                {TYPES_NEED_VIDEO.includes(sectionQuestionType) && (
                  <FilePicker
                    label="URL Video"
                    value={questionForm.videoUrl ?? ''}
                    onChange={(url) =>
                      setQuestionForm((f) => ({ ...f, videoUrl: url }))
                    }
                  />
                )}
                {TYPES_NEED_IMAGE.includes(sectionQuestionType) && (
                  <FilePicker
                    label="URL Hình ảnh"
                    value={questionForm.imageUrl ?? ''}
                    onChange={(url) =>
                      setQuestionForm((f) => ({ ...f, imageUrl: url }))
                    }
                  />
                )}
              </Box>
            </>
          )}
          {(sectionQuestionType === 'word-bank' ||
            sectionQuestionType === 'paragraph-fill') && (
            <TextField
              fullWidth
              label="Từ gợi ý (word bank, cách nhau bởi dấu phẩy)"
              value={questionForm.wordBankStr ?? ''}
              onChange={(e) =>
                setQuestionForm((f) => ({ ...f, wordBankStr: e.target.value }))
              }
              multiline
              rows={2}
              sx={{ mt: 2 }}
            />
          )}

          {/* Các đáp án (trắc nghiệm / dropdown / picture / reading-mcq): thêm từng đáp án, mỗi đáp án có thể là text hoặc file */}
          {TYPES_WITH_OPTIONS.includes(sectionQuestionType) && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Các đáp án (nhấn &quot;Thêm đáp án&quot; rồi nhập text hoặc chọn
                file)
              </Typography>
              {optionsList.map((opt, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'flex-start',
                    mb: 1,
                  }}
                >
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Nội dung đáp án hoặc để trống nếu dùng file"
                    value={opt}
                    onChange={(e) => {
                      const next = [...optionsList];
                      next[idx] = e.target.value;
                      setOptionsList(next);
                    }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      pendingFilePickRef.current = {
                        type: 'option',
                        index: idx,
                      };
                      window.open(
                        '/file-manager-popup',
                        'FileManager',
                        'width=1200,height=800',
                      );
                    }}
                    sx={{ minWidth: 100, height: 40 }}
                  >
                    Chọn file
                  </Button>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() =>
                      setOptionsList((p) => p.filter((_, i) => i !== idx))
                    }
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setOptionsList((p) => [...p, ''])}
                sx={{ mt: 1 }}
              >
                Thêm đáp án
              </Button>
              <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>
                Đáp án đúng
              </Typography>
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Chọn từ các đáp án trên</InputLabel>
                <Select
                  value={
                    optionsList.includes(correctAnswerSingle)
                      ? correctAnswerSingle
                      : ''
                  }
                  label="Chọn từ các đáp án trên"
                  onChange={(e) => setCorrectAnswerSingle(e.target.value)}
                >
                  <MenuItem value="">— Chọn —</MenuItem>
                  {optionsList.filter(Boolean).map((opt, i) => (
                    <MenuItem key={i} value={opt}>
                      {opt.length > 50 ? opt.slice(0, 50) + '…' : opt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FilePicker
                label="Hoặc nhập URL / chọn file làm đáp án đúng"
                value={
                  optionsList.includes(correctAnswerSingle)
                    ? ''
                    : correctAnswerSingle
                }
                onChange={(url) => setCorrectAnswerSingle(url)}
              />
            </>
          )}

          {/* Đáp án đúng (fill-blank): thêm từng đáp án cho mỗi chỗ trống */}
          {TYPES_FILL_BLANK.includes(sectionQuestionType) && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Đáp án đúng cho từng chỗ trống (thêm lần lượt, mỗi ô có thể text
                hoặc file)
              </Typography>
              {correctAnswerList.map((ans, idx) => (
                <Box
                  key={idx}
                  sx={{
                    display: 'flex',
                    gap: 1,
                    alignItems: 'flex-start',
                    mb: 1,
                  }}
                >
                  <TextField
                    fullWidth
                    size="small"
                    placeholder={`Đáp án chỗ trống ${idx + 1}`}
                    value={ans}
                    onChange={(e) => {
                      const next = [...correctAnswerList];
                      next[idx] = e.target.value;
                      setCorrectAnswerList(next);
                    }}
                  />
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      pendingFilePickRef.current = {
                        type: 'correctBlank',
                        index: idx,
                      };
                      window.open(
                        '/file-manager-popup',
                        'FileManager',
                        'width=1200,height=800',
                      );
                    }}
                    sx={{ minWidth: 100, height: 40 }}
                  >
                    Chọn file
                  </Button>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() =>
                      setCorrectAnswerList((p) => p.filter((_, i) => i !== idx))
                    }
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setCorrectAnswerList((p) => [...p, ''])}
                sx={{ mt: 1 }}
              >
                Thêm đáp án
              </Button>
            </>
          )}

          {/* Đáp án đúng (một giá trị): text hoặc file */}
          {TYPES_SINGLE_ANSWER.includes(sectionQuestionType) && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Đáp án đúng
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Nhập đáp án đúng (text)"
                value={correctAnswerSingle}
                onChange={(e) => setCorrectAnswerSingle(e.target.value)}
                sx={{ mb: 2 }}
              />
              <FilePicker
                label="Hoặc nhập URL / chọn file làm đáp án đúng"
                value={correctAnswerSingle}
                onChange={(url) => setCorrectAnswerSingle(url)}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQuestionDialog(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handleAddQuestionToSection}
            disabled={saving}
          >
            Thêm câu hỏi
          </Button>
        </DialogActions>
      </Dialog>

      {ConfirmDialog}
    </Box>
  );
}
