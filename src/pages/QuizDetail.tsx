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
  TextField,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Checkbox,
  FormGroup,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { quizService } from '../services/quiz.service';
import { quizAttemptService } from '../services/quiz-attempt.service';
import { uploadService } from '../services/upload.service';
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
import { parseHTML, parseHTMLWithBlanks } from '../utils/htmlParser';
import { DragClassifySection } from '../components/DragClassifySection';

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

  const [recordingStatus, setRecordingStatus] = useState<
    Record<string, 'idle' | 'recording' | 'recorded'>
  >({});
  const [recordings, setRecordings] = useState<Record<string, string | null>>(
    {},
  );
  const mediaRecordersRef = useRef<Record<string, MediaRecorder | null>>({});

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
          toast.info('You have completed this quiz before.');
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
            'Failed to load quiz';
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

  const startRecording = async (questionId: string, isVideo = false) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Your browser does not support audio or video recording.');
        return;
      }

      const constraints = isVideo
        ? { audio: true, video: true }
        : { audio: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      // For video recording, we want to show a live preview
      if (isVideo) {
        const previewEl = document.getElementById(
          `preview-${questionId}`,
        ) as HTMLVideoElement;
        if (previewEl) {
          previewEl.srcObject = stream;
          previewEl.muted = true; // Avoid feedback loop
          previewEl.play().catch(() => {});
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: isVideo ? 'video/webm;codecs=vp8,opus' : 'audio/webm',
      });
      mediaRecordersRef.current[questionId] = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, {
          type: isVideo ? 'video/webm' : 'audio/webm',
        });
        const url = URL.createObjectURL(blob);

        // Stop all tracks to release camera/mic
        stream.getTracks().forEach((track) => track.stop());

        // Clear preview srcObject
        if (isVideo) {
          const previewEl = document.getElementById(
            `preview-${questionId}`,
          ) as HTMLVideoElement;
          if (previewEl) previewEl.srcObject = null;
        }

        setRecordings((prev) => ({ ...prev, [questionId]: url }));
        setRecordingStatus((prev) => ({ ...prev, [questionId]: 'recorded' }));
      };

      mediaRecorder.start();
      setRecordingStatus((prev) => ({ ...prev, [questionId]: 'recording' }));
    } catch (error) {
      console.error(error);
      toast.error(
        'Unable to start recording. Please check microphone/camera access.',
      );
    }
  };

  const stopRecording = (questionId: string) => {
    const recorder = mediaRecordersRef.current[questionId];
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
    }
  };

  const handleSubmit = async () => {
    if (!quiz || !userId || submitting) return;
    setSubmitting(true);
    const uploadedAnswers = { ...answers };
    let hasUploadError = false;

    // Identify questions that might have recordings
    const mediaQuestions = allQuestions.filter((q) => {
      const qType = (q as any).type as QuestionType | undefined;
      const sectionType = quiz.sections?.find((s) =>
        s.questions?.some((sq) => sq._id === q._id),
      )?.questionType;
      return (
        qType === 'pronunciation' ||
        qType === 'video-recording' ||
        sectionType === 'pronunciation' ||
        sectionType === 'video-recording'
      );
    });

    for (const q of mediaQuestions) {
      const recordingUrl = recordings[q._id];
      if (recordingUrl && recordingUrl.startsWith('blob:')) {
        try {
          const blobResponse = await fetch(recordingUrl);
          const blob = await blobResponse.blob();

          const isVideo = blob.type.startsWith('video/');
          const mediaTypeFolder = isVideo ? 'video' : 'audio';
          const now = new Date();
          const folderDate = `${now.getFullYear()}-${String(
            now.getMonth() + 1,
          ).padStart(2, '0')}`;
          const studentFolder = userId || 'guest';
          const targetPath = `/submissions/${mediaTypeFolder}/${folderDate}/${studentFolder}`;

          const filename = `${q._id}_${Date.now()}.${isVideo ? 'webm' : 'webm'}`;

          const { id: uploadedPath } = await uploadService.uploadFile(
            blob,
            targetPath,
            filename,
          );

          uploadedAnswers[q._id] = uploadedPath;
        } catch (error) {
          console.error('Upload failed for question', q._id, error);
          hasUploadError = true;
        }
      }
    }

    if (hasUploadError) {
      toast.error('Failed to upload audio/video file. Please try again.');
      setSubmitting(false);
      return;
    }

    setAnswers(uploadedAnswers);

    const answersPayload = allQuestions.map((q) => {
      const a = uploadedAnswers[q._id];
      const arr = Array.isArray(a) ? a : a != null ? [String(a)] : [];
      return {
        questionId: q._id,
        answer: arr,
      };
    });

    const { score: totalScore, maxScore } = calculateScore(
      allQuestions,
      uploadedAnswers,
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
          'Failed to submit quiz';
        toast.error(String(msg));
      } else {
        toast.error('Failed to submit quiz');
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
    const answerValue = answers[question._id];
    const value = Array.isArray(answerValue) ? answerValue[0] ?? '' : (answerValue ?? '') as string;
    const values = Array.isArray(answerValue) ? answerValue : (answerValue ? [String(answerValue)] : []);
    const disabled = showResult || submitting;

    const questionNumber = (
      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
        Câu {index + 1}
      </Typography>
    );

    const renderMultipleChoice = () => {
      const isMultiple = (question.correctAnswer?.length ?? 0) > 1;

      const handleToggleOption = (option: string) => {
        let next: string[];
        if (values.includes(option)) {
          next = values.filter((v) => v !== option);
        } else {
          next = [...values, option];
        }
        handleAnswerChange(question._id, next);
      };

      return (
        <Box sx={{ mb: 3 }}>
          {questionNumber}
          {renderQuestionMedia(question)}
          {renderQuestionWordBank(question)}
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">
              <Box component="div" sx={{ '& p': { margin: 0 }, '& *': { display: 'inline' } }}>
                {parseHTML(question.title)}
              </Box>
            </FormLabel>
            
            {isMultiple ? (
              <FormGroup
                sx={{
                  flexDirection: effectiveType === 'picture-choice' ? 'row' : 'column',
                  flexWrap: 'wrap',
                  gap: effectiveType === 'picture-choice' ? 2 : 0,
                  mt: 1
                }}
              >
                {(question.options ?? []).map((option, idx) => (
                  <FormControlLabel
                    key={idx}
                    control={
                      <Checkbox
                        checked={values.includes(option)}
                        onChange={() => handleToggleOption(option)}
                        disabled={disabled}
                        size="small"
                      />
                    }
                    label={
                      effectiveType === 'picture-choice' ? (
                        <Box
                          component="img"
                          src={resolveUrl(option)}
                          alt={`Option ${idx + 1}`}
                          sx={{
                            width: '180px', height: '140px', objectFit: 'cover',
                            border: values.includes(option) ? '3px solid #1976d2' : '1px solid #ddd',
                            borderRadius: 2, transition: 'all 0.2s',
                            '&:hover': { transform: 'scale(1.02)', borderColor: 'primary.main' },
                          }}
                        />
                      ) : (
                        option
                      )
                    }
                  />
                ))}
              </FormGroup>
            ) : (
              <RadioGroup
                value={value}
                onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                sx={{
                  flexDirection: effectiveType === 'picture-choice' ? 'row' : 'column',
                  flexWrap: 'wrap',
                  gap: effectiveType === 'picture-choice' ? 2 : 0,
                }}
              >
                {(question.options ?? []).map((option, idx) => (
                  <FormControlLabel
                    key={idx}
                    value={option}
                    labelPlacement={effectiveType === 'picture-choice' ? 'top' : 'end'}
                    control={
                      <Radio
                        disabled={disabled}
                        sx={{ mt: effectiveType === 'picture-choice' ? 1 : 0 }}
                      />
                    }
                    label={
                      effectiveType === 'picture-choice' ? (
                        <Box
                          component="img"
                          src={resolveUrl(option)}
                          alt={`Option ${idx + 1}`}
                          sx={{
                            width: '180px', height: '140px', objectFit: 'cover',
                            border: value === option ? '3px solid #1976d2' : '1px solid #ddd',
                            borderRadius: 2, transition: 'all 0.2s',
                            '&:hover': { transform: 'scale(1.02)', borderColor: 'primary.main' },
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
            )}
          </FormControl>
        </Box>
      );
    };

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
                      <FormLabel
                        component="legend"
                      >
                        <Box component="div" sx={{ '& p': { margin: 0 }, '& *': { display: 'inline' } }}>
                          {parseHTML(question.title)}
                        </Box>
                      </FormLabel>
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
                    <Typography
                      component="div"
                      variant="body1"
                      gutterBottom
                      sx={{ mb: 1 }}
                    >
                      {parseHTML(question.title)}
                    </Typography>
                    <TextField
                      fullWidth
                      variant="outlined"
                      value={value}
                      onChange={(e) =>
                        handleAnswerChange(question._id, e.target.value)
                      }
                      placeholder="Enter your answer"
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
            <Typography
              component="div"
              variant="body1"
              gutterBottom
              sx={{ mb: 1 }}
            >
              {parseHTML(question.title)}
            </Typography>
            <TextField
              fullWidth
              multiline={effectiveType === 'writing'}
              rows={effectiveType === 'writing' ? 6 : 2}
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Enter your answer"
              disabled={disabled}
            />
          </Box>
        );
      case 'fill-blank': {
        const blanks = (question.title.match(/____/g) || []).length;
        const answerArray = Array.isArray(answerValue)
          ? answerValue
          : typeof answerValue === 'string' && answerValue
            ? answerValue.split(',').map((s) => s.trim())
            : Array(blanks).fill('');
        return (
          <Box sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            <Box
              sx={{
                lineHeight: 2.2,
              }}
            >
              {parseHTMLWithBlanks(question.title, (blankIndex) => (
                <TextField
                  size="small"
                  value={answerArray[blankIndex] ?? ''}
                  onChange={(e) => {
                    const next = [...answerArray];
                    next[blankIndex] = e.target.value;
                    handleAnswerChange(question._id, next);
                  }}
                  sx={{
                    width: 160,
                    mx: 0.5,
                    '& .MuiOutlinedInput-root': {
                      bgcolor:
                        showResult && (question.correctAnswer?.length ?? 0) > 0
                          ? answerArray[blankIndex] ===
                            (question.correctAnswer as string[])?.[blankIndex]
                            ? 'rgba(56, 142, 60, 0.08)'
                            : 'rgba(211, 47, 47, 0.08)'
                          : 'transparent',
                      '& fieldset': {
                        borderColor:
                          showResult && (question.correctAnswer?.length ?? 0) > 0
                            ? answerArray[blankIndex] ===
                              (question.correctAnswer as string[])?.[blankIndex]
                              ? 'success.main'
                              : 'error.main'
                            : undefined,
                        borderWidth: showResult ? '2px' : '1px',
                      },
                    },
                  }}
                  InputProps={{
                    endAdornment:
                      showResult && (question.correctAnswer?.length ?? 0) > 0 ? (
                        answerArray[blankIndex] ===
                        (question.correctAnswer as string[])?.[blankIndex] ? (
                          <CheckCircleIcon
                            color="success"
                            sx={{ fontSize: 18, mr: -0.5 }}
                          />
                        ) : (
                          <CancelIcon
                            color="error"
                            sx={{ fontSize: 18, mr: -0.5 }}
                          />
                        )
                      ) : null,
                  }}
                  placeholder="..."
                  disabled={disabled}
                  title={
                    showResult &&
                    (question.correctAnswer?.length ?? 0) > 0 &&
                    answerArray[blankIndex] !==
                      (question.correctAnswer as string[])?.[blankIndex]
                      ? `Correct: ${
                          (question.correctAnswer as string[])?.[blankIndex]
                        }`
                      : ''
                  }
                />
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
              Fill in the blank:
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              InputProps={{
                endAdornment:
                  showResult && (question.correctAnswer?.length ?? 0) > 0 ? (
                    value === (question.correctAnswer as string[])?.[0] ? (
                      <CheckCircleIcon
                        color="success"
                        sx={{ fontSize: 18, mr: -0.5 }}
                      />
                    ) : (
                      <CancelIcon color="error" sx={{ fontSize: 18, mr: -0.5 }} />
                    )
                  ) : null,
              }}
              placeholder="Enter the word to fill in the blank"
              disabled={disabled}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor:
                    showResult && (question.correctAnswer?.length ?? 0) > 0
                      ? value === (question.correctAnswer as string[])?.[0]
                        ? 'rgba(56, 142, 60, 0.08)'
                        : 'rgba(211, 47, 47, 0.08)'
                      : 'transparent',
                  '& fieldset': {
                    borderColor:
                      showResult && (question.correctAnswer?.length ?? 0) > 0
                        ? value === (question.correctAnswer as string[])?.[0]
                          ? 'success.main'
                          : 'error.main'
                        : undefined,
                    borderWidth: showResult ? '2px' : '1px',
                  },
                },
              }}
              title={
                showResult &&
                (question.correctAnswer?.length ?? 0) > 0 &&
                value !== (question.correctAnswer as string[])?.[0]
                  ? `Correct: ${(question.correctAnswer as string[])?.[0]}`
                  : ''
              }
            />
          </Box>
        );
      case 'dropdown-choice': {
        const blanksCount = (question.title.match(/____/g) || []).length;
        const isPerBlankOptions =
          question.options && question.options.length === blanksCount;

        const answerArray = Array.isArray(answers[question._id])
          ? (answers[question._id] as string[])
          : typeof answers[question._id] === 'string' && answers[question._id]
            ? [(answers[question._id] as string)]
            : Array(blanksCount).fill('');

        return (
          <Box sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            <Box
              sx={{
                lineHeight: 2.2,
              }}
            >
              {parseHTMLWithBlanks(question.title, (blankIndex) => {
                let currentOptions: string[] = [];
                if (isPerBlankOptions) {
                  currentOptions = question.options![blankIndex]
                    .split('|')
                    .map((o) => o.trim())
                    .filter(Boolean);
                  if (
                    currentOptions.length === 1 &&
                    currentOptions[0].includes(',')
                  ) {
                    currentOptions = question.options![blankIndex]
                      .split(',')
                      .map((o) => o.trim())
                      .filter(Boolean);
                  }
                } else {
                  currentOptions = question.options ?? [];
                }
                return (
                  <FormControl size="small" sx={{ minWidth: 160, mx: 0.5 }} key={blankIndex}>
                    <Select
                      value={answerArray[blankIndex] || ''}
                      onChange={(e) => {
                        const newArray = [...answerArray];
                        newArray[blankIndex] = e.target.value;
                        handleAnswerChange(question._id, newArray);
                      }}
                      displayEmpty
                      disabled={disabled}
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor:
                            showResult && (question.correctAnswer?.length ?? 0) > 0
                              ? answerArray[blankIndex] ===
                                (
                                  question.correctAnswer as string[]
                                )?.[blankIndex]
                                ? 'success.main'
                                : 'error.main'
                              : undefined,
                          borderWidth: showResult ? '2px' : '1px',
                        },
                        bgcolor:
                          showResult && (question.correctAnswer?.length ?? 0) > 0
                            ? answerArray[blankIndex] ===
                              (
                                question.correctAnswer as string[]
                              )?.[blankIndex]
                              ? 'rgba(56, 142, 60, 0.08)'
                              : 'rgba(211, 47, 47, 0.08)'
                            : 'transparent',
                        '& .MuiSelect-select': {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        },
                      }}
                      renderValue={(v) => (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {v || <em>Select...</em>}
                          {showResult &&
                            (question.correctAnswer?.length ?? 0) > 0 &&
                            (answerArray[blankIndex] ===
                            (
                              question.correctAnswer as string[]
                            )?.[blankIndex] ? (
                              <CheckCircleIcon
                                color="success"
                                sx={{ fontSize: 16 }}
                              />
                            ) : (
                              <CancelIcon color="error" sx={{ fontSize: 16 }} />
                            ))}
                        </Box>
                      )}
                    >
                      <MenuItem value="" disabled>
                        <em></em>
                      </MenuItem>
                      {currentOptions.map((opt, i) => (
                        <MenuItem key={i} value={opt}>
                          {opt}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                );
              })}
            </Box>
          </Box>
        );
      }
      case 'pronunciation': {
        const status = recordingStatus[question._id] ?? 'idle';
        const savedUrl = answers[question._id] as string | undefined;
        const displayUrl =
          recordings[question._id] ?? (savedUrl ? resolveUrl(savedUrl) : null);

        const handlePlayRecording = () => {
          if (!displayUrl) return;
          const audioEl = document.getElementById(
            `audio-${question._id}`,
          ) as HTMLAudioElement;
          if (audioEl) {
            audioEl.currentTime = 0;
            audioEl.play().catch((e) => console.error('Play error:', e));
          } else {
            const audio = new Audio(displayUrl);
            audio.play().catch((e) => console.error('Play error:', e));
          }
        };

        return (
          <Box sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            <Typography
              component="div"
              variant="body1"
              gutterBottom
              sx={{ mb: 1 }}
            >
              {parseHTML(question.title)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Listen to the sample and record your pronunciation again.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Button
                variant="contained"
                size="small"
                disabled={status === 'recording' || disabled}
                onClick={() => startRecording(question._id)}
              >
                {status === 'recording' ? 'Recording...' : 'Record'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="error"
                disabled={status !== 'recording' || disabled}
                onClick={() => stopRecording(question._id)}
              >
                Stop
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="info"
                disabled={!displayUrl || status === 'recording'}
                onClick={handlePlayRecording}
              >
                Listen again
              </Button>
            </Box>
            {displayUrl && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Your recording:
                </Typography>
                <audio
                  id={`audio-${question._id}`}
                  controls
                  src={displayUrl}
                  style={{ width: '100%', maxWidth: '300px' }}
                />
              </Box>
            )}
          </Box>
        );
      }

      case 'video-recording': {
        const status = recordingStatus[question._id] ?? 'idle';
        const savedUrl = answers[question._id] as string | undefined;
        const displayUrl =
          recordings[question._id] ?? (savedUrl ? resolveUrl(savedUrl) : null);

        const handlePlayVideo = () => {
          if (!displayUrl) return;
          const videoEl = document.getElementById(
            `video-${question._id}`,
          ) as HTMLVideoElement;
          if (videoEl) {
            videoEl.currentTime = 0;
            videoEl.play().catch((e) => console.error('Play error:', e));
          }
        };

        return (
          <Box sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            <Typography
              component="div"
              variant="body1"
              gutterBottom
              sx={{ mb: 1 }}
            >
              {parseHTML(question.title)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Record your video answer.
            </Typography>

            <Box
              sx={{
                width: '100%',
                maxWidth: '500px',
                aspectRatio: '16/9',
                bgcolor: 'black',
                borderRadius: 2,
                overflow: 'hidden',
                mb: 2,
                position: 'relative',
              }}
            >
              {status === 'recording' ? (
                <video
                  id={`preview-${question._id}`}
                  autoPlay
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : displayUrl ? (
                <video
                  id={`video-${question._id}`}
                  src={displayUrl}
                  controls
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                  }}
                >
                  <Typography variant="body2">No video</Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Button
                variant="contained"
                size="small"
                disabled={status === 'recording' || disabled}
                onClick={() => startRecording(question._id, true)}
              >
                {status === 'recording' ? 'Recording...' : 'Start recording'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="error"
                disabled={status !== 'recording' || disabled}
                onClick={() => stopRecording(question._id)}
              >
                Stop
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="info"
                disabled={!displayUrl || status === 'recording'}
                onClick={handlePlayVideo}
              >
                Listen again
              </Button>
            </Box>
          </Box>
        );
      }
      default:
        return (
          <Box sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            <Typography
              component="div"
              variant="body1"
              gutterBottom
              sx={{ mb: 1 }}
            >
              {parseHTML(question.title)}
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Enter your answer"
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

      const qType =
        (question as Question & { type?: QuestionType }).type ??
        section.questionType;
      const orderMatters = [
        'fill-blank',
        'dropdown-choice',
        'listening',
        'paragraph-fill',
        'fill-sentence',
      ].includes(qType || '');

      if (orderMatters) {
        return JSON.stringify(userArr) === JSON.stringify(correctArr);
      }

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
              {isCorrect ? 'Correct' : 'Incorrect'}
            </Typography>
            {!isCorrect && (
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}
                >
                  Correct answer:
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
          Back
        </Button>
        <Typography color="text.secondary">
          Quiz not found or expired.
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
        Back
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
                    Section {currentSectionIndex + 1}: {currentSection.title}
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
                  Section {currentSectionIndex + 1} /{' '}
                  {quiz.sections?.length ?? 0} ·{' '}
                  {currentSection.questions?.length ?? 0} questions
                </Typography>
              </Box>

              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ mt: 2, mb: 2 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Total progress:{' '}
                {questionsCompleted + (currentSection.questions?.length ?? 0)} /{' '}
                {totalQuestions} questions
              </Typography>

              <Divider sx={{ my: 2 }} />

              {renderSectionMedia(currentSection) && (
                <Box sx={{ mb: 3 }}>{renderSectionMedia(currentSection)}</Box>
              )}
              {currentSection.questionType !== 'drag-classify' && renderSectionWordBank(currentSection) && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ width: '100%', mb: 1 }}>
                    Word Bank:
                  </Typography>
                  {renderSectionWordBank(currentSection)}
                </Box>
              )}

              <Box sx={{ mb: 3 }}>
                {currentSection.questionType === 'drag-classify' ? (
                  <DragClassifySection
                    section={currentSection}
                    answers={
                      Object.fromEntries(
                        Object.entries(answers).map(([k, v]) => [
                          k,
                          Array.isArray(v) ? v[0] ?? '' : (v as string),
                        ]),
                      ) as Record<string, string>
                    }
                    onChange={(newAnswers) =>
                      setAnswers((prev) => ({ ...prev, ...newAnswers }))
                    }
                    showResult={showResult}
                    disabled={showResult || submitting}
                  />
                ) : currentSection.questionType === 'paragraph-fill' &&
                  currentSection.passage ? (
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.300',
                      mb: 2,
                      lineHeight: 2.2,
                    }}
                  >
                    {parseHTMLWithBlanks(currentSection.passage, (blankIndex) => {
                      const q = currentSection.questions![blankIndex];
                      if (!q) return null;
                      
                      const answerArray = answers[q._id];
                      const val = Array.isArray(answerArray) ? answerArray[0] : (answerArray ?? '') as string;
                      const correctArr = q.correctAnswer || [];
                      const isCorrect = showResult && correctArr.length > 0 && val === correctArr[0];
                      const isWrong = showResult && correctArr.length > 0 && val !== correctArr[0];

                      return (
                        <TextField
                          key={q._id}
                          size="small"
                          value={val}
                          onChange={(e) => handleAnswerChange(q._id, e.target.value)}
                          sx={{
                            width: 160,
                            mx: 0.5,
                            '& input': { py: 0.5 },
                            '& .MuiOutlinedInput-root': {
                              bgcolor: isCorrect
                                ? 'rgba(56, 142, 60, 0.08)'
                                : isWrong
                                  ? 'rgba(211, 47, 47, 0.08)'
                                  : 'transparent',
                              '& fieldset': {
                                borderColor: isCorrect
                                  ? 'success.main'
                                  : isWrong
                                    ? 'error.main'
                                    : undefined,
                                borderWidth: isCorrect || isWrong ? '2px' : '1px',
                              },
                            },
                          }}
                          InputProps={{
                            endAdornment: isCorrect ? (
                              <CheckCircleIcon color="success" sx={{ fontSize: 18, mr: -0.5 }} />
                            ) : isWrong ? (
                              <CancelIcon color="error" sx={{ fontSize: 18, mr: -0.5 }} />
                            ) : null,
                          }}
                          placeholder="..."
                          disabled={showResult || submitting}
                          title={
                            isWrong
                              ? `Correct: ${correctArr.join(' / ')}`
                              : ''
                          }
                        />
                      );
                    })}
                  </Box>
                ) : (
                  (currentSection.questions ?? []).map((question, index) =>
                    renderQuestion(question, currentSection, index),
                  )
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
                  Previous section
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={submitting}
                >
                  {isLastSection
                    ? showResult
                      ? 'Back to list'
                      : 'Submit'
                    : 'Next section'}
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
            Test results
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
                Score: {result.score} / {result.maxScore}
              </Typography>
              <Alert
                severity={result.percentage >= 60 ? 'success' : 'info'}
                sx={{ mt: 2 }}
              >
                {result.percentage >= 60
                  ? 'Congratulations! You have completed the quiz.'
                  : 'You can retake it to improve your score.'}
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResultDialogOpen(false)} color="inherit">
            Retake
          </Button>
          <Button onClick={() => navigate('/quizzes')} variant="contained">
            Back to list
          </Button>
        </DialogActions>
      </Dialog>

      {/* Exit Confirmation Dialog */}
      <Dialog open={exitDialogOpen} onClose={() => setExitDialogOpen(false)}>
        <DialogTitle>Confirm exit</DialogTitle>
        <DialogContent>
          <Typography>
            You are currently in the process of taking the quiz. If you exit
            now, the system will automatically submit your answers. Are you sure
            you want to submit and exit?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExitDialogOpen(false)} color="inherit">
            Continue
          </Button>
          <Button
            onClick={handleConfirmExit}
            color="primary"
            variant="contained"
          >
            Submit and exit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
