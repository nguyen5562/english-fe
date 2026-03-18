import { useRef, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  TextField,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Divider,
  Select,
  MenuItem,
  Checkbox,
  FormGroup,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { exerciseService } from '../services/exercise.service';
import { exerciseAttemptService } from '../services/exercise-attempt.service';
import { uploadService } from '../services/upload.service';
import { useAuthStore } from '../store/auth.store';
import type {
  Exercise,
  Question,
  QuestionType,
  ExerciseAttempt,
} from '../types';
import {
  sectionTypeMap,
  renderQuestionMedia,
  renderQuestionWordBank,
  renderSectionMedia,
  renderSectionWordBank,
  calculateScore,
  resolveUrl,
} from '../utils/questionHelpers';
import { toast } from '../utils/toast';
import { parseHTML, parseHTMLWithBlanks } from '../utils/htmlParser';
import { DragClassifySection } from '../components/DragClassifySection';
import type { SectionAttemptDto } from '../types/dto';

export default function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const userId = user?._id;

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loadingExercise, setLoadingExercise] = useState(true);
  const [attempt, setAttempt] = useState<ExerciseAttempt | null>(null);

  const initialSectionIndex = Number(searchParams.get('section') ?? 0);
  const [currentSectionIndex, setCurrentSectionIndex] =
    useState(initialSectionIndex);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState<{
    score: number;
    maxScore: number;
  } | null>(null);
  const [checkedResults, setCheckedResults] = useState<
    Record<
      string,
      { graded: boolean; correct?: boolean; correctAnswer: string | string[] }
    >
  >({});
  const [recordingStatus, setRecordingStatus] = useState<
    Record<string, 'idle' | 'recording' | 'recorded'>
  >({});
  const [recordings, setRecordings] = useState<Record<string, string | null>>(
    {},
  );
  const mediaRecordersRef = useRef<Record<string, MediaRecorder | null>>({});

  const [viewingSaved, setViewingSaved] = useState(false);
  const [ignoringSaved, setIgnoringSaved] = useState(false);
  const [retryKey, setRetryKey] = useState<number>(0);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const loadId = window.setTimeout(() => setLoadingExercise(true), 0);
    exerciseService
      .getExerciseById(id)
      .then((data) => {
        if (!cancelled) {
          setExercise(data);
          const initial: Record<string, string | string[]> = {};
          data.sections?.forEach((section) => {
            section.questions?.forEach((q) => {
              initial[q._id] = q.correctAnswer?.length ? [] : '';
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
            'Failed to load exercise';
          toast.error(String(msg));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingExercise(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(loadId);
    };
  }, [id]);

  useEffect(() => {
    if (!userId || !id) return;
    let cancelled = false;
    exerciseAttemptService
      .getExerciseAttemptByUserId(userId)
      .then((list) => {
        if (cancelled) return;
        const exAttempt = list.find((a) => {
          const aExId =
            typeof a.exerciseId === 'object'
              ? (a.exerciseId as any)._id
              : a.exerciseId;

          if (
            String(aExId) === String(id) ||
            (exercise?._id && String(aExId) === String(exercise._id))
          )
            return true;

          // Fallback: match by title
          if (exercise?.title && (a as any).exerciseTitle === exercise.title)
            return true;

          return false;
        });
        setAttempt(exAttempt ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, id, exercise?._id]);

  useEffect(() => {
    if (!exercise) return;
    const clamped = Math.max(
      0,
      Math.min(initialSectionIndex, (exercise.sections?.length ?? 1) - 1),
    );
    const t = window.setTimeout(
      () =>
        setCurrentSectionIndex((prev) => (prev === clamped ? prev : clamped)),
      0,
    );
    return () => window.clearTimeout(t);
  }, [exercise, initialSectionIndex]);

  const clearLoadedState = () => {
    window.setTimeout(() => {
      setViewingSaved(false);
      setCheckedResults({});
      setScore(null);
    }, 0);
  };

  const isSectionGraded = useCallback(
    (section: Exercise['sections'][number]) =>
      section.questionType !== 'pronunciation' &&
      section.questionType !== 'video-recording' &&
      section.questionType !== 'writing',
    [],
  );

  useEffect(() => {
    if (ignoringSaved || !exercise || !userId || !attempt) {
      if (ignoringSaved || !exercise || !userId) clearLoadedState();
      return;
    }
    const section = exercise.sections?.[currentSectionIndex];
    if (!section) return;

    const sectionAttempts =
      attempt.sectionAttempts?.filter((sa) => {
        const saId =
          typeof sa.sectionId === 'object'
            ? (sa.sectionId as any)._id
            : sa.sectionId;
        return String(saId) === String(section._id);
      }) ?? [];
    if (sectionAttempts.length === 0) {
      clearLoadedState();
      return;
    }
    const last = sectionAttempts
      .slice()
      .sort((a, b) => (b.tries || 0) - (a.tries || 0))[0];

    window.setTimeout(() => {
      setAnswers((prev) => {
        const next = { ...prev };
        (last.answers ?? []).forEach((a) => {
          // Robustly handle answer format. If it's a single item array and the question
          // usually takes a string (not multi-choice or special), map it back to a string
          // so that Controlled components like Select or Radio work correctly.
          const val = a.answer;
          if (
            Array.isArray(val) &&
            val.length === 1 &&
            !['fill-blank', 'listening'].includes(section.questionType)
          ) {
            next[a.questionId] = val[0];
          } else {
            next[a.questionId] = val;
          }
        });
        return next;
      });

      if (isSectionGraded(section)) {
        const savedAnswers: Record<string, string | string[]> = {};
        (last.answers ?? []).forEach((a) => {
          savedAnswers[a.questionId] = a.answer;
        });
        const { score: totalScore, maxScore } = calculateScore(
          section.questions ?? [],
          savedAnswers,
        );
        const results: Record<
          string,
          {
            graded: boolean;
            correct?: boolean;
            correctAnswer: string | string[];
          }
        > = {};
        (section.questions ?? []).forEach((q) => {
          const ansObj = (last.answers ?? []).find(
            (x) => x.questionId === q._id,
          );
          const userAnswer = ansObj ? ansObj.answer : [];
          const correctAnswer = q.correctAnswer ?? [];
          const correct =
            userAnswer.length === correctAnswer.length &&
            JSON.stringify([...userAnswer].sort()) ===
              JSON.stringify([...correctAnswer].sort());
          results[q._id] = { graded: true, correct, correctAnswer };
        });
        setCheckedResults(results);
        setScore({ score: totalScore, maxScore });
        setViewingSaved(true);
      } else {
        const results: Record<
          string,
          { graded: boolean; correctAnswer: string | string[] }
        > = {};
        (section.questions ?? []).forEach((q) => {
          results[q._id] = {
            graded: false,
            correctAnswer: q.correctAnswer ?? [],
          };
        });
        setCheckedResults(results);
        setScore(null);
        setViewingSaved(true);
      }
    }, 0);
  }, [
    currentSectionIndex,
    exercise,
    attempt,
    ignoringSaved,
    isSectionGraded,
    userId,
  ]);

  useEffect(() => {
    const t = window.setTimeout(() => setIgnoringSaved(false), 0);
    return () => window.clearTimeout(t);
  }, [currentSectionIndex]);

  if (loadingExercise) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!exercise) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/exercises')}
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        <Typography color="text.secondary">
          Exercise not found or expired.
        </Typography>
      </Box>
    );
  }

  const allQuestions = (exercise.sections ?? []).flatMap(
    (section) => section.questions ?? [],
  );
  const currentSection = exercise.sections?.[currentSectionIndex];

  if (!currentSection) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/exercises')}
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        <Typography color="text.secondary">
          Exercise section not found.
        </Typography>
      </Box>
    );
  }

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

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleCheckSection = async () => {
    if (!currentSection) return;
    const section = currentSection;

    // Upload pending recordings
    const uploadedAnswers = { ...answers };
    let hasUploadError = false;

    // Identify questions that might have recordings
    const mediaQuestions = (section.questions ?? []).filter((q) => {
      // cast q to any to access potentially existing 'type' property override
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const qType = (q as any).type as QuestionType | undefined;
      return (
        qType === 'pronunciation' ||
        qType === 'video-recording' ||
        section.questionType === 'pronunciation' ||
        section.questionType === 'video-recording'
      );
    });

    for (const q of mediaQuestions) {
      const recordingUrl = recordings[q._id];
      if (recordingUrl && recordingUrl.startsWith('blob:')) {
        try {
          // Fetch blob from URL
          const blobResponse = await fetch(recordingUrl);
          const blob = await blobResponse.blob();

          // Construct path: /submissions/[audio|video]/YYYY-MM/studentId
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
      return;
    }

    // Update local answers state to reflect uploaded URLs (optional, but good for UI consistency)
    setAnswers(uploadedAnswers);

    const results: Record<
      string,
      { graded: boolean; correct?: boolean; correctAnswer: string | string[] }
    > = {};
    const sectionIsGraded =
      section.questionType !== 'pronunciation' &&
      section.questionType !== 'video-recording' &&
      section.questionType !== 'writing';

    (section.questions ?? []).forEach((question) => {
      if (!sectionIsGraded) {
        results[question._id] = {
          graded: false,
          correctAnswer: question.correctAnswer ?? [],
        };
        return;
      }
      const userAnswer = uploadedAnswers[question._id];
      const correctAnswer = question.correctAnswer ?? [];
      const userArr = Array.isArray(userAnswer)
        ? userAnswer
        : userAnswer != null
          ? [String(userAnswer)]
          : [];
      const correct =
        userArr.length === correctAnswer.length &&
        JSON.stringify([...userArr].sort()) ===
          JSON.stringify([...correctAnswer].sort());
      results[question._id] = { graded: true, correct, correctAnswer };
    });

    const { score: totalScore, maxScore } = sectionIsGraded
      ? calculateScore(section.questions ?? [], uploadedAnswers)
      : { score: 0, maxScore: 0 };

    setCheckedResults(results);
    setScore({ score: totalScore, maxScore });
    setShowResult(true);

    if (userId) {
      const sectionAnswers: SectionAttemptDto['answers'] = (
        section.questions ?? []
      ).map((q) => {
        const a = uploadedAnswers[q._id];
        const arr = Array.isArray(a) ? a : a != null ? [String(a)] : [];
        return { questionId: q._id, answer: arr };
      });

      try {
        let attemptId = attempt?._id;
        if (!attemptId) {
          const newAttempt = await exerciseAttemptService.createExerciseAttempt(
            {
              exerciseId: exercise._id,
              userId,
            },
          );
          attemptId = newAttempt._id;
          setAttempt(newAttempt);
        }
        await exerciseAttemptService.submitSection(attemptId, {
          sectionId: section._id,
          answers: sectionAnswers,
        });
        setIgnoringSaved(false);
        const updated =
          await exerciseAttemptService.getExerciseAttemptById(attemptId);
        setAttempt(updated);
      } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
          const msg =
            (e.response?.data as { message?: string })?.message ??
            e.response?.statusText ??
            'Failed to save results';
          toast.error(String(msg));
        } else {
          toast.error('Failed to save results');
        }
      }
    }
  };

  const stopAndClearRecorders = (section: Exercise['sections'][number]) => {
    (section.questions ?? []).forEach((q) => {
      const r = mediaRecordersRef.current[q._id];
      if (r && r.state === 'recording') {
        try {
          r.stop();
        } catch {
          /* ignore */
        }
        try {
          r.stream.getTracks().forEach((t) => t.stop());
        } catch {
          /* ignore */
        }
      }
      mediaRecordersRef.current[q._id] = null;
    });
    setRecordings((prev) => {
      const next = { ...prev };
      (section.questions ?? []).forEach((q) => {
        next[q._id] = null;
      });
      return next;
    });
    setRecordingStatus((prev) => {
      const next = { ...prev };
      (section.questions ?? []).forEach((q) => {
        next[q._id] = 'idle';
      });
      return next;
    });
  };

  const resetAnswersForSection = (section: Exercise['sections'][number]) => {
    setAnswers((prev) => {
      const next = { ...prev };
      (section.questions ?? []).forEach((q) => {
        next[q._id] = (q.correctAnswer?.length ?? 0) > 0 ? [] : '';
      });
      return next;
    });
  };

  // Allow retrying a section: clear saved view and reset inputs for this section
  const handleRetrySection = () => {
    // clear the viewed result and allow editing
    setCheckedResults({});
    setScore(null);
    setShowResult(false);
    setViewingSaved(false);

    // ignore saved attempts until user either submits a new attempt or navigates away
    setIgnoringSaved(true);

    stopAndClearRecorders(currentSection);
    resetAnswersForSection(currentSection);

    // force-remount section UI to ensure all inputs are visually reset
    setRetryKey((v) => v + 1);
  };

  const renderQuestion = (
    question: Question,
    sectionQuestionType?: QuestionType,
  ) => {
    const rawValue = answers[question._id];
    const value = Array.isArray(rawValue) ? rawValue[0] ?? '' : (rawValue ?? '') as string;
    const values = Array.isArray(rawValue) ? rawValue : (rawValue ? [String(rawValue)] : []);

    const questionType: QuestionType | undefined =
      (question as Question & { type?: QuestionType }).type ??
      sectionQuestionType;

    const renderQuestionWordBankWithHandler = () => {
      return renderQuestionWordBank(question, (word) => {
        setAnswers((prev) => {
          const current = (prev[question._id] as string) || '';
          const next = current ? `${current} ${word}` : word;
          return { ...prev, [question._id]: next };
        });
      });
    };

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
        <Box>
          {renderQuestionMedia(question)}
          {renderQuestionWordBankWithHandler()}
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">
              <Box component="div" sx={{ '& p': { margin: 0 }, '& *': { display: 'inline' } }}>
                {parseHTML(question.title)}
              </Box>
            </FormLabel>
            
            {isMultiple ? (
              <FormGroup
                sx={{
                  flexDirection: questionType === 'picture-choice' ? 'row' : 'column',
                  flexWrap: 'wrap',
                  gap: questionType === 'picture-choice' ? 2 : 0,
                  mt: 1
                }}
              >
                {question.options?.map((option, index) => (
                  <FormControlLabel
                    key={index}
                    control={
                      <Checkbox
                        checked={values.includes(option)}
                        onChange={() => handleToggleOption(option)}
                        disabled={viewingSaved}
                        size="small"
                      />
                    }
                    label={
                      questionType === 'picture-choice' ? (
                        <Box
                          component="img"
                          src={resolveUrl(option)}
                          alt={`Option ${index + 1}`}
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
                key={`${question._id}-rg-${retryKey}`}
                value={value}
                onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                sx={{
                  flexDirection: questionType === 'picture-choice' ? 'row' : 'column',
                  flexWrap: 'wrap',
                  gap: questionType === 'picture-choice' ? 2 : 0,
                }}
              >
                {question.options?.map((option, index) => (
                  <FormControlLabel
                    key={index}
                    value={option}
                    labelPlacement={questionType === 'picture-choice' ? 'top' : 'end'}
                    control={
                      <Radio
                        key={`${question._id}-${index}-${retryKey}`}
                        disabled={viewingSaved}
                        sx={{ mt: questionType === 'picture-choice' ? 1 : 0 }}
                      />
                    }
                    label={
                      questionType === 'picture-choice' ? (
                        <Box
                          component="img"
                          src={resolveUrl(option)}
                          alt={`Option ${index + 1}`}
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
                      ml: questionType === 'picture-choice' ? 0 : undefined,
                      mr: questionType === 'picture-choice' ? 0 : 2,
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

    switch (questionType) {
      case 'multiple-choice':
        // Trắc nghiệm thông thường
        return renderMultipleChoice();

      case 'reading-mcq':
        // Đọc hiểu - giống multiple-choice nhưng có passage ở section level
        // Passage đã được hiển thị ở section level, ở đây chỉ cần render câu hỏi trắc nghiệm
        return renderMultipleChoice();

      case 'dropdown-choice': {
        // Hiển thị câu hỏi với dropdown (Select) thay vì radio buttons
        const blanksCount = (question.title.match(/____/g) || []).length;
        const isPerBlankOptions =
          question.options && question.options.length === blanksCount;

        const answerArray = Array.isArray(answers[question._id])
          ? (answers[question._id] as string[])
          : typeof answers[question._id] === 'string' && answers[question._id]
            ? [(answers[question._id] as string)]
            : Array(blanksCount).fill('');

        return (
          <Box>
            {renderQuestionMedia(question)}
            {renderQuestionWordBankWithHandler()}
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
                  <FormControl size="small" sx={{ minWidth: 120 }} key={blankIndex}>
                    <Select
                      key={`${question._id}-${blankIndex}-${retryKey}`}
                      value={answerArray[blankIndex] || ''}
                      onChange={(e) => {
                        const newArray = [...answerArray];
                        newArray[blankIndex] = e.target.value;
                        handleAnswerChange(question._id, newArray);
                      }}
                      displayEmpty
                      disabled={viewingSaved}
                    >
                      <MenuItem value="" disabled>
                        <em></em>
                      </MenuItem>
                      {currentOptions.map((opt, optIndex) => (
                        <MenuItem key={optIndex} value={opt}>
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

      case 'listening':
        // Nghe: giống trắc nghiệm nhưng có audio
        if (question.options && question.options.length > 0) {
          return renderMultipleChoice();
        }
        return (
          <Box>
            {renderQuestionMedia(question)}
            {renderQuestionWordBankWithHandler()}
            <Typography
              component="div"
              variant="body1"
              gutterBottom
              sx={{ mb: 1 }}
            >
              {parseHTML(question.title)}
            </Typography>
            <TextField
              key={`${question._id}-${retryKey}`}
              fullWidth
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Enter your answer"
              disabled={viewingSaved}
            />
          </Box>
        );

      case 'pronunciation': {
        const status = recordingStatus[question._id] ?? 'idle';
        const savedUrl = answers[question._id] as string | undefined;
        // Check if we have a fresh recording OR a saved answer URL
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
            // Fallback if audio element is hidden or not found
            const audio = new Audio(displayUrl);
            audio.play().catch((e) => console.error('Play error:', e));
          }
        };

        return (
          <Box>
            {renderQuestionMedia(question)}
            {renderQuestionWordBankWithHandler()}
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
                disabled={status === 'recording' || viewingSaved}
                onClick={() => startRecording(question._id)}
              >
                {status === 'recording' ? 'Recording...' : 'Record'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="error"
                disabled={status !== 'recording' || viewingSaved}
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
          <Box>
            {renderQuestionMedia(question)}
            {renderQuestionWordBankWithHandler()}
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

            {/* Video Preview / Playback */}
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
                disabled={status === 'recording' || viewingSaved}
                onClick={() => startRecording(question._id, true)}
              >
                {status === 'recording' ? 'Recording...' : 'Start recording'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                color="error"
                disabled={status !== 'recording' || viewingSaved}
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

      case 'fill-sentence':
        // Điền từ vào chỗ trống
        return (
          <Box>
            {renderQuestionMedia(question)}
            {renderQuestionWordBankWithHandler()}
            <Typography
              component="div"
              variant="body1"
              gutterBottom
              sx={{ mb: 1 }}
            >
              {parseHTML(question.title)}
            </Typography>
            <TextField
              key={`${question._id}-${retryKey}`}
              fullWidth
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Enter your answer"
              disabled={viewingSaved}
            />
          </Box>
        );

      case 'word-order':
        // Sắp xếp lại các từ thành câu đúng trật tự
        return (
          <Box>
            {renderQuestionMedia(question)}
            {renderQuestionWordBankWithHandler()}
            <Typography
              component="div"
              variant="body1"
              gutterBottom
              sx={{ mb: 1 }}
            >
              {parseHTML(question.title)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Write the correct sentence.
            </Typography>
            <TextField
              key={`${question._id}-${retryKey}`}
              fullWidth
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Enter your answer"
              disabled={viewingSaved}
            />
          </Box>
        );

      case 'word-bank': {
        return (
          <Box>
            {renderQuestionMedia(question)}
            {renderQuestionWordBankWithHandler()}
            <Typography
              component="div"
              variant="body1"
              gutterBottom
              sx={{ mb: 1 }}
            >
              {parseHTML(question.title)}
            </Typography>
            <TextField
              key={`${question._id}-${retryKey}`}
              fullWidth
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Enter your answer"
              disabled={viewingSaved}
            />
          </Box>
        );
      }

      case 'fill-blank': {
        // Nghe và điền từ vào chỗ trống - mỗi câu có nhiều chỗ trống
        const blanks = (question.title.match(/____/g) || []).length;
        const answerArray = Array.isArray(answers[question._id])
          ? (answers[question._id] as string[])
          : typeof answers[question._id] === 'string' && answers[question._id]
            ? (answers[question._id] as string).split(',').map((s) => s.trim())
            : Array(blanks).fill('');

        return (
          <Box>
            {renderQuestionMedia(question)}
            {renderQuestionWordBankWithHandler()}
            <Box
              sx={{
                mb: 2,
                lineHeight: 2.2,
              }}
            >
              {parseHTMLWithBlanks(question.title, (blankIndex) => (
                <TextField
                  key={`${question._id}-blank-${blankIndex}-${retryKey}`}
                  size="small"
                  value={answerArray[blankIndex] || ''}
                  onChange={(e) => {
                    const newArray = [...answerArray];
                    newArray[blankIndex] = e.target.value;
                    setAnswers((prev) => ({
                      ...prev,
                      [question._id]: newArray,
                    }));
                  }}
                  sx={{ width: 100 }}
                  placeholder="..."
                  disabled={viewingSaved}
                />
              ))}
            </Box>
          </Box>
        );
      }

      case 'paragraph-fill': {
        // Điền vào đoạn văn - các câu hỏi sẽ điền vào các chỗ trống trong đoạn văn
        // Passage đã được hiển thị ở section level, ở đây chỉ cần hiển thị input cho từng câu
        return (
          <Box>
            {renderQuestionMedia(question)}
            {renderQuestionWordBankWithHandler()}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Fill in the blank number {question.title}:
            </Typography>
            <TextField
              key={`${question._id}-${retryKey}`}
              fullWidth
              size="small"
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Enter the word to fill in"
              disabled={viewingSaved}
            />
          </Box>
        );
      }

      case 'picture-choice':
        // Chọn tranh đúng - có thể có image ở question level hoặc section level
        return renderMultipleChoice();

      case 'writing':
        // Bài viết dài (ví dụ: viết profile, viết đoạn văn)
        return (
          <Box>
            {renderQuestionMedia(question)}
            {renderQuestionWordBankWithHandler()}
            <Typography
              component="div"
              variant="body1"
              gutterBottom
              sx={{ mb: 1 }}
            >
              {parseHTML(question.title)}
            </Typography>
            <TextField
              key={`${question._id}-${retryKey}`}
              fullWidth
              multiline
              rows={8}
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              disabled={viewingSaved || showResult}
            />
          </Box>
        );

      default:
        return (
          <Box>
            {renderQuestionMedia(question)}
            {renderQuestionWordBankWithHandler()}
            <Typography
              component="div"
              variant="body1"
              gutterBottom
              sx={{ mb: 1 }}
            >
              {parseHTML(question.title)}
            </Typography>
            <TextField
              key={`${question._id}-${retryKey}`}
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Enter your answer"
              disabled={viewingSaved || showResult}
            />
          </Box>
        );
    }
  };

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/exercises')}
        sx={{ mb: 2 }}
      >
        Back
      </Button>

      <Card>
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" gutterBottom>
              {exercise.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Section {currentSectionIndex + 1} / {exercise.sections.length} ·
              Total number of questions: {allQuestions.length}
            </Typography>
          </Box>

          {/* Hiển thị 1 phần tại một thời điểm */}
          <Box key={`${currentSection._id}-${retryKey}`}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
              <Typography variant="h6">
                Section {currentSectionIndex + 1}: {currentSection.title}
              </Typography>
              <Chip
                label={
                  sectionTypeMap[currentSection.sectionType]?.label ??
                  currentSection.sectionType
                }
                size="small"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                color={sectionTypeMap[currentSection.sectionType]?.color as any}
                variant={
                  sectionTypeMap[currentSection.sectionType]?.color
                    ? 'filled'
                    : 'outlined'
                }
              />
            </Box>

            {currentSection.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {currentSection.description}
              </Typography>
            )}

            {renderSectionMedia(currentSection)}
            {currentSection.questionType !== 'drag-classify' && renderSectionWordBank(currentSection)}

            {/* Drag-classify: render toàn bộ section một lần dưới dạng bảng cột */}
            {currentSection.questionType === 'drag-classify' ? (
              <DragClassifySection
                key={`${currentSection._id}-${retryKey}`}
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
                showResult={showResult || viewingSaved}
                disabled={viewingSaved}
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
                  const q = currentSection.questions[blankIndex];
                  if (!q) return null;
                  return (
                    <TextField
                      key={`${q._id}-${retryKey}`}
                      size="small"
                      value={(answers[q._id] as string) || ''}
                      onChange={(e) =>
                        handleAnswerChange(q._id, e.target.value)
                      }
                      sx={{ width: 120, '& input': { py: 0.5 } }}
                      placeholder="..."
                      disabled={viewingSaved}
                    />
                  );
                })}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {currentSection.questions.map((question, index) => {
                  const result = checkedResults[question._id];
                  const bg =
                    result && result.graded
                      ? result.correct
                        ? 'rgba(56, 142, 60, 0.06)'
                        : 'rgba(211, 47, 47, 0.04)'
                      : 'transparent';
                  const borderColorToken =
                    result && result.graded
                      ? result.correct
                        ? 'success.main'
                        : 'error.main'
                      : 'transparent';

                  return (
                    <Box
                      key={`${question._id}-${retryKey}`}
                      sx={{
                        p: 1,
                        borderLeft: '3px solid',
                        borderColor: borderColorToken,
                        background: bg,
                        borderRadius: 1,
                        mb: 1,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                        Question {index + 1}
                      </Typography>

                      {renderQuestion(question, currentSection.questionType)}

                      {result && (
                        <Box sx={{ mt: 1 }}>
                          {result.graded ? (
                            result.correct ? (
                              <Typography
                                variant="body2"
                                sx={{ color: 'success.main' }}
                              >
                                Correct
                              </Typography>
                            ) : (
                              <Typography
                                variant="body2"
                                sx={{ color: 'error.main' }}
                              >
                                Wrong
                              </Typography>
                            )
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Saved
                            </Typography>
                          )}
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>

          <Divider sx={{ mt: 3, mb: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Button
              variant="outlined"
              disabled={currentSectionIndex === 0}
              onClick={() => {
                const nextIndex = Math.max(currentSectionIndex - 1, 0);
                navigate(`/exercises/${exercise._id}?section=${nextIndex}`);
                setCurrentSectionIndex(nextIndex);
                setCheckedResults({});
                setShowResult(false);
              }}
            >
              Previous section
            </Button>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {(viewingSaved || Object.keys(checkedResults).length > 0) &&
              !ignoringSaved ? (
                <Button
                  variant="outlined"
                  color="inherit"
                  onClick={handleRetrySection}
                >
                  Retry
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={handleCheckSection}
                >
                  {!isSectionGraded(currentSection) ? 'Save' : 'Check'}
                </Button>
              )}
              <Button
                variant="contained"
                disabled={currentSectionIndex >= exercise.sections.length - 1}
                onClick={() => {
                  const nextIndex = Math.min(
                    currentSectionIndex + 1,
                    exercise.sections.length - 1,
                  );
                  navigate(`/exercises/${exercise._id}?section=${nextIndex}`);
                  setCurrentSectionIndex(nextIndex);
                  setCheckedResults({});
                  setShowResult(false);
                }}
              >
                Next section
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={showResult} onClose={() => {}} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
            Result
          </Box>
        </DialogTitle>
        <DialogContent>
          {score && score.maxScore > 0 ? (
            <Box>
              <Typography variant="h4" align="center" gutterBottom>
                {Math.round((score.score / score.maxScore) * 100)}%
              </Typography>
              <Typography variant="body1" align="center" color="text.secondary">
                Score: {score.score} / {score.maxScore}
              </Typography>
              <Alert severity="success" sx={{ mt: 2 }}>
                Your exercise has been saved to your learning profile!
              </Alert>
            </Box>
          ) : (
            <Box>
              <Typography variant="body1" align="center" color="text.secondary">
                Your exercise has been saved.
              </Typography>
              <Alert severity="info" sx={{ mt: 2 }}>
                Your exercise (audio, video, ...) will be saved and manually
                graded later.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResult(false)} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
