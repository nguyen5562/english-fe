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
  InputLabel,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import axios from 'axios';
import { exerciseService } from '../services/exercise.service';
import { exerciseAttemptService } from '../services/exercise-attempt.service';
import { useAuthStore } from '../store/auth.store';
import type { Exercise, Question, QuestionType, ExerciseAttempt } from '../types';
import { sectionTypeMap, renderQuestionMedia, renderQuestionWordBank, renderSectionMedia, renderSectionWordBank, formatAnswer, calculateScore } from '../utils/questionHelpers';
import { parseSlugId, buildSlugId } from '../utils/slug';
import { toast } from '../utils/toast';
import type { SectionAttemptDto } from '../types/dto';

export default function ExerciseDetail() {
  const { slug } = useParams<{ slug: string }>();
  const id = parseSlugId(slug);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const userId = user?._id;

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loadingExercise, setLoadingExercise] = useState(true);
  const [attempt, setAttempt] = useState<ExerciseAttempt | null>(null);

  const initialSectionIndex = Number(searchParams.get('section') ?? 0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(initialSectionIndex);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState<{ score: number; maxScore: number } | null>(null);
  const [checkedResults, setCheckedResults] = useState<Record<string, { graded: boolean; correct?: boolean; correctAnswer: string | string[] }>>({});
  const [recordingStatus, setRecordingStatus] = useState<Record<string, 'idle' | 'recording' | 'recorded'>>({});
  const [recordings, setRecordings] = useState<Record<string, string | null>>({});
  const mediaRecordersRef = useRef<Record<string, MediaRecorder | null>>({});

  const [lastAttempt, setLastAttempt] = useState<{ sectionId: string; tries: number; score: number; answers: { questionId: string; answer: string[] }[] } | null>(null);
  const [viewingSaved, setViewingSaved] = useState(false);
  const [ignoringSaved, setIgnoringSaved] = useState(false);
  const [retryKey, setRetryKey] = useState<number>(0);

  useEffect(() => {
    if (!id) {
      const t = window.setTimeout(() => {
        setExercise(null);
        setAnswers({});
        setLoadingExercise(false);
      }, 0);
      return () => window.clearTimeout(t);
    }
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
          const msg = (e.response?.data as { message?: string })?.message ?? e.response?.statusText ?? 'Không thể tải bài tập';
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
    exerciseAttemptService.getExerciseAttemptByUserId(userId).then((list) => {
      if (cancelled) return;
      const exAttempt = list.find((a) => a.exerciseId === id);
      setAttempt(exAttempt ?? null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [userId, id]);

  useEffect(() => {
    if (!exercise) return;
    const clamped = Math.max(0, Math.min(initialSectionIndex, (exercise.sections?.length ?? 1) - 1));
    const t = window.setTimeout(() => setCurrentSectionIndex((prev) => (prev === clamped ? prev : clamped)), 0);
    return () => window.clearTimeout(t);
  }, [exercise, initialSectionIndex]);

  const clearLoadedState = () => {
    window.setTimeout(() => {
      setLastAttempt(null);
      setViewingSaved(false);
      setCheckedResults({});
      setScore(null);
    }, 0);
  };

  const isSectionGraded = useCallback(
    (section: Exercise['sections'][number]) =>
      section.questionType !== 'pronunciation' && section.questionType !== 'video-recording',
    []
  );

  useEffect(() => {
    if (ignoringSaved || !exercise || !userId || !attempt) {
      if (ignoringSaved || !exercise || !userId) clearLoadedState();
      return;
    }
    const section = exercise.sections?.[currentSectionIndex];
    if (!section) return;

    const sectionAttempts = attempt.sectionAttempts?.filter((sa) => sa.sectionId === section._id) ?? [];
    if (sectionAttempts.length === 0) {
      clearLoadedState();
      return;
    }
    const last = sectionAttempts.slice().sort((a, b) => b.tries - a.tries)[0];

    window.setTimeout(() => {
      setLastAttempt({
        sectionId: section._id,
        tries: last.tries,
        score: last.score,
        answers: last.answers ?? [],
      });
      setAnswers((prev) => {
        const next = { ...prev };
        (last.answers ?? []).forEach((a) => {
          next[a.questionId] = a.answer;
        });
        return next;
      });

      if (isSectionGraded(section)) {
        const savedAnswers: Record<string, string | string[]> = {};
        (last.answers ?? []).forEach((a) => {
          savedAnswers[a.questionId] = a.answer;
        });
        const { score: totalScore, maxScore } = calculateScore(section.questions ?? [], savedAnswers);
        const results: Record<string, { graded: boolean; correct?: boolean; correctAnswer: string | string[] }> = {};
        (section.questions ?? []).forEach((q) => {
          const ansObj = (last.answers ?? []).find((x) => x.questionId === q._id);
          const userAnswer = ansObj ? ansObj.answer : [];
          const correctAnswer = q.correctAnswer ?? [];
          const correct =
            userAnswer.length === correctAnswer.length &&
            JSON.stringify([...userAnswer].sort()) === JSON.stringify([...correctAnswer].sort());
          results[q._id] = { graded: true, correct, correctAnswer };
        });
        setCheckedResults(results);
        setScore({ score: totalScore, maxScore });
        setViewingSaved(true);
      } else {
        const results: Record<string, { graded: boolean; correctAnswer: string | string[] }> = {};
        (section.questions ?? []).forEach((q) => {
          results[q._id] = { graded: false, correctAnswer: q.correctAnswer ?? [] };
        });
        setCheckedResults(results);
        setScore(null);
        setViewingSaved(false);
      }
    }, 0);
  }, [currentSectionIndex, exercise, attempt, ignoringSaved, isSectionGraded, userId]);

  useEffect(() => {
    const t = window.setTimeout(() => setIgnoringSaved(false), 0);
    return () => window.clearTimeout(t);
  }, [currentSectionIndex]);

  if (loadingExercise || !exercise) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>Đang tải...</Typography>
      </Box>
    );
  }

  const allQuestions = (exercise.sections ?? []).flatMap((section) => section.questions ?? []);
  const currentSection = exercise.sections?.[currentSectionIndex];

  if (!currentSection) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/exercises')} sx={{ mb: 2 }}>
          Quay lại
        </Button>
        <Typography color="text.secondary">Bài tập không có phần nào hoặc phần không tồn tại.</Typography>
      </Box>
    );
  }

  const startRecording = async (questionId: string) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error('Trình duyệt không hỗ trợ ghi âm.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecordersRef.current[questionId] = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setRecordings((prev) => ({ ...prev, [questionId]: url }));
        setRecordingStatus((prev) => ({ ...prev, [questionId]: 'recorded' }));
      };

      mediaRecorder.start();
      setRecordingStatus((prev) => ({ ...prev, [questionId]: 'recording' }));
    } catch (error) {
      console.error(error);
      toast.error('Không thể bắt đầu ghi âm. Vui lòng kiểm tra quyền micro.');
    }
  };

  const stopRecording = (questionId: string) => {
    const recorder = mediaRecordersRef.current[questionId];
    if (recorder && recorder.state === 'recording') {
      recorder.stop();
      recorder.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleCheckSection = async () => {
    if (!currentSection) return;
    const section = currentSection;
    const results: Record<string, { graded: boolean; correct?: boolean; correctAnswer: string | string[] }> = {};
    const sectionIsGraded = section.questionType !== 'pronunciation' && section.questionType !== 'video-recording';

    (section.questions ?? []).forEach((question) => {
      if (!sectionIsGraded) {
        results[question._id] = { graded: false, correctAnswer: question.correctAnswer ?? [] };
        return;
      }
      const userAnswer = answers[question._id];
      const correctAnswer = question.correctAnswer ?? [];
      const userArr = Array.isArray(userAnswer) ? userAnswer : userAnswer != null ? [String(userAnswer)] : [];
      const correct =
        userArr.length === correctAnswer.length &&
        JSON.stringify([...userArr].sort()) === JSON.stringify([...correctAnswer].sort());
      results[question._id] = { graded: true, correct, correctAnswer };
    });

    const { score: totalScore, maxScore } = sectionIsGraded
      ? calculateScore(section.questions ?? [], answers)
      : { score: 0, maxScore: 0 };

    setCheckedResults(results);
    setScore({ score: totalScore, maxScore });
    setShowResult(true);

    if (userId) {
      const sectionAnswers: SectionAttemptDto['answers'] = (section.questions ?? []).map((q) => {
        const a = answers[q._id];
        const arr = Array.isArray(a) ? a : a != null ? [String(a)] : [];
        return { questionId: q._id, answer: arr };
      });

      try {
        let attemptId = attempt?._id;
        if (!attemptId) {
          const newAttempt = await exerciseAttemptService.createExerciseAttempt({
            exerciseId: exercise._id,
            userId,
          });
          attemptId = newAttempt._id;
          setAttempt(newAttempt);
        }
        await exerciseAttemptService.submitSection(attemptId, {
          sectionId: section._id,
          answers: sectionAnswers,
        });
        setIgnoringSaved(false);
        const updated = await exerciseAttemptService.getExerciseAttemptById(attemptId);
        setAttempt(updated);
      } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
          const msg = (e.response?.data as { message?: string })?.message ?? e.response?.statusText ?? 'Không thể lưu kết quả';
          toast.error(String(msg));
        } else {
          toast.error('Không thể lưu kết quả');
        }
      }
    }
  };

  const stopAndClearRecorders = (section: Exercise['sections'][number]) => {
    (section.questions ?? []).forEach((q) => {
      const r = mediaRecordersRef.current[q._id];
      if (r && r.state === 'recording') {
        try { r.stop(); } catch { /* ignore */ }
        try { r.stream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
      }
      mediaRecordersRef.current[q._id] = null;
    });
    setRecordings((prev) => {
      const next = { ...prev };
      (section.questions ?? []).forEach((q) => { next[q._id] = null; });
      return next;
    });
    setRecordingStatus((prev) => {
      const next = { ...prev };
      (section.questions ?? []).forEach((q) => { next[q._id] = 'idle'; });
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
    setLastAttempt(null);
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
    const value = (answers[question._id] ?? '') as string;

    const renderQuestionWordBankWithHandler = () => {
      return renderQuestionWordBank(question, (word) => {
        setAnswers((prev) => {
          const current = (prev[question._id] as string) || '';
          const next = current ? `${current} ${word}` : word;
          return { ...prev, [question._id]: next };
        });
      });
    };

    const renderMultipleChoice = () => (
      <Box>
        {renderQuestionMedia(question)}
        {renderQuestionWordBankWithHandler()}
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend">{question.title}</FormLabel>
          <RadioGroup
            key={`${question._id}-rg-${retryKey}`}
            value={value}
            onChange={(e) => handleAnswerChange(question._id, e.target.value)}
          >
            {question.options?.map((option, index) => (
              <FormControlLabel
                key={index}
                value={option}
                control={<Radio key={`${question._id}-${index}-${retryKey}`} disabled={viewingSaved} />}
                label={option}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </Box>
    );

    const questionType: QuestionType | undefined = (question as Question & { type?: QuestionType }).type ?? sectionQuestionType;

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
        // question.title chứa câu hỏi với chỗ trống, cần parse để tìm vị trí dropdown
        const parts = question.title.split('____');
        const hasBlank = parts.length > 1;

        return (
          <Box>
            {renderQuestionMedia(question)}
            {renderQuestionWordBankWithHandler()}
            {hasBlank ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                {parts.map((part, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography component="span" variant="body1">
                      {part}
                    </Typography>
                    {index < parts.length - 1 && (
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select key={`${question._id}-${index}-${retryKey}`}
                          value={value || ''}
                          onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                          displayEmpty
                          disabled={viewingSaved}
                        >
                          <MenuItem value="" disabled>
                            <em></em>
                          </MenuItem>
                          {question.options?.map((option, optIndex) => (
                            <MenuItem key={optIndex} value={option}>
                              {option}
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
                <Select key={`${question._id}-${retryKey}`}
                  value={value || ''}
                  onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                  label={question.title}
                  disabled={viewingSaved}
                >
                  {question.options?.map((option, optIndex) => (
                    <MenuItem key={optIndex} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
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
            <Typography variant="body1" gutterBottom>
              {question.title}
            </Typography>
            <TextField
              key={`${question._id}-${retryKey}`}
              fullWidth
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Nhập câu trả lời của bạn"
              disabled={viewingSaved}
            />
          </Box>
        );

      case 'pronunciation': {
        const status = recordingStatus[question._id] ?? 'idle';
        const hasRecording = !!recordings[question._id];

        return (
          <Box>
            {renderQuestionMedia(question)}
            {renderQuestionWordBankWithHandler()}
            <Typography variant="body1" gutterBottom>
              {question.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Hãy nghe mẫu và ghi âm lại phát âm của bạn.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Button
                variant="contained"
                size="small"
                disabled={status === 'recording' || viewingSaved}
                onClick={() => startRecording(question._id)}
              >
                {status === 'recording' ? 'Đang ghi...' : 'Ghi âm'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                disabled={status !== 'recording' || viewingSaved}
                onClick={() => stopRecording(question._id)}
              >
                Dừng
              </Button>
            </Box>
            {hasRecording && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Bản ghi của bạn:
                </Typography>
                <audio controls src={recordings[question._id] ?? undefined} />
              </Box>
            )}
          </Box>
        );
      }

      case 'fill-sentence':
        // Điền từ vào chỗ trống
        return (
          <Box>
            {renderQuestionMedia(question)}
            {renderQuestionWordBankWithHandler()}
            <Typography variant="body1" gutterBottom>
              {question.title}
            </Typography>
            <TextField
              key={`${question._id}-${retryKey}`}
              fullWidth
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Nhập câu trả lời của bạn"
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
            <Typography variant="body1" gutterBottom>
              {question.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Hãy viết lại câu đúng trật tự.
            </Typography>
            <TextField
              key={`${question._id}-${retryKey}`}
              fullWidth
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Nhập câu trả lời của bạn"
              disabled={viewingSaved}
            />
          </Box>
        );

      case 'word-bank':
        {
          return (
            <Box>
              {renderQuestionMedia(question)}
              {renderQuestionWordBankWithHandler()}
              <Typography variant="body1" gutterBottom>
                {question.title}
              </Typography>
              <TextField
                key={`${question._id}-${retryKey}`}
                fullWidth
                variant="outlined"
                value={value}
                onChange={(e) => handleAnswerChange(question._id, e.target.value)}
                placeholder="Nhập câu trả lời của bạn"
                disabled={viewingSaved}
              />
            </Box>
          );
        }

      case 'fill-blank': {
        // Nghe và điền từ vào chỗ trống - mỗi câu có nhiều chỗ trống
        // question.title chứa template với ____, correctAnswer là mảng các từ
        // Mỗi câu hỏi có thể có audioUrl riêng
        const blanks = question.title.split('____');
        const answerArray = Array.isArray(answers[question._id])
          ? (answers[question._id] as string[])
          : typeof answers[question._id] === 'string' && answers[question._id]
            ? (answers[question._id] as string).split(',').map((s) => s.trim())
            : Array(blanks.length - 1).fill('');

        return (
          <Box>
            {renderQuestionMedia(question)}
            {renderQuestionWordBankWithHandler()}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
              {blanks.map((part, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography component="span">{part}</Typography>
                  {index < blanks.length - 1 && (
                    <TextField
                      key={`${question._id}-blank-${index}-${retryKey}`}
                      size="small"
                      value={answerArray[index] || ''}
                      onChange={(e) => {
                        const newArray = [...answerArray];
                        newArray[index] = e.target.value;
                        setAnswers((prev) => ({ ...prev, [question._id]: newArray }));
                      }}
                      sx={{ width: 100 }}
                      placeholder="..."
                      disabled={viewingSaved}
                    />
                  )}
                </Box>
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
              Điền từ vào chỗ trống số {question.title}:
            </Typography>
            <TextField
              key={`${question._id}-${retryKey}`}
              fullWidth
              size="small"
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Nhập từ cần điền"
              disabled={viewingSaved}
            />
          </Box>
        );
      }

      case 'picture-choice':
        // Chọn tranh đúng - có thể có image ở question level hoặc section level
        return renderMultipleChoice();

      case 'video-recording': {
        // Xem video rồi ghi âm lại
        // Video có thể ở section level hoặc question level
        const status = recordingStatus[question._id] ?? 'idle';
        const hasRecording = !!recordings[question._id];

        return (
          <Box>
            {renderQuestionMedia(question)}
            {renderQuestionWordBankWithHandler()}
            <Typography variant="body1" gutterBottom>
              {question.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Hãy xem video ở trên, sau đó ghi âm lại nội dung bạn đã xem.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Button
                variant="contained"
                size="small"
                disabled={status === 'recording' || viewingSaved}
                onClick={() => startRecording(question._id)}
                sx={{ bgcolor: 'pink', '&:hover': { bgcolor: '#e91e63' } }}
              >
                {status === 'recording' ? 'Đang ghi...' : 'Ghi âm'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                disabled={status !== 'recording' || viewingSaved}
                onClick={() => stopRecording(question._id)}
              >
                Dừng
              </Button>
            </Box>
            {hasRecording && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Bản ghi của bạn:
                </Typography>
                <audio controls src={recordings[question._id] ?? undefined} />
              </Box>
            )}
          </Box>
        );
      }

      case 'writing':
        // Bài viết dài (ví dụ: viết profile, viết đoạn văn)
        return (
          <Box>
            {renderQuestionMedia(question)}
            {renderQuestionWordBankWithHandler()}
            <Typography variant="body1" gutterBottom>
              {question.title}
            </Typography>
            <TextField
              key={`${question._id}-${retryKey}`}
              fullWidth
              multiline
              rows={8}
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Nhập bài viết của bạn"
            />
          </Box>
        );

      default:
        return (
          <Box>
            {renderQuestionMedia(question)}
            {renderQuestionWordBankWithHandler()}
            <Typography variant="body1" gutterBottom>
              {question.title}
            </Typography>
            <TextField
              key={`${question._id}-${retryKey}`}
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question._id, e.target.value)}
              placeholder="Nhập câu trả lời của bạn"
              disabled={viewingSaved}
            />
          </Box>
        );
    }
  };

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/exercises')} sx={{ mb: 2 }}>
        Quay lại
      </Button>

      <Card>
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" gutterBottom>
              {exercise.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Phần {currentSectionIndex + 1} / {exercise.sections.length} · Tổng số câu hỏi: {allQuestions.length}
            </Typography>
          </Box>

          {/* Hiển thị 1 phần tại một thời điểm */}
          <Box key={`${currentSection._id}-${retryKey}`}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
              <Typography variant="h6">
                Phần {currentSectionIndex + 1}: {currentSection.title}
              </Typography>
              <Chip
                label={sectionTypeMap[currentSection.sectionType]?.label ?? currentSection.sectionType}
                size="small"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                color={sectionTypeMap[currentSection.sectionType]?.color as any}
                variant={sectionTypeMap[currentSection.sectionType]?.color ? 'filled' : 'outlined'}
              />
            </Box>

            {currentSection.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {currentSection.description}
              </Typography>
            )}

            {renderSectionMedia(currentSection)}
            {renderSectionWordBank(currentSection)}

            {/* Hiển thị đặc biệt cho paragraph-fill: passage với input fields inline */}
            {currentSection.questionType === 'paragraph-fill' && currentSection.passage ? (
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'grey.300',
                  mb: 2,
                }}
              >
                {(() => {
                  // Parse passage để tìm các chỗ trống và thay thế bằng input fields
                  const parts = currentSection.passage.split('____');
                  return (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
                      {parts.map((part, index) => (
                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography component="span" variant="body1">
                            {part}
                          </Typography>
                          {index < parts.length - 1 && currentSection.questions[index] && (
                            <TextField
                              key={`${currentSection.questions[index]._id}-${retryKey}`}
                              size="small"
                              value={(answers[currentSection.questions[index]._id] as string) || ''}
                              onChange={(e) =>
                                handleAnswerChange(currentSection.questions[index]._id, e.target.value)
                              }
                              sx={{ width: 120, '& input': { py: 0.5 } }}
                              placeholder="..."
                              disabled={viewingSaved}
                            />
                          )}
                        </Box>
                      ))}
                    </Box>
                  );
                })()}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {currentSection.questions.map((question, index) => {
                  const result = checkedResults[question._id];
                  const bg = result ? (result.correct ? 'rgba(56, 142, 60, 0.06)' : 'rgba(211, 47, 47, 0.04)') : 'transparent';
                  const borderColorToken = result ? (result.correct ? 'success.main' : 'error.main') : 'transparent';


                  return (
                    <Box key={`${question._id}-${retryKey}`} sx={{ p: 1, borderLeft: '3px solid', borderColor: borderColorToken, background: bg, borderRadius: 1, mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                        Câu {index + 1}
                      </Typography>

                      {renderQuestion(
                        question,
                        currentSection.questionType,
                      )}

                      {result && (
                        <Box sx={{ mt: 1 }}>
                          {result.graded ? (
                            result.correct ? (
                              <Typography variant="body2" sx={{ color: 'success.main' }}>Đúng</Typography>
                            ) : (
                              <Typography variant="body2" sx={{ color: 'error.main' }}>
                                Sai — Đáp án đúng: <strong>{formatAnswer(result.correctAnswer)}</strong>
                              </Typography>
                            )
                          ) : (
                            <Typography variant="body2" color="text.secondary">Đã lưu (không chấm tự động)</Typography>
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
                navigate(`/exercises/${buildSlugId(exercise.title ?? "", exercise._id)}?section=${nextIndex}`);
                setCurrentSectionIndex(nextIndex);
                setCheckedResults({});
                setShowResult(false);
              }}
            >
              Phần trước
            </Button>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {lastAttempt && !ignoringSaved && currentSection.questionType !== 'pronunciation' && currentSection.questionType !== 'video-recording' && viewingSaved && (
                <Button variant="outlined" color="inherit" onClick={handleRetrySection}>
                  Thử lại
                </Button>
              )}
              <Button variant="contained" color="secondary" onClick={handleCheckSection}>
                Kiểm tra
              </Button>
                <Button
                  variant="contained"
                  disabled={currentSectionIndex >= exercise.sections.length - 1}
                  onClick={() => {
                    const nextIndex = Math.min(currentSectionIndex + 1, exercise.sections.length - 1);
                    navigate(`/exercises/${buildSlugId(exercise.title ?? "", exercise._id)}?section=${nextIndex}`);
                    setCurrentSectionIndex(nextIndex);
                    setCheckedResults({});
                    setShowResult(false);
                  }}
                >
                  Phần tiếp theo
                </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={showResult} onClose={() => {}} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
            Kết quả bài làm
          </Box>
        </DialogTitle>
        <DialogContent>
          {score && score.maxScore > 0 ? (
            <Box>
              <Typography variant="h4" align="center" gutterBottom>
                {Math.round((score.score / score.maxScore) * 100)}%
              </Typography>
              <Typography variant="body1" align="center" color="text.secondary">
                Điểm số: {score.score} / {score.maxScore}
              </Typography>
              <Alert severity="success" sx={{ mt: 2 }}>
                Bài làm đã được lưu vào hồ sơ học tập của bạn!
              </Alert>
            </Box>
          ) : (
            <Box>
              <Typography variant="body1" align="center" color="text.secondary">
                Phần này không có câu hỏi được chấm tự động — kết quả đã được lưu (lần làm gần nhất).
              </Typography>
              <Alert severity="info" sx={{ mt: 2 }}>
                Kết quả (ghi âm, video, ...) sẽ được lưu và có thể được đánh giá thủ công sau.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResult(false)} variant="contained">
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
