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
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  MenuBook as MenuBookIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { quizService } from '../../services/quiz.service';
import { courseService } from '../../services/course.service';
import { useConfirm } from '../../components/ConfirmDialog';
import { FilePicker } from '../../components/FilePicker';
import { RichEditor } from '../../components/RichEditor';
import { toast } from '../../utils/toast';
import type { Quiz, Course, Section } from '../../types';
import type { QuestionType, SectionType } from '../../types';
import type { SectionDto, QuestionDto } from '../../types/dto';

const TYPES_WITH_OPTIONS: QuestionType[] = [
  'multiple-choice',
  'picture-choice',
  'reading-mcq',
];
const TYPES_FILL_BLANK: QuestionType[] = ['fill-blank', 'dropdown-choice'];
const TYPES_SINGLE_ANSWER: QuestionType[] = [
  'fill-sentence',
  'word-order',
  'word-bank',
  'listening',
  'paragraph-fill',
];
const TYPES_NEED_AUDIO: QuestionType[] = [
  'listening',
  'pronunciation',
  'picture-choice',
  'fill-blank',
  'multiple-choice',
  'drag-classify',
];
const TYPES_NEED_VIDEO: QuestionType[] = ['video-recording', 'picture-choice'];
const TYPES_NEED_IMAGE: QuestionType[] = ['picture-choice', 'multiple-choice'];

// Section fields theo kiểu câu hỏi (gen khác nhau)
const SECTION_NEED_PASSAGE: QuestionType[] = [
  'reading-mcq',
  'paragraph-fill',
  'fill-blank',
  'word-order'
];
const SECTION_NEED_WORD_BANK: QuestionType[] = ['word-bank', 'paragraph-fill'];
const SECTION_NEED_CATEGORIES: QuestionType[] = ['drag-classify'];

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
  { value: 'multiple-choice', label: 'Multiple choice' },
  { value: 'dropdown-choice', label: 'Dropdown choice' },
  { value: 'fill-sentence', label: 'Fill sentence' },
  { value: 'fill-blank', label: 'Fill blank' },
  { value: 'word-order', label: 'Word order' },
  { value: 'word-bank', label: 'Word bank' },
  { value: 'listening', label: 'Listening' },
  { value: 'reading-mcq', label: 'Reading mcq' },
  { value: 'paragraph-fill', label: 'Paragraph fill' },
  { value: 'picture-choice', label: 'Picture choice' },
  { value: 'pronunciation', label: 'Pronunciation' },
  { value: 'writing', label: 'Writing' },
  { value: 'video-recording', label: 'Video recording' },
  { value: 'drag-classify', label: 'Drag & classify' },
];

export default function AdminQuizSectionEdit() {
  const { quizId, sectionId } = useParams<{
    quizId: string;
    sectionId: string;
  }>();
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirm();
  const isNew = sectionId === 'new';

  const [quiz, setQuiz] = useState<Quiz | null>(null);
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
    if (!quizId) return;
    let cancelled = false;
    setLoading(true);
    // Explicitly cast quizId to string
    const qId = quizId as string;

    Promise.all([quizService.getQuizById(qId), courseService.getAllCourse()])
      .then(([quizData, coData]) => {
        if (!cancelled) {
          setQuiz(quizData);
          setCourses(coData);
          if (!isNew && sectionId) {
            const section = quizData.sections?.find((s) => s._id === sectionId);
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
            'Failed to load data';
          toast.error(String(msg));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [quizId, sectionId, isNew]);

  const currentSection: Section | undefined =
    !isNew && sectionId && quiz
      ? quiz.sections?.find((s) => s._id === sectionId)
      : undefined;

  const handleSaveSection = async () => {
    if (!quizId || !sectionForm.title.trim()) {
      toast.error('Please enter section title');
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
        passage: sectionForm.passage || undefined,
        audioUrl: sectionForm.audioUrl.trim() || undefined,
        videoUrl: sectionForm.videoUrl.trim() || undefined,
        imageUrl: sectionForm.imageUrl.trim() || undefined,
        wordBank: wordBank.length ? wordBank : undefined,
      };

      if (isNew) {
        await quizService.addSection(quizId, dto);
        toast.success(
          'Created section. You can add questions on the next page.',
        );
        const updated = await quizService.getQuizById(quizId);
        const newSection =
          updated.sections?.find((s) => s.title === sectionForm.title.trim()) ??
          updated.sections?.slice(-1)[0];
        if (newSection?._id) {
          navigate(`/admin/quizzes/${quizId}/sections/${newSection._id}`);
        } else {
          navigate(`/admin/quizzes/${quizId}`);
        }
      } else if (sectionId) {
        await quizService.updateSection(quizId, sectionId, dto);
        toast.success('Updated section');
        const updated = await quizService.getQuizById(quizId);
        setQuiz(updated);
        // Navigate if title changed
        const updatedSection = updated.sections?.find(
          (s) => s._id === sectionId,
        );
        if (updatedSection && updatedSection._id !== sectionId) {
          navigate(`/admin/quizzes/${quizId}/sections/${updatedSection._id}`, {
            replace: true,
          });
        }
      }
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Failed to save section';
        toast.error(String(msg));
      } else {
        toast.error('Failed to save section');
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

      const mcqTypes = ['multiple-choice', 'reading-mcq', 'picture-choice'];
      if (mcqTypes.includes(sectionQuestionType)) {
         const correct = correctAnswerList.map((s) => s.trim()).filter(Boolean);
         if (correct.length > 0) {
           base.correctAnswer = correct;
         } else if (correctAnswerSingle.trim()) {
           base.correctAnswer = [correctAnswerSingle.trim()];
         }
      } else {
        if (correctAnswerSingle.trim())
          base.correctAnswer = [correctAnswerSingle.trim()];
      }
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
    if (!quizId || !sectionId || sectionId === 'new') return;
    if (!questionForm.title.trim()) {
      toast.error('Please enter question content');
      return;
    }
    const dto = buildQuestionDto();
    if (
      TYPES_WITH_OPTIONS.includes(sectionQuestionType) &&
      (!dto.options?.length || !dto.correctAnswer?.length)
    ) {
      toast.error('Please add at least one option and select the correct answer');
      return;
    }
    if (
      TYPES_FILL_BLANK.includes(sectionQuestionType) &&
      !dto.correctAnswer?.length
    ) {
      toast.error('Please add at least one correct answer');
      return;
    }
    try {
      setSaving(true);
      let updated: Quiz;
      if (editingQuestionId) {
        updated = await quizService.updateQuestion(
          quizId,
          sectionId,
          editingQuestionId,
          dto,
        );
        toast.success('Updated question successfully');
      } else {
        updated = await quizService.addQuestion(quizId, sectionId, dto);
        toast.success('Added question successfully');
      }
      setQuiz(updated);
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
            ? 'Failed to update question'
            : 'Failed to add question');
        toast.error(String(msg));
      } else {
        toast.error(
          editingQuestionId
            ? 'Failed to update question'
            : 'Failed to add question',
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveQuestion = async (questionId: string) => {
    if (!quizId || !sectionId || sectionId === 'new') return;
    const ok = await confirm({
      title: 'Confirm delete question',
      message: 'Are you sure you want to delete this question?',
      confirmText: 'Delete',
      confirmColor: 'error',
    });
    if (!ok) return;
    try {
      setSaving(true);
      const updated = await quizService.removeQuestion(
        quizId,
        sectionId,
        questionId,
      );
      setQuiz(updated);
      toast.success('Deleted question successfully');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Failed to delete question';
        toast.error(String(msg));
      } else {
        toast.error('Failed to delete question');
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

  if (loading || !quizId) {
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
          Back
        </Button>
        <Typography color="text.secondary">Quiz not found.</Typography>
      </Box>
    );
  }

  const courseName =
    courses.find((c) => c._id === quiz.courseId)?.name ?? 'N/A';

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/admin/quizzes/${quiz?._id}`)}
        sx={{ mb: 2 }}
      >
        Back
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <MenuBookIcon
              sx={{ fontSize: 32, color: 'secondary.main', mr: 2 }}
            />
            <Box>
              <Typography variant="h6">{quiz.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {courseName}{' '}
                {isNew
                  ? '· Add new section'
                  : `· Edit section: ${currentSection?.title ?? ''}`}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 2 }}>
        {isNew
          ? 'Section info (choose section type & question type first)'
          : 'Section info'}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Section type</InputLabel>
            <Select
              value={sectionForm.sectionType}
              label="Section type"
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
            <InputLabel>Question type</InputLabel>
            <Select
              value={sectionForm.questionType}
              label="Question type"
              disabled={!isNew && (currentSection?.questions?.length ?? 0) > 0}
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
            {!isNew && (currentSection?.questions?.length ?? 0) > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Question type cannot be changed once the section has questions.
              </Typography>
            )}
            {!isNew && (currentSection?.questions?.length ?? 0) === 0 && (
              <Typography
                variant="caption"
                color="warning.main"
                sx={{ mt: 0.5 }}
              >
                You can still change the question type since there are no questions yet.
              </Typography>
            )}
          </FormControl>
          <TextField
            fullWidth
            label="Section name"
            value={sectionForm.title}
            onChange={(e) =>
              setSectionForm((f) => ({ ...f, title: e.target.value }))
            }
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description"
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
            <RichEditor
              label={
                sectionForm.questionType === 'paragraph-fill'
                  ? 'Passage (type ____ for each blank)'
                  : 'Passage'
              }
              value={sectionForm.passage}
              onChange={(val) =>
                setSectionForm((f) => ({ ...f, passage: val }))
              }
              placeholder="Enter passage content..."
            />
          )}
          <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FilePicker
              label="Audio URL (section)"
              value={sectionForm.audioUrl}
              onChange={(url) =>
                setSectionForm((f) => ({ ...f, audioUrl: url }))
              }
            />
            <FilePicker
              label="Video URL (section)"
              value={sectionForm.videoUrl}
              onChange={(url) =>
                setSectionForm((f) => ({ ...f, videoUrl: url }))
              }
            />
            <FilePicker
              label="Image URL (section)"
              value={sectionForm.imageUrl}
              onChange={(url) =>
                setSectionForm((f) => ({ ...f, imageUrl: url }))
              }
            />
          </Box>
          {SECTION_NEED_WORD_BANK.includes(sectionForm.questionType) && (
            <TextField
              fullWidth
              label="Word bank (separated by comma or newline)"
              value={sectionForm.wordBankStr}
              onChange={(e) =>
                setSectionForm((f) => ({ ...f, wordBankStr: e.target.value }))
              }
              multiline
              rows={2}
            />
          )}
          {SECTION_NEED_CATEGORIES.includes(sectionForm.questionType) && (
            <TextField
              fullWidth
              label="Categories / Groups — LEAVE EMPTY for Audio-match mode"
              value={sectionForm.wordBankStr}
              onChange={(e) =>
                setSectionForm((f) => ({ ...f, wordBankStr: e.target.value }))
              }
              multiline
              rows={2}
              helperText={
                sectionForm.wordBankStr.trim()
                  ? '✅ Dạng 1 (phân cột): mỗi category là 1 cột. VD: IN, ON, AT. Mỗi câu hỏi = 1 từ cần xếp vào cột.'
                  : '✅ Dạng 2 (audio match): để trống. Mỗi câu hỏi = 1 ô audio (nhập Audio URL + Correct category = từ đúng). Word bank tự tạo từ các đáp án.'
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Phần câu hỏi: chỉ khi đã tạo section (sửa phần), không cho thêm câu hỏi lúc tạo phần mới */}
      {!isNew && (
        <>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Questions in section (type:{' '}
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
            Add question
          </Button>
          {(currentSection?.questions?.length ?? 0) === 0 ? (
            <Typography color="text.secondary">
              No questions in this section yet.
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
                    primary={q.title || '(No title)'}
                    secondary={`Points: ${q.point}`}
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
          {saving ? 'Saving...' : isNew ? 'Create section' : 'Save section'}
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate(`/admin/quizzes/${quiz?._id}`)}
        >
          Cancel
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
          {editingQuestionId ? 'Edit question' : 'Add question'} — Type:{' '}
          {QUESTION_TYPE_OPTIONS.find((o) => o.value === sectionQuestionType)
            ?.label ?? sectionQuestionType}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {sectionQuestionType === 'drag-classify' ? (
              <TextField
                fullWidth
                label={sectionForm.wordBankStr.trim() ? "Item label (text to drag)" : "Label (optional for audio mode)"}
                value={questionForm.title}
                onChange={(e) =>
                  setQuestionForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder={sectionForm.wordBankStr.trim() ? "e.g. home, a park, Madrid..." : "e.g. Item 1 (or leave empty)"}
                helperText={sectionForm.wordBankStr.trim() 
                  ? "Mode 1 (Classify): This is the text displayed on the draggable piece." 
                  : "Mode 2 (Audio Match): Usually left empty. If filled, it appears below the speaker icon."}
              />
            ) : (
              <RichEditor
                label={
                  TYPES_FILL_BLANK.includes(sectionQuestionType)
                    ? 'Question content (type ____ for each blank)'
                    : 'Question content'
                }
                value={questionForm.title}
                onChange={(val) =>
                  setQuestionForm((f) => ({ ...f, title: val }))
                }
                placeholder="Enter question content..."
              />
            )}
          </Box>
          <TextField
            fullWidth
            type="number"
            label="Points"
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
                Question media URL (section type — choose from file manager)
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {TYPES_NEED_AUDIO.includes(sectionQuestionType) && (
                  <FilePicker
                    label="Audio URL"
                    value={questionForm.audioUrl ?? ''}
                    onChange={(url) =>
                      setQuestionForm((f) => ({ ...f, audioUrl: url }))
                    }
                  />
                )}
                {TYPES_NEED_VIDEO.includes(sectionQuestionType) && (
                  <FilePicker
                    label="Video URL"
                    value={questionForm.videoUrl ?? ''}
                    onChange={(url) =>
                      setQuestionForm((f) => ({ ...f, videoUrl: url }))
                    }
                  />
                )}
                {TYPES_NEED_IMAGE.includes(sectionQuestionType) && (
                  <FilePicker
                    label="Image URL"
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
              label="Word bank (separated by comma or newline)"
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
          {(TYPES_WITH_OPTIONS.includes(sectionQuestionType) || sectionQuestionType === 'dropdown-choice') && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Answers (click &quot;Add answer&quot; then enter text or select
                file)
              </Typography>
              {sectionQuestionType === 'dropdown-choice' && (
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  Hint: Using multiple blanks? Add options for each blank in order. Use | or , to separate options within the same blank. E.g.: am | is | are
                </Typography>
              )}
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
                    placeholder="Answer content or leave empty if using file"
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
                    Select file
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
                Add answer
              </Button>
              {!TYPES_FILL_BLANK.includes(sectionQuestionType) && !['drag-classify'].includes(sectionQuestionType) && (
                <>
                  <Typography variant="subtitle2" sx={{ mt: 1, mb: 1 }}>
                    Correct answer(s)
                  </Typography>
                  {['multiple-choice', 'reading-mcq', 'picture-choice'].includes(sectionQuestionType) ? (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        Tích chọn tất cả các đáp án đúng bên dưới:
                      </Typography>
                      {optionsList.filter(Boolean).map((opt, i) => {
                        const isChecked = Array.isArray(correctAnswerList) 
                          ? correctAnswerList.includes(opt)
                          : correctAnswerSingle === opt;
                        
                        return (
                          <FormControlLabel
                            key={i}
                            control={
                              <Checkbox
                                size="small"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setCorrectAnswerList(prev => [...prev, opt]);
                                    setCorrectAnswerSingle(opt); 
                                  } else {
                                    setCorrectAnswerList(prev => prev.filter(a => a !== opt));
                                  }
                                }}
                              />
                            }
                            label={opt.length > 50 ? opt.slice(0, 50) + '…' : opt}
                            sx={{ display: 'block' }}
                          />
                        );
                      })}
                      <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                         Lưu ý: Nếu bạn chọn từ 2 đáp án trở lên, câu hỏi sẽ tự động hiển thị dạng Checkbox (chọn nhiều).
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>Select from the answers above</InputLabel>
                        <Select
                          value={
                            optionsList.includes(correctAnswerSingle)
                              ? correctAnswerSingle
                              : ''
                          }
                          label="Select from the answers above"
                          onChange={(e) => setCorrectAnswerSingle(e.target.value)}
                        >
                          <MenuItem value="">— Select —</MenuItem>
                          {optionsList.filter(Boolean).map((opt, i) => (
                            <MenuItem key={i} value={opt}>
                              {opt.length > 50 ? opt.slice(0, 50) + '…' : opt}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FilePicker
                        label="Or enter URL / select file as correct answer"
                        value={
                          optionsList.includes(correctAnswerSingle)
                            ? ''
                            : correctAnswerSingle
                        }
                        onChange={(url) => setCorrectAnswerSingle(url)}
                      />
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* Đáp án đúng (fill-blank): thêm từng đáp án cho mỗi chỗ trống */}
          {TYPES_FILL_BLANK.includes(sectionQuestionType) && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Correct answers for each blank (add one by one, each can be text
                or file)
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
                    placeholder={`Answer for blank ${idx + 1}`}
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
                    Select file
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
                Add answer
              </Button>
            </>
          )}

          {/* Đáp án đúng (một giá trị): text hoặc file */}
          {TYPES_SINGLE_ANSWER.includes(sectionQuestionType) && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Correct answer
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="Enter correct answer (text)"
                value={correctAnswerSingle}
                onChange={(e) => setCorrectAnswerSingle(e.target.value)}
                sx={{ mb: 2 }}
              />
              <FilePicker
                label="Or enter URL / select file as correct answer"
                value={correctAnswerSingle}
                onChange={(url) => setCorrectAnswerSingle(url)}
              />
            </>
          )}

          {/* Drag-classify: chọn category đúng cho item này */}
          {sectionQuestionType === 'drag-classify' && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {sectionForm.wordBankStr.trim() ? "Correct category / Group name" : "Correct word or Image (for word bank)"}
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder={sectionForm.wordBankStr.trim() ? "e.g. IN" : "e.g. take"}
                value={correctAnswerSingle}
                onChange={(e) => setCorrectAnswerSingle(e.target.value)}
                sx={{ mb: 1 }}
                helperText={sectionForm.wordBankStr.trim()
                  ? "Must match one of the categories defined in the section above."
                  : "This word or image will appear in the bank for students to drag into this audio slot."}
              />
              {!sectionForm.wordBankStr.trim() && (
                <FilePicker
                  label="Select image as answer (for Audio-match mode)"
                  value={correctAnswerSingle}
                  onChange={(url) => setCorrectAnswerSingle(url)}
                />
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQuestionDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddQuestionToSection}
            disabled={saving}
          >
            {editingQuestionId ? 'Save question' : 'Add question'}
          </Button>
        </DialogActions>
      </Dialog>

      {ConfirmDialog}
    </Box>
  );
}
