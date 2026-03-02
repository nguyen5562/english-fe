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
  resolveUrl,
} from '../utils/questionHelpers';
import { toast } from '../utils/toast';
import { useUIStore } from '../store/ui.store';

export default function QuizDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const userId = user?._id;
  const setQuizLocked = useUIStore((s) => s.setQuizLocked);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showResult, setShowResult] = useState(false);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    maxScore: number;
    percentage: number;
  } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [, setStartTime] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id || !userId) return;
    let cancelled = false;
    setLoading(true);

    const fetchData = async () => {
      try {
        const [quizData, attempts] = await Promise.all([
          quizService.getQuizById(id),
          quizAttemptService.getQuizAttemptByUserId(userId),
        ]);

        if (cancelled) return;

        // Check for existing completed attempt for this quiz
        const pastAttempt = attempts.find(
          (a) =>
            (typeof a.quizId === 'object'
              ? (a.quizId as any)._id
              : a.quizId) === id &&
            (a.status === 'completed' || a.submittedAt != null),
        );

        if (pastAttempt) {
          setQuiz(quizData);
          const allQuestions = (quizData.sections ?? []).flatMap(
            (s) => s.questions ?? [],
          );

          const userAnswers = pastAttempt.answers.reduce(
            (acc, curr) => ({ ...acc, [curr.questionId]: curr.answer }),
            {} as Record<string, string | string[]>,
          );
          setAnswers(userAnswers);

          const { score: totalScore, maxScore } = calculateScore(
            allQuestions,
            userAnswers,
          );
          const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
          setResult({ score: totalScore, maxScore, percentage });
          setShowResult(true);
          setResultDialogOpen(false);
          setQuizLocked(false);
          toast.info('Bạn đã hoàn thành bài quiz này trước đó.');
        } else {
          setQuiz(quizData);
          setTimeRemaining((quizData.timeLimit ?? 60) * 60);
          setStartTime(new Date());
          const initial: Record<string, string | string[]> = {};
          (quizData.sections ?? []).forEach((section) => {
            (section.questions ?? []).forEach((q) => {
              initial[q._id] = (q.correctAnswer?.length ?? 0) > 0 ? [] : '';
            });
          });
          setAnswers(initial);
          setQuizLocked(true);
        }
      } catch (e: unknown) {
        if (!cancelled && axios.isAxiosError(e)) {
          const msg =
            (e.response?.data as { message?: string })?.message ??
            e.response?.statusText ??
            'Không thể tải quiz';
          toast.error(String(msg));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
      setQuizLocked(false);
    };
  }, [id, userId]);

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

    // Prevent closing/refreshing tab
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!showResult) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [quiz, showResult, timeRemaining]);

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
      return {
        questionId: q._id,
        answer: arr,
      };
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
      setQuizLocked(false);
      setResult({ score: totalScore, maxScore, percentage });
      setShowResult(true);
      setResultDialogOpen(true);
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
      if (showResult) {
        navigate('/quizzes');
      } else {
        handleSubmit();
      }
    }
  };

  const handleBackNavigation = () => {
    if (!showResult && quiz) {
      setExitDialogOpen(true);
    } else {
      navigate('/quizzes');
    }
  };

  const handleConfirmExit = () => {
    setExitDialogOpen(false);
    handleSubmit();
  };

  const renderQuestionInner = (
    question: Question,
    section: Section,
    index: number,
  ) => {
    const effectiveType: QuestionType | undefined =
      (question as Question & { type?: QuestionType }).type ??
      section.questionType;
    const answerValue = answers[question._id] ?? '';
    const value = Array.isArray(answerValue)
      ? answerValue[0] || ''
      : (answerValue as string);
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
            sx={{
              flexDirection:
                effectiveType === 'picture-choice' ? 'row' : 'column',
              flexWrap: 'wrap',
              gap: effectiveType === 'picture-choice' ? 2 : 0,
            }}
          >
            {(question.options ?? []).map((option, idx) => (
              <FormControlLabel
                key={idx}
                value={option}
                labelPlacement={
                  effectiveType === 'picture-choice' ? 'top' : 'end'
                }
                control={
                  <Radio
                    disabled={disabled}
                    sx={{
                      mt: effectiveType === 'picture-choice' ? 1 : 0,
                    }}
                  />
                }
                label={
                  effectiveType === 'picture-choice' ? (
                    <Box
                      component="img"
                      src={resolveUrl(option)}
                      alt={`Option ${idx + 1}`}
                      sx={{
                        width: '180px',
                        height: '140px',
                        objectFit: 'cover',
                        border:
                          value === option
                            ? '3px solid #1976d2'
                            : '1px solid #ddd',
                        borderRadius: 2,
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'scale(1.02)',
                          borderColor: 'primary.main',
                        },
                      }}
                    />
                  ) : (
                    option
                  )
                }
                sx={{
                  ml: effectiveType === 'picture-choice' ? 0 : undefined,
                  mr: effectiveType === 'picture-choice' ? 0 : 2,
                  alignItems: 'center',
                }}
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

  const renderQuestion = (
    question: Question,
    section: Section,
    index: number,
  ) => {
    const content = renderQuestionInner(question, section, index);

    if (!showResult) return content;

    const effectiveType =
      (question as Question & { type?: QuestionType }).type ??
      section.questionType;

    // Skip feedback for subjective types
    if (
      ['pronunciation', 'video-recording', 'writing'].includes(
        effectiveType || '',
      )
    ) {
      return content;
    }

    // Validation Logic
    const isCorrect = (() => {
      const correctArr = question.correctAnswer || [];
      if (correctArr.length === 0) return null;

      const val = answers[question._id];
      const userArr = Array.isArray(val)
        ? val
        : val != null && val !== ''
          ? [String(val)]
          : [];

      // Sort both arrays for checking set equality (ignoring order)
      const sortedUser = [...userArr].sort();
      const sortedCorrect = [...correctArr].sort();

      return JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);
    })();

    if (isCorrect === null) return content;

    return (
      <Box sx={{ position: 'relative', mb: 3 }}>
        <Box
          sx={{
            p: 2,
            border: '1px solid',
            borderColor:
              isCorrect === true
                ? 'success.main'
                : isCorrect === false
                  ? 'error.main'
                  : 'divider',
            borderRadius: 2,
            bgcolor:
              isCorrect === true
                ? 'rgba(46, 125, 50, 0.04)'
                : isCorrect === false
                  ? 'rgba(211, 47, 47, 0.04)'
                  : 'transparent',
            // Neutralize the mb:3 of the inner component
            '& > div': { mb: 0 },
          }}
        >
          {content}

          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: '1px dashed',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="body1"
              sx={{
                fontWeight: 'bold',
                color: isCorrect ? 'success.main' : 'error.main',
                mb: 0.5,
              }}
            >
              {isCorrect ? 'Chính xác' : 'Chưa chính xác'}
            </Typography>
            {!isCorrect && (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}
                >
                  Đáp án đúng:
                </Typography>
                {effectiveType === 'picture-choice' ? (
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    {(question.correctAnswer || []).map((url, i) => (
                      <Box
                        key={i}
                        component="img"
                        src={resolveUrl(url)}
                        alt={`Đáp án đúng ${i + 1}`}
                        sx={{
                          width: 100,
                          height: 80,
                          objectFit: 'cover',
                          borderRadius: 1,
                          border: '1px solid #ddd',
                        }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body1" sx={{ color: 'text.primary' }}>
                    {(question.correctAnswer || []).join('; ')}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    );
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
        onClick={handleBackNavigation}
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
            {!showResult && (
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
            )}
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
                  {isLastSection
                    ? showResult
                      ? 'Về danh sách'
                      : 'Nộp bài'
                    : 'Phần tiếp'}
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={resultDialogOpen}
        onClose={() => setResultDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
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
          <Button onClick={() => setResultDialogOpen(false)} color="inherit">
            Xem lại bài làm
          </Button>
          <Button onClick={() => navigate('/quizzes')} variant="contained">
            Quay lại danh sách quiz
          </Button>
        </DialogActions>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <Dialog open={exitDialogOpen} onClose={() => setExitDialogOpen(false)}>
        <DialogTitle>Xác nhận thoát</DialogTitle>
        <DialogContent>
          <Typography>
            Bạn đang trong quá trình làm bài quiz. Nếu thoát ra bây giờ, hệ
            thống sẽ tự động nộp bài với những câu bạn đã làm. Bạn có chắc chắn
            muốn nộp bài và thoát?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExitDialogOpen(false)} color="inherit">
            Tiếp tục làm bài
          </Button>
          <Button
            onClick={handleConfirmExit}
            color="primary"
            variant="contained"
          >
            Nộp bài và thoát
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
