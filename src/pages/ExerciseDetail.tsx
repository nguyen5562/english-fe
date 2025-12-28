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
import { getExercise, getUser, saveExerciseAttempt, getExerciseAttempts } from '../services/storage';
import type { Exercise, Question, QuestionType, ExerciseAttempt } from '../types';

export default function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [exercise] = useState<Exercise | null>(() => (id ? getExercise(id) : null));
  const initialSectionIndex = Number(searchParams.get('section') ?? 0);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(initialSectionIndex);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(() => {
    if (!id) return {};
    const loadedExercise = getExercise(id);
    if (!loadedExercise) return {};
    const initialAnswers: Record<string, string | string[]> = {};
    const allQuestions = loadedExercise.sections.flatMap((section) => section.questions);
    allQuestions.forEach((q) => {
      const section = loadedExercise.sections.find((s) => s.questions.some((sq) => sq.id === q.id));
      const effectiveType = q.type ?? section?.questionType;
      // fill-blank cần mảng, các kiểu khác dùng string
      if (effectiveType === 'fill-blank') {
        initialAnswers[q.id] = [];
      } else {
        initialAnswers[q.id] = '';
      }
    });
    return initialAnswers;
  });
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState<{ score: number; maxScore: number } | null>(null);
  // result per question after checking this section
  const [checkedResults, setCheckedResults] = useState<Record<string, { graded: boolean; correct?: boolean; correctAnswer: string | string[] }>>({});
  const [recordingStatus, setRecordingStatus] = useState<Record<string, 'idle' | 'recording' | 'recorded'>>({});
  const [recordings, setRecordings] = useState<Record<string, string | null>>({});
  const mediaRecordersRef = useRef<Record<string, MediaRecorder | null>>({});
  const user = getUser();

  // Last saved attempt for the current section (if any)
  const [lastAttempt, setLastAttempt] = useState<ExerciseAttempt | null>(null);
  // Whether we are viewing a saved (graded) result for this section — when true inputs are shown read-only
  const [viewingSaved, setViewingSaved] = useState(false);
  // When true, temporarily ignore loading saved attempts (used after pressing "Thử lại")
  const [ignoringSaved, setIgnoringSaved] = useState(false);
  // Local key used to force-remount the section UI when retrying (ensures uncontrolled parts reset)
  const [retryKey, setRetryKey] = useState<number>(0);

  // Map sectionType to label and color (used for Chips in detail view)
  const sectionTypeMap: Record<string, { label: string; color?: 'primary'|'secondary'|'error'|'info'|'success'|'warning' }> = {
    grammar: { label: 'Grammar', color: 'primary' },
    vocabulary: { label: 'Vocabulary', color: 'success' },
    listening: { label: 'Listening', color: 'info' },
    reading: { label: 'Reading', color: 'warning' },
    pronunciation: { label: 'Pronunciation', color: 'secondary' },
    speaking: { label: 'Speaking', color: 'error' },
    writing: { label: 'Writing', color: 'warning' },
    mixed: { label: 'Mixed' },
  };

  // Make sure the requested initial section index is within bounds
  useEffect(() => {
    if (!exercise) return;
    const clamped = Math.max(0, Math.min(initialSectionIndex, exercise.sections.length - 1));
    // Delay setting state to next tick to avoid synchronous setState inside effect
    const id = window.setTimeout(() => {
      setCurrentSectionIndex((prev) => (prev === clamped ? prev : clamped));
    }, 0);
    return () => window.clearTimeout(id);
  }, [exercise, initialSectionIndex]);

  // Helper: clear loaded attempt/view state (deferred to avoid sync setState-in-effect)
  const clearLoadedState = () => {
    window.setTimeout(() => {
      setLastAttempt(null);
      setViewingSaved(false);
      setCheckedResults({});
      setScore(null);
    }, 0);
  };

  const isSectionGraded = useCallback((section: Exercise['sections'][number]) =>
    section.questionType !== 'pronunciation' && section.questionType !== 'video-recording',
  []);

  // Load last saved attempt when switching sections (and preload answers / show saved results)
  useEffect(() => {
    // If user pressed "Thử lại" and we're ignoring saved attempts, don't load saved data
    if (ignoringSaved) {
      clearLoadedState();
      return;
    }

    if (!exercise || !user) {
      clearLoadedState();
      return;
    }

    const section = exercise.sections[currentSectionIndex];
    if (!section) return;

    const attempts = getExerciseAttempts(user.id, exercise.id).filter((a) => a.sectionIndex === currentSectionIndex);
    if (attempts.length === 0) {
      clearLoadedState();
      return;
    }

    const last = attempts
      .slice()
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];

    // Defer state updates to avoid synchronous setState in effect
    window.setTimeout(() => {
      setLastAttempt(last);

      // Pre-fill answers from last attempt
      setAnswers((prev) => {
        const next = { ...prev };
        last.answers.forEach((a) => {
          next[a.questionId] = a.answer as string | string[];
        });
        return next;
      });

      if (isSectionGraded(section)) {
        // Compute grading based on saved answers
        let totalScore = 0;
        let maxScore = 0;
        const results: Record<string, { graded: boolean; correct?: boolean; correctAnswer: string | string[] }> = {};

        section.questions.forEach((q) => {
          maxScore += q.points;
          const ansObj = last.answers.find((x) => x.questionId === q.id);
          const userAnswer = ansObj ? ansObj.answer : (Array.isArray(q.correctAnswer) ? [] : '');
          const correctAnswer = q.correctAnswer;
          let correct = false;

          if (Array.isArray(correctAnswer)) {
            if (Array.isArray(userAnswer) && JSON.stringify((userAnswer as string[]).slice().sort()) === JSON.stringify((correctAnswer as string[]).slice().sort())) {
              totalScore += q.points;
              correct = true;
            }
          } else {
            if (userAnswer === correctAnswer) {
              totalScore += q.points;
              correct = true;
            }
          }

          results[q.id] = { graded: true, correct, correctAnswer };
        });

        setCheckedResults(results);
        setScore({ score: totalScore, maxScore });
        setViewingSaved(true);
      } else {
        // Non-graded: show 'Đã lưu (không chấm tự động)' markers but keep inputs editable
        const results: Record<string, { graded: boolean; correctAnswer: string | string[] }> = {};
        section.questions.forEach((q) => {
          results[q.id] = { graded: false, correctAnswer: q.correctAnswer };
        });
        setCheckedResults(results);
        setScore(null);
        setViewingSaved(false);
      }
    }, 0);
  }, [currentSectionIndex, user, exercise, ignoringSaved, isSectionGraded]);

  // Reset ignoringSaved when user navigates to another section so saved attempts load again
  useEffect(() => {
    const t = window.setTimeout(() => setIgnoringSaved(false), 0);
    return () => window.clearTimeout(t);
  }, [currentSectionIndex]);

  if (!exercise) {
    return (
      <Box>
        <Typography>Đang tải...</Typography>
      </Box>
    );
  }

  const allQuestions = exercise.sections.flatMap((section) => section.questions);
  const currentSection = exercise.sections[currentSectionIndex];



  const startRecording = async (questionId: string) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Trình duyệt không hỗ trợ ghi âm.');
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
      alert('Không thể bắt đầu ghi âm. Vui lòng kiểm tra quyền micro.');
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

  // Check answers for current section, mark correct/incorrect, show correct answers and save attempt (per-section)
  const handleCheckSection = () => {
    const section = currentSection;
    let totalScore = 0;
    let maxScore = 0;
    const results: Record<string, { graded: boolean; correct?: boolean; correctAnswer: string | string[] }> = {};

    // Decide grading for whole section based on ExerciseSection.questionType
    const sectionIsGraded = section.questionType !== 'pronunciation' && section.questionType !== 'video-recording';

    section.questions.forEach((question) => {
      // If section is not graded (e.g., pronunciation / video-recording), mark as non-graded
      if (!sectionIsGraded) {
        results[question.id] = { graded: false, correctAnswer: question.correctAnswer };
        return;
      }

      // Graded section: evaluate each question
      maxScore += question.points;
      const userAnswer = answers[question.id];
      const correctAnswer = question.correctAnswer;
      let correct = false;

      if (Array.isArray(correctAnswer)) {
        if (Array.isArray(userAnswer) && JSON.stringify(userAnswer.sort()) === JSON.stringify(correctAnswer.sort())) {
          totalScore += question.points;
          correct = true;
        }
      } else {
        if (userAnswer === correctAnswer) {
          totalScore += question.points;
          correct = true;
        }
      }

      results[question.id] = { graded: true, correct, correctAnswer };
    });

    setCheckedResults(results);
    setScore({ score: totalScore, maxScore });
    setShowResult(true);

    // Save per-section attempt
    if (user) {
      // ensure each answer is either string or string[] (matching ExerciseAttempt type)
      const sectionAnswers = section.questions.map((q) => {
        const a = answers[q.id];
        if (Array.isArray(a)) {
          // fill-blank or multi answers
          return { questionId: q.id, answer: a as string[] };
        }
        return { questionId: q.id, answer: (a ?? '') as string };
      });

      // Khi nhấn Kiểm tra: luôn lưu lần làm gần nhất (ghi đè) — không giữ điểm cao nhất
      saveExerciseAttempt({
        id: Date.now().toString(),
        exerciseId: exercise.id,
        studentId: user.id,
        sectionIndex: currentSectionIndex,
        answers: sectionAnswers,
        score: totalScore,
        maxScore,
        completedAt: new Date(),
      });

      // If user was retrying, stop ignoring so the saved result can be displayed
      setIgnoringSaved(false);
    }
  };

  // Helpers used by retry/reset
  const stopAndClearRecorders = (section: Exercise['sections'][number]) => {
    section.questions.forEach((q) => {
      const r = mediaRecordersRef.current[q.id];
      if (r && r.state === 'recording') {
        try { r.stop(); } catch { /* ignore */ }
        try { r.stream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
      }
      mediaRecordersRef.current[q.id] = null;
    });

    setRecordings((prev) => {
      const next = { ...prev };
      section.questions.forEach((q) => { next[q.id] = null; });
      return next;
    });

    setRecordingStatus((prev) => {
      const next = { ...prev };
      section.questions.forEach((q) => { next[q.id] = 'idle'; });
      return next;
    });
  };

  const resetAnswersForSection = (section: Exercise['sections'][number]) => {
    setAnswers((prev) => {
      const next = { ...prev };
      section.questions.forEach((q) => {
        const effectiveType = q.type ?? section.questionType;
        if (effectiveType === 'fill-blank') next[q.id] = [];
        else next[q.id] = '';
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
    const value = (answers[question.id] || '') as string;

    // Helper: render media (audio, image, video) for a question
    const renderQuestionMedia = () => (
      <>
        {question.imageUrl && (
          <Box sx={{ mb: 2 }}>
            <Box
              component="img"
              src={question.imageUrl}
              alt={question.question}
              sx={{ maxWidth: '100%', borderRadius: 1 }}
            />
          </Box>
        )}
        {question.audioUrl && (
          <Box sx={{ mb: 2 }}>
            <audio controls src={question.audioUrl}>
              Trình duyệt của bạn không hỗ trợ audio.
            </audio>
          </Box>
        )}
        {question.videoUrl && (
          <Box sx={{ mb: 2 }}>
            <video controls src={question.videoUrl} style={{ width: '100%', maxWidth: '800px', borderRadius: '8px' }}>
              Trình duyệt của bạn không hỗ trợ video.
            </video>
          </Box>
        )}
      </>
    );

    // Helper: render wordBank for a question (from question or section)
    const renderQuestionWordBank = () => {
      if (!question.wordBank || question.wordBank.length === 0) return null;

      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {question.wordBank.map((word) => (
            <Chip
              key={word}
              label={word}
              clickable
              onClick={() => {
                setAnswers((prev) => {
                  const current = (prev[question.id] as string) || '';
                  const next = current ? `${current} ${word}` : word;
                  return { ...prev, [question.id]: next };
                });
              }}
            />
          ))}
        </Box>
      );
    };

    // Helper: render MC-style question
    const renderMultipleChoice = () => (
      <Box>
        {renderQuestionMedia()}
        {renderQuestionWordBank()}
        <FormControl component="fieldset" fullWidth>
          <FormLabel component="legend">{question.question}</FormLabel>
          <RadioGroup
            value={value}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
          >
            {question.options?.map((option, index) => (
              <FormControlLabel
                key={index}
                value={option}
                control={<Radio key={`${question.id}-${index}-${retryKey}`} disabled={viewingSaved} />}
                label={option}
              />
            ))}
          </RadioGroup>
        </FormControl>
      </Box>
    );

    const questionType: QuestionType | undefined = question.type ?? sectionQuestionType;

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
        // question.question chứa câu hỏi với chỗ trống, cần parse để tìm vị trí dropdown
        const parts = question.question.split('____');
        const hasBlank = parts.length > 1;

        return (
          <Box>
            {renderQuestionMedia()}
            {renderQuestionWordBank()}
            {hasBlank ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                {parts.map((part, index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography component="span" variant="body1">
                      {part}
                    </Typography>
                    {index < parts.length - 1 && (
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select key={`${question.id}-${index}-${retryKey}`}
                          value={value || ''}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
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
                <InputLabel>{question.question}</InputLabel>
                <Select key={`${question.id}-${retryKey}`}
                  value={value || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  label={question.question}
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
            {renderQuestionMedia()}
            {renderQuestionWordBank()}
            <Typography variant="body1" gutterBottom>
              {question.question}
            </Typography>
            <TextField
              key={`${question.id}-${retryKey}`}
              fullWidth
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Nhập câu trả lời của bạn"
              disabled={viewingSaved}
            />
          </Box>
        );

      case 'pronunciation': {
        const status = recordingStatus[question.id] ?? 'idle';
        const hasRecording = !!recordings[question.id];

        return (
          <Box>
            {renderQuestionMedia()}
            {renderQuestionWordBank()}
            <Typography variant="body1" gutterBottom>
              {question.question}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Hãy nghe mẫu và ghi âm lại phát âm của bạn.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Button
                variant="contained"
                size="small"
                disabled={status === 'recording' || viewingSaved}
                onClick={() => startRecording(question.id)}
              >
                {status === 'recording' ? 'Đang ghi...' : 'Ghi âm'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                disabled={status !== 'recording' || viewingSaved}
                onClick={() => stopRecording(question.id)}
              >
                Dừng
              </Button>
            </Box>
            {hasRecording && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Bản ghi của bạn:
                </Typography>
                <audio controls src={recordings[question.id] ?? undefined} />
              </Box>
            )}
          </Box>
        );
      }

      case 'fill-sentence':
        // Điền từ vào chỗ trống
        return (
          <Box>
            {renderQuestionMedia()}
            {renderQuestionWordBank()}
            <Typography variant="body1" gutterBottom>
              {question.question}
            </Typography>
            <TextField
              key={`${question.id}-${retryKey}`}
              fullWidth
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Nhập câu trả lời của bạn"
              disabled={viewingSaved}
            />
          </Box>
        );

      case 'word-order':
        // Sắp xếp lại các từ thành câu đúng trật tự
        return (
          <Box>
            {renderQuestionMedia()}
            {renderQuestionWordBank()}
            <Typography variant="body1" gutterBottom>
              {question.question}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Hãy viết lại câu đúng trật tự.
            </Typography>
            <TextField
              key={`${question.id}-${retryKey}`}
              fullWidth
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Nhập câu trả lời của bạn"
              disabled={viewingSaved}
            />
          </Box>
        );

      case 'word-bank':
        {
          return (
            <Box>
              {renderQuestionMedia()}
              {renderQuestionWordBank()}
              <Typography variant="body1" gutterBottom>
                {question.question}
              </Typography>
              <TextField
                key={`${question.id}-${retryKey}`}
                fullWidth
                variant="outlined"
                value={value}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                placeholder="Nhập câu trả lời của bạn"
                disabled={viewingSaved}
              />
            </Box>
          );
        }

      case 'fill-blank': {
        // Nghe và điền từ vào chỗ trống - mỗi câu có nhiều chỗ trống
        // question.question chứa template với ____, correctAnswer là mảng các từ
        // Mỗi câu hỏi có thể có audioUrl riêng
        const blanks = question.question.split('____');
        const answerArray = Array.isArray(answers[question.id])
          ? (answers[question.id] as string[])
          : typeof answers[question.id] === 'string' && answers[question.id]
            ? (answers[question.id] as string).split(',').map((s) => s.trim())
            : Array(blanks.length - 1).fill('');

        return (
          <Box>
            {renderQuestionMedia()}
            {renderQuestionWordBank()}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
              {blanks.map((part, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography component="span">{part}</Typography>
                  {index < blanks.length - 1 && (
                    <TextField
                      size="small"
                      value={answerArray[index] || ''}
                      onChange={(e) => {
                        const newArray = [...answerArray];
                        newArray[index] = e.target.value;
                        setAnswers((prev) => ({ ...prev, [question.id]: newArray }));
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
            {renderQuestionMedia()}
            {renderQuestionWordBank()}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Điền từ vào chỗ trống số {question.question}:
            </Typography>
            <TextField
              key={`${question.id}-${retryKey}`}
              fullWidth
              size="small"
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
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
        const status = recordingStatus[question.id] ?? 'idle';
        const hasRecording = !!recordings[question.id];

        return (
          <Box>
            {renderQuestionMedia()}
            {renderQuestionWordBank()}
            <Typography variant="body1" gutterBottom>
              {question.question}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Hãy xem video ở trên, sau đó ghi âm lại nội dung bạn đã xem.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
              <Button
                variant="contained"
                size="small"
                disabled={status === 'recording' || viewingSaved}
                onClick={() => startRecording(question.id)}
                sx={{ bgcolor: 'pink', '&:hover': { bgcolor: '#e91e63' } }}
              >
                {status === 'recording' ? 'Đang ghi...' : 'Ghi âm'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                disabled={status !== 'recording' || viewingSaved}
                onClick={() => stopRecording(question.id)}
              >
                Dừng
              </Button>
            </Box>
            {hasRecording && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  Bản ghi của bạn:
                </Typography>
                <audio controls src={recordings[question.id] ?? undefined} />
              </Box>
            )}
          </Box>
        );
      }

      case 'writing':
        // Bài viết dài (ví dụ: viết profile, viết đoạn văn)
        return (
          <Box>
            {renderQuestionMedia()}
            {renderQuestionWordBank()}
            <Typography variant="body1" gutterBottom>
              {question.question}
            </Typography>
            <TextField
              key={`${question.id}-${retryKey}`}
              fullWidth
              multiline
              rows={8}
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Nhập bài viết của bạn"
            />
          </Box>
        );

      default:
        return (
          <Box>
            {renderQuestionMedia()}
            {renderQuestionWordBank()}
            <Typography variant="body1" gutterBottom>
              {question.question}
            </Typography>
            <TextField
              key={`${question.id}-${retryKey}`}
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
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
          <Box key={`${currentSection.id}-${retryKey}`}>
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

            {(currentSection.audioUrl || currentSection.videoUrl || currentSection.imageUrl || currentSection.passage) && (
              <Box sx={{ mb: 2 }}>
                {currentSection.audioUrl && (
                  <Box sx={{ mb: 1 }}>
                    <audio controls src={currentSection.audioUrl}>
                      Trình duyệt của bạn không hỗ trợ audio.
                    </audio>
                  </Box>
                )}
                {currentSection.videoUrl && (
                  <Box sx={{ mb: 1 }}>
                    <video controls src={currentSection.videoUrl} style={{ width: '100%', maxWidth: '800px', borderRadius: '8px' }}>
                      Trình duyệt của bạn không hỗ trợ video.
                    </video>
                  </Box>
                )}
                {currentSection.imageUrl && (
                  <Box
                    component="img"
                    src={currentSection.imageUrl}
                    alt={currentSection.title}
                    sx={{ maxWidth: '100%', borderRadius: 1 }}
                  />
                )}
                {currentSection.passage && currentSection.questionType !== 'paragraph-fill' && (
                  <Box
                    sx={{
                      p: 1,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.300',
                      whiteSpace: 'pre-wrap',
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1">{currentSection.passage}</Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Word bank cho toàn phần (nếu có) */}
            {currentSection.wordBank && currentSection.wordBank.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {currentSection.wordBank.map((word) => (
                  <Chip key={word} label={word} />
                ))}
              </Box>
            )}

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
                              key={`${currentSection.questions[index].id}-${retryKey}`}
                              size="small"
                              value={(answers[currentSection.questions[index].id] as string) || ''}
                              onChange={(e) =>
                                handleAnswerChange(currentSection.questions[index].id, e.target.value)
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
                  const result = checkedResults[question.id];
                  const bg = result ? (result.correct ? 'rgba(56, 142, 60, 0.06)' : 'rgba(211, 47, 47, 0.04)') : 'transparent';
                  const borderColorToken = result ? (result.correct ? 'success.main' : 'error.main') : 'transparent';

                  const formatAnswer = (ans: string | string[]) => {
                    if (Array.isArray(ans)) return ans.join(', ');
                    return String(ans ?? '');
                  };

                  return (
                    <Box key={question.id} sx={{ p: 1, borderLeft: '3px solid', borderColor: borderColorToken, background: bg, borderRadius: 1, mb: 1 }}>
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
                navigate(`/exercises/${exercise.id}?section=${nextIndex}`);
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
              {currentSectionIndex < exercise.sections.length - 1 && (
                <Button
                  variant="contained"
                  onClick={() => {
                    const nextIndex = Math.min(currentSectionIndex + 1, exercise.sections.length - 1);
                    navigate(`/exercises/${exercise.id}?section=${nextIndex}`);
                    setCurrentSectionIndex(nextIndex);
                    setCheckedResults({});
                    setShowResult(false);
                  }}
                >
                  Phần tiếp theo
                </Button>
              )}
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
