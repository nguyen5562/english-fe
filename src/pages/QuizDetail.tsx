import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { quizService } from '../services/quiz.service';
import { quizAttemptService } from '../services/quiz-attempt.service';
import { useAuthStore } from '../store/auth.store';
import type { Quiz, Question, QuestionType, Section } from '../types';
import {
  sectionTypeMap,
  renderSectionMedia,
  renderSectionWordBank,
  calculateScore,
  renderQuestionMedia,
  renderQuestionWordBank,
} from '../utils/questionHelpers';
import { toast } from '../utils/toast';

export default function QuizDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const userId = user?._id;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    maxScore: number;
    percentage: number;
  } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [, setStartTime] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    quizService
      .getQuizById(id)
      .then((data) => {
        if (!cancelled) {
          setQuiz(data);
          setTimeRemaining((data.timeLimit ?? 60) * 60);
          setStartTime(new Date());
          const initial: Record<string, string | string[]> = {};
          (data.sections ?? []).forEach((section) => {
            (section.questions ?? []).forEach((q) => {
              initial[q._id] = (q.correctAnswer?.length ?? 0) > 0 ? [] : '';
            });
          });
          setAnswers(initial);
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

  useEffect(() => {
    if (!quiz || showResult || timeRemaining <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          handleSubmitRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [quiz, showResult]);

  const handleSubmitRef = useRef<() => void>(() => {});

  const allQuestions = (quiz?.sections ?? []).flatMap(
    (s) => s.questions ?? [],
  ) as Question[];
  const currentSection = quiz?.sections?.[currentSectionIndex];
  const totalQuestions = allQuestions.length;
  const questionsCompleted = (quiz?.sections ?? [])
    .slice(0, currentSectionIndex)
    .reduce((sum, s) => sum + (s.questions?.length ?? 0), 0);
  const progress =
    totalQuestions > 0
      ? ((questionsCompleted + (currentSection?.questions?.length ?? 0)) /
          totalQuestions) *
        100
      : 0;

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!quiz || !userId || submitting) return;
    setSubmitting(true);
    const answersPayload = allQuestions.map((q) => {
      const a = answers[q._id];
      const arr = Array.isArray(a) ? a : a != null ? [String(a)] : [];
      return { questionId: q._id, answer: arr };
    });

    const { score: totalScore, maxScore } = calculateScore(
      allQuestions,
      answers,
    );
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

    try {
      const attempt = await quizAttemptService.createQuizAttempt({
        quizId: quiz._id,
        userId,
      });
      await quizAttemptService.submitQuiz(attempt._id, {
        answers: answersPayload,
      });
      setResult({ score: totalScore, maxScore, percentage });
      setShowResult(true);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Không thể nộp bài';
        toast.error(String(msg));
      } else {
        toast.error('Không thể nộp bài');
      }
    } finally {
      setSubmitting(false);
    }
  };

  handleSubmitRef.current = handleSubmit;

  const handleNext = () => {
    if (!quiz) return;
    if (currentSectionIndex < (quiz.sections?.length ?? 1) - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const renderQuestion = (
    question: Question,
    section: Section,
    index: number,
  ) => {
    const effectiveType: QuestionType | undefined =
      (question as Question & { type?: QuestionType }).type ??
      section.questionType;
    const answerValue = answers[question._id] ?? '';
    const value = Array.isArray(answerValue) ? '' : (answerValue as string);
    const disabled = showResult || submitting;

    const questionNumber = (
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
        Câu {index + 1}
      </Typography>
    );

    const renderMultipleChoice = () => (
      <Box sx={{ mb: 3 }}>
        {questionNumber}
        {renderQuestionMedia(question)}
        {renderQuestionWordBank(question)}
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend">{question.title}</FormLabel>
          <RadioGroup
            value={value}
            onChange={(e) => handleAnswerChange(question._id, e.target.value)}
          >
            {(question.options ?? []).map((option, idx) => (
              <FormControlLabel
                key={idx}
                value={option}
                control={<Radio disabled={disabled} />}
                label={option}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </Box>
    );

    switch (effectiveType) {
      case 'multiple-choice':
      case 'reading-mcq':
      case 'picture-choice':
        return renderMultipleChoice();
      case 'listening':
        return (
          <Box sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            {question.options && question.options.length > 0
              ? (() => {
                  return (
                    <FormControl component="fieldset" fullWidth>
                      <FormLabel component="legend">{question.title}</FormLabel>
                      <RadioGroup
                        value={value}
                        onChange={(e) =>
                          handleAnswerChange(question._id, e.target.value)
                        }
                      >
                        {(question.options ?? []).map((option, idx) => (
                          <FormControlLabel
                            key={idx}
                            value={option}
                            control={<Radio disabled={disabled} />}
                            label={option}
                          />
                        ))}
                      </RadioGroup>
                    </FormControl>
                  );
                })()
              : (() => (
                  <>
                    <Typography variant="body1" gutterBottom>
                      {question.title}
                    </Typography>
                    <TextField
                      fullWidth
                      variant="outlined"
                      value={value}
                      onChange={(e) =>
                        handleAnswerChange(question._id, e.target.value)
                      }
                      placeholder="Nhập câu trả lời"
                      disabled={disabled}
                    />
                  </>
                ))()}
          </Box>
        );
      case 'fill-sentence':
      case 'word-order':
      case 'word-bank':
      case 'writing':
        return (
          <Box sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            <Typography variant="body1" gutterBottom>
              {question.title}
            </Typography>
            <TextField
              fullWidth
              multiline={effectiveType === 'writing'}
              rows={effectiveType === 'writing' ? 6 : 2}
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Nhập câu trả lời"
              disabled={disabled}
            />
          </Box>
        );
      case 'fill-blank': {
        const blanks = question.title.split('____');
        const answerArray = Array.isArray(answerValue)
          ? answerValue
          : typeof answerValue === 'string' && answerValue
            ? answerValue.split(',').map((s) => s.trim())
            : Array(blanks.length - 1).fill('');
        return (
          <Box sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 1,
              }}
            >
              {blanks.map((part, idx) => (
                <Box
                  key={idx}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                >
                  <Typography component="span">{part}</Typography>
                  {idx < blanks.length - 1 && (
                    <TextField
                      size="small"
                      value={answerArray[idx] ?? ''}
                      onChange={(e) => {
                        const next = [...answerArray];
                        next[idx] = e.target.value;
                        handleAnswerChange(question._id, next);
                      }}
                      sx={{ width: 100 }}
                      placeholder="..."
                      disabled={disabled}
                    />
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        );
      }
      case 'paragraph-fill':
        return (
          <Box sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Điền từ vào chỗ trống:
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Nhập từ cần điền"
              disabled={disabled}
            />
          </Box>
        );
      case 'dropdown-choice': {
        const parts = question.title.split('____');
        const hasBlank = parts.length > 1;
        return (
          <Box sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            {hasBlank ? (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                {parts.map((part, idx) => (
                  <Box
                    key={idx}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    <Typography component="span" variant="body1">
                      {part}
                    </Typography>
                    {idx < parts.length - 1 && (
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                          value={value || ''}
                          onChange={(e) =>
                            handleAnswerChange(question._id, e.target.value)
                          }
                          displayEmpty
                          disabled={disabled}
                        >
                          <MenuItem value="" disabled>
                            <em></em>
                          </MenuItem>
                          {(question.options ?? []).map((opt, i) => (
                            <MenuItem key={i} value={opt}>
                              {opt}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  </Box>
                ))}
              </Box>
            ) : (
              <FormControl fullWidth>
                <InputLabel>{question.title}</InputLabel>
                <Select
                  value={value || ''}
                  onChange={(e) =>
                    handleAnswerChange(question._id, e.target.value)
                  }
                  label={question.title}
                  disabled={disabled}
                >
                  {(question.options ?? []).map((opt, i) => (
                    <MenuItem key={i} value={opt}>
                      {opt}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        );
      }
      case 'pronunciation':
      case 'video-recording':
        return (
          <Box sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            <Typography variant="body1" gutterBottom>
              {question.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Nhập câu trả lời của bạn (mô tả hoặc nội dung)
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Nhập câu trả lời"
              disabled={disabled}
            />
          </Box>
        );
      default:
        return (
          <Box sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            <Typography variant="body1" gutterBottom>
              {question.title}
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Nhập câu trả lời"
              disabled={disabled}
            />
          </Box>
        );
    }
  };

  if (loading || !id) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 400,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!quiz) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/quizzes')}
          sx={{ mb: 2 }}
        >
          Quay lại
        </Button>
        <Typography color="text.secondary">
          Không tìm thấy quiz hoặc đã hết hạn.
        </Typography>
      </Box>
    );
  }

  const isLastSection =
    currentSectionIndex === (quiz.sections?.length ?? 1) - 1;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/quizzes')}
        sx={{ mb: 2 }}
      >
        Quay lại
      </Button>

      <Card>
        <CardContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <Typography variant="h5">{quiz.title}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimerIcon />
              <Typography
                variant="h6"
                color={timeRemaining < 60 ? 'error.main' : 'inherit'}
              >
                {String(minutes).padStart(2, '0')}:
                {String(seconds).padStart(2, '0')}
              </Typography>
            </Box>
          </Box>

          {currentSection && (
            <>
              <Box sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <Typography variant="h6">
                    Phần {currentSectionIndex + 1}: {currentSection.title}
                  </Typography>
                  {currentSection.sectionType && (
                    <Chip
                      label={
                        sectionTypeMap[currentSection.sectionType]?.label ??
                        currentSection.sectionType
                      }
                      size="small"
                      color={
                        sectionTypeMap[currentSection.sectionType]?.color as
                          | 'primary'
                          | 'default'
                      }
                    />
                  )}
                </Box>
                {currentSection.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    {currentSection.description}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  Phần {currentSectionIndex + 1} / {quiz.sections?.length ?? 0}{' '}
                  · {currentSection.questions?.length ?? 0} câu hỏi
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ mt: 2, mb: 2 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Tổng tiến độ:{' '}
                {questionsCompleted + (currentSection.questions?.length ?? 0)} /{' '}
                {totalQuestions} câu hỏi
              </Typography>

              <Divider sx={{ my: 2 }} />

              {renderSectionMedia(currentSection) && (
                <Box sx={{ mb: 3 }}>{renderSectionMedia(currentSection)}</Box>
              )}
              {renderSectionWordBank(currentSection) && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ width: '100%', mb: 1 }}>
                    Word Bank:
                  </Typography>
                  {renderSectionWordBank(currentSection)}
                </Box>
              )}

              <Box sx={{ mb: 3 }}>
                {(currentSection.questions ?? []).map((question, index) =>
                  renderQuestion(question, currentSection, index),
                )}
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  variant="outlined"
                  onClick={() =>
                    setCurrentSectionIndex((prev) => Math.max(0, prev - 1))
                  }
                  disabled={currentSectionIndex === 0 || submitting}
                >
                  Phần trước
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={submitting}
                >
                  {isLastSection ? 'Nộp bài' : 'Phần tiếp'}
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showResult} onClose={() => {}} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircleIcon
              sx={{
                color:
                  result && result.percentage >= 60
                    ? 'success.main'
                    : 'warning.main',
                mr: 1,
              }}
            />
            Kết quả bài kiểm tra
          </Box>
        </DialogTitle>
        <DialogContent>
          {result && (
            <Box>
              <Typography
                variant="h4"
                align="center"
                gutterBottom
                color={
                  result.percentage >= 60 ? 'success.main' : 'text.primary'
                }
              >
                {result.percentage.toFixed(1)}%
              </Typography>
              <Typography
                variant="body1"
                align="center"
                color="text.secondary"
                gutterBottom
              >
                Điểm số: {result.score} / {result.maxScore}
              </Typography>
              <Alert
                severity={result.percentage >= 60 ? 'success' : 'info'}
                sx={{ mt: 2 }}
              >
                {result.percentage >= 60
                  ? 'Chúc mừng! Bạn đã hoàn thành bài quiz.'
                  : 'Bạn có thể làm lại để cải thiện điểm số.'}
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/quizzes')} variant="contained">
            Quay lại danh sách quiz
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
