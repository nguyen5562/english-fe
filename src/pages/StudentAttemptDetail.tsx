import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Link,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { userService } from '../services/user.service';
import { exerciseService } from '../services/exercise.service';
import { quizService } from '../services/quiz.service';
import { exerciseAttemptService } from '../services/exercise-attempt.service';
import { quizAttemptService } from '../services/quiz-attempt.service';
import { toast } from '../utils/toast';
import {
  renderQuestionMedia,
  renderSectionMedia,
  resolveUrl,
} from '../utils/questionHelpers';
import type {
  User,
  Exercise,
  Quiz,
  ExerciseAttempt,
  QuizAttempt,
} from '../types';

// Helper function to render file-based answers
const renderFileAnswer = (answer: string) => {
  const isFile = answer.startsWith('/') || answer.startsWith('http');

  if (!isFile) {
    return (
      <Chip
        label={answer}
        size="small"
        color="info"
        sx={{ mr: 0.5, mb: 0.5 }}
      />
    );
  }

  const fileUrl = resolveUrl(answer);
  const fileName = answer.split('/').pop() || 'file';
  const fileExt = fileName.split('.').pop()?.toLowerCase();

  const isAudio = ['mp3', 'wav', 'ogg', 'webm', 'm4a'].includes(fileExt || '');
  const isVideo = ['mp4', 'webm', 'mov'].includes(fileExt || '');

  return (
    <Box
      sx={{
        mb: 1,
        p: 1.5,
        bgcolor: 'success.lighter',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'success.main',
      }}
    >
      {isAudio ? (
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 0.5,
              color: 'success.dark',
              fontWeight: 600,
            }}
          >
            🎤 Audio file:
          </Typography>
          <audio
            controls
            src={fileUrl}
            style={{ width: '100%', maxWidth: '400px' }}
          />
          <Link
            href={fileUrl}
            target="_blank"
            rel="noopener"
            sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem' }}
          >
            Download
          </Link>
        </Box>
      ) : isVideo ? (
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 0.5,
              color: 'success.dark',
              fontWeight: 600,
            }}
          >
            🎥 Video file:
          </Typography>
          <video
            controls
            src={fileUrl}
            style={{ width: '100%', maxWidth: '400px' }}
          />
          <Link
            href={fileUrl}
            target="_blank"
            rel="noopener"
            sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem' }}
          >
            Download
          </Link>
        </Box>
      ) : (
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mb: 0.5,
              color: 'success.dark',
              fontWeight: 600,
            }}
          >
            📄 File attachment:
          </Typography>
          <Link
            href={fileUrl}
            target="_blank"
            rel="noopener"
            sx={{ fontWeight: 600 }}
          >
            {fileName}
          </Link>
        </Box>
      )}
    </Box>
  );
};

export default function StudentAttemptDetail() {
  const { type, id } = useParams<{ type: 'exercise' | 'quiz'; id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const studentId = searchParams.get('studentId');
  const attemptType = type;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [student, setStudent] = useState<User | null>(null);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [exerciseAttempts, setExerciseAttempts] = useState<ExerciseAttempt[]>(
    [],
  );
  const [quizAttempt, setQuizAttempt] = useState<QuizAttempt | null>(null);

  useEffect(() => {
    if (!studentId || !id) {
      setError('Missing student ID or exercise/quiz ID');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch student info
        const studentData = await userService.getUserById(studentId);
        setStudent(studentData);

        if (attemptType === 'exercise') {
          // Fetch exercise and attempts
          const exerciseData = await exerciseService.getExerciseById(id);
          setExercise(exerciseData);

          // Get all attempts for this exercise, then filter by student
          const allAttempts =
            await exerciseAttemptService.getExerciseAttemptByExerciseId(id);
          const studentAttempts = allAttempts.filter((attempt) => {
            const userId =
              typeof attempt.userId === 'object'
                ? (attempt.userId as any)._id
                : attempt.userId;
            return String(userId) === String(studentId);
          });
          setExerciseAttempts(studentAttempts);
        } else if (attemptType === 'quiz') {
          // Fetch quiz and attempt
          const quizData = await quizService.getQuizById(id);
          setQuiz(quizData);

          // Get all attempts for this quiz, then filter by student
          const allAttempts =
            await quizAttemptService.getQuizAttemptByQuizId(id);
          const studentAttempt = allAttempts.find((attempt) => {
            const userId =
              typeof attempt.userId === 'object'
                ? (attempt.userId as any)._id
                : attempt.userId;
            return String(userId) === String(studentId);
          });
          setQuizAttempt(studentAttempt || null);
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.message || 'Failed to load data');
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId, id, attemptType]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mt: 2 }}
        >
          Back
        </Button>
      </Box>
    );
  }

  // ── Excel export ──────────────────────────────────────────────────────
  const handleExportExcel = () => {
    if (attemptType === 'exercise' && exercise && exerciseAttempts.length > 0) {
      // Collect section scores from all attempts (use last/best per section)
      const sectionScoreMap: Record<string, { section: string; score: number; maxScore: number; tries: number }> = {};

      exerciseAttempts.forEach((attempt) => {
        (attempt.sectionAttempts ?? []).forEach((sa) => {
          const sectionId =
            typeof sa.sectionId === 'object' ? (sa.sectionId as any)._id : sa.sectionId;
          const section = exercise.sections.find((s: any) => String(s._id) === String(sectionId));
          if (!section) return;
          const maxScore = (section.questions ?? []).reduce((sum: number, q: any) => sum + (q.point ?? 0), 0);
          const existing = sectionScoreMap[sectionId];
          if (!existing || (sa.tries ?? 0) >= existing.tries) {
            sectionScoreMap[sectionId] = {
              section: section.title || sectionId,
              score: sa.score ?? 0,
              maxScore,
              tries: sa.tries ?? 0,
            };
          }
        });
      });

      const rows = Object.values(sectionScoreMap).map((r) => ({
        'Exercise': exercise.title,
        'Section': r.section,
        'Score': r.score,
        'Max Score': r.maxScore,
        'Percentage': r.maxScore > 0 ? `${Math.round((r.score / r.maxScore) * 100)}%` : 'N/A',
        'Attempts': r.tries,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Scores');
      XLSX.writeFile(wb, `${student?.username ?? 'student'}_${exercise.title}_scores.xlsx`);
    } else if (attemptType === 'quiz' && quiz && quizAttempt) {
      const maxScore = (quiz.sections ?? []).reduce((sum, section) => {
        if (['pronunciation', 'video-recording', 'writing'].includes(section.questionType)) return sum;
        return sum + (section.questions ?? []).reduce((s, q) => s + (q.point ?? 0), 0);
      }, 0);

      const rows = [{
        'Quiz': quiz.title,
        'Score': quizAttempt.totalScore ?? 0,
        'Max Score': maxScore,
        'Percentage': maxScore > 0 ? `${Math.round(((quizAttempt.totalScore ?? 0) / maxScore) * 100)}%` : 'Completed',
        'Submitted At': quizAttempt.submittedAt ? new Date(quizAttempt.submittedAt).toLocaleString('vi-VN') : 'N/A',
      }];

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Scores');
      XLSX.writeFile(wb, `${student?.username ?? 'student'}_${quiz.title}_scores.xlsx`);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportExcel}
            disabled={
              (attemptType === 'exercise' && exerciseAttempts.length === 0) ||
              (attemptType === 'quiz' && !quizAttempt)
            }
          >
            Export Excel
          </Button>
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Attempt details
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip label={`Student: ${student?.username}`} color="primary" />
          <Chip label={`Email: ${student?.email}`} variant="outlined" />
          {attemptType === 'exercise' && exercise && (
            <Chip label={`Exercise: ${exercise.title}`} color="secondary" />
          )}
          {attemptType === 'quiz' && quiz && (
            <Chip label={`Quiz: ${quiz.title}`} color="secondary" />
          )}
        </Box>
      </Box>

      {/* Exercise Attempts */}
      {attemptType === 'exercise' && exercise && (
        <Box>
          {exerciseAttempts.length === 0 ? (
            <Alert severity="info">Student has not done this exercise</Alert>
          ) : (
            exerciseAttempts.map((attempt) => (
              <Box key={attempt._id} sx={{ mb: 4 }}>
                {(attempt.sectionAttempts ?? []).map((sectionAttempt, idx) => {
                  const sectionId =
                    typeof sectionAttempt.sectionId === 'object'
                      ? (sectionAttempt.sectionId as any)._id
                      : sectionAttempt.sectionId;
                  const section = exercise.sections.find(
                    (s: any) => String(s._id) === String(sectionId),
                  );

                  if (!section) return null;

                  const maxScore = (section.questions ?? []).reduce(
                    (sum: number, q: any) => sum + (q.point ?? 0),
                    0,
                  );

                  return (
                    <Card key={idx} sx={{ mb: 3 }}>
                      <CardContent>
                        {/* Section Header */}
                        <Typography
                          variant="h5"
                          sx={{ fontWeight: 600, mb: 2 }}
                        >
                          {section.title || 'Unknown Section'}
                        </Typography>
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 2,
                            mb: 3,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Chip
                            label={`Score: ${sectionAttempt.score ?? 0}/${maxScore}`}
                            color={
                              sectionAttempt.score === maxScore
                                ? 'success'
                                : 'warning'
                            }
                          />
                          <Chip
                            label={`Number of attempts: ${sectionAttempt.tries ?? 0}`}
                          />
                          {sectionAttempt.submittedAt && (
                            <Chip
                              label={`Submitted: ${new Date(sectionAttempt.submittedAt).toLocaleString('vi-VN')}`}
                              variant="outlined"
                            />
                          )}
                        </Box>

                        {/* Section Media */}
                        {renderSectionMedia(section)}

                        {/* Questions */}
                        {(section.questions ?? []).map(
                          (question: any, qIdx: number) => {
                            const studentAnswer = (
                              sectionAttempt.answers ?? []
                            ).find(
                              (ans) =>
                                String(ans.questionId) === String(question._id),
                            );

                            const isNonGradable = [
                              'pronunciation',
                              'video-recording',
                              'writing',
                            ].includes(section.questionType);
                            const isCorrect =
                              !isNonGradable &&
                              studentAnswer &&
                              JSON.stringify(studentAnswer.answer?.sort()) ===
                                JSON.stringify(question.correctAnswer?.sort());

                            let bgColor = 'background.paper';
                            let borderColor = 'divider';
                            let icon = null;

                            if (isNonGradable) {
                              bgColor = 'info.lighter';
                              borderColor = 'info.main';
                              icon = (
                                <InfoIcon
                                  sx={{ color: 'info.main', mt: 0.5 }}
                                />
                              );
                            } else if (isCorrect) {
                              bgColor = 'success.lighter';
                              borderColor = 'success.main';
                              icon = (
                                <CheckCircleIcon
                                  sx={{ color: 'success.main', mt: 0.5 }}
                                />
                              );
                            } else {
                              bgColor = 'error.lighter';
                              borderColor = 'error.main';
                              icon = (
                                <CancelIcon
                                  sx={{ color: 'error.main', mt: 0.5 }}
                                />
                              );
                            }

                            return (
                              <Box
                                key={question._id}
                                sx={{
                                  mb: 3,
                                  p: 2,
                                  bgcolor: bgColor,
                                  borderRadius: 1,
                                  border: '2px solid',
                                  borderColor: borderColor,
                                }}
                              >
                                {/* Question Header */}
                                <Box
                                  sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    mb: 2,
                                  }}
                                >
                                  {icon}
                                  <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 600 }}
                                  >
                                    Question {qIdx + 1}
                                  </Typography>
                                  <Chip
                                    label={`${question.point} points`}
                                    size="small"
                                  />
                                </Box>

                                {/* Question Media */}
                                {renderQuestionMedia(question)}

                                {/* Question Content */}
                                <Typography
                                  variant="body1"
                                  sx={{ mb: 2, whiteSpace: 'pre-wrap' }}
                                >
                                  {question.title}
                                </Typography>

                                {/* Options */}
                                {question.options &&
                                  question.options.length > 0 && (
                                    <Box sx={{ mb: 2, pl: 2 }}>
                                      {(() => {
                                        const effectiveType = (question as any).type || section.questionType;
                                        const blanksCount = (question.title || '').split('____').length - 1;
                                        const isPerBlankOptions =
                                          effectiveType === 'dropdown-choice' &&
                                          question.options.length === blanksCount;

                                        if (isPerBlankOptions) {
                                          return question.options.map((optString: string, optIdx: number) => (
                                            <Typography key={optIdx} variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                                              <strong>Blank {optIdx + 1} options:</strong> {optString}
                                            </Typography>
                                          ));
                                        }

                                        return question.options.map(
                                          (option: string, optIdx: number) => {
                                            const isCorrectOption =
                                              question.correctAnswer?.includes(
                                                option,
                                              );
                                            const isStudentChoice =
                                              studentAnswer?.answer?.includes(
                                                option,
                                              );

                                            return (
                                              <Typography
                                                key={optIdx}
                                                variant="body2"
                                                sx={{
                                                  color: 'text.secondary',
                                                  fontWeight: isCorrectOption
                                                    ? 600
                                                    : 400,
                                                  bgcolor:
                                                    isStudentChoice &&
                                                    !isCorrectOption
                                                      ? 'error.lighter'
                                                      : 'transparent',
                                                  p: 0.5,
                                                  borderRadius: 0.5,
                                                }}
                                              >
                                                {String.fromCharCode(65 + optIdx)}
                                                . {option}
                                                {isCorrectOption && ' ✓'}
                                              </Typography>
                                            );
                                          },
                                        );
                                      })()}
                                    </Box>
                                  )}

                                {/* Word Bank */}
                                {question.wordBank &&
                                  question.wordBank.length > 0 && (
                                    <Box
                                      sx={{
                                        mb: 2,
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 0.5,
                                      }}
                                    >
                                      <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 600, mr: 1 }}
                                      >
                                        Word bank:
                                      </Typography>
                                      {question.wordBank.map(
                                        (word: string, wIdx: number) => (
                                          <Chip
                                            key={wIdx}
                                            label={word}
                                            size="small"
                                            variant="outlined"
                                          />
                                        ),
                                      )}
                                    </Box>
                                  )}

                                <Divider sx={{ my: 2 }} />

                                {/* Student Answer Section */}
                                <Box
                                  sx={{
                                    p: 2,
                                    bgcolor: 'background.default',
                                    borderRadius: 1,
                                  }}
                                >
                                  <Typography
                                    variant="subtitle2"
                                    sx={{
                                      mb: 1.5,
                                      fontWeight: 700,
                                      color: 'primary.main',
                                    }}
                                  >
                                    📝 Student answer:
                                  </Typography>

                                  {isNonGradable ? (
                                    <Box>
                                      {studentAnswer?.answer &&
                                      studentAnswer.answer.length > 0 ? (
                                        studentAnswer.answer.map(
                                          (ans: string, idx: number) => (
                                            <Box key={idx}>
                                              {renderFileAnswer(ans)}
                                            </Box>
                                          ),
                                        )
                                      ) : (
                                        <Chip
                                          label="(Not answered)"
                                          size="small"
                                          color="default"
                                        />
                                      )}
                                    </Box>
                                  ) : (
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        color: isCorrect
                                          ? 'success.main'
                                          : 'error.main',
                                        fontWeight: 600,
                                      }}
                                    >
                                      {studentAnswer?.answer?.join(', ') ||
                                        '(Not answered)'}
                                    </Typography>
                                  )}

                                  {!isNonGradable && !isCorrect && (
                                    <Typography
                                      variant="body2"
                                      sx={{ color: 'success.main', mt: 1 }}
                                    >
                                      <strong>Correct answer:</strong>{' '}
                                      {question.correctAnswer?.join(', ')}
                                    </Typography>
                                  )}

                                  {isNonGradable && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: 'info.main',
                                        fontStyle: 'italic',
                                        display: 'block',
                                        mt: 1,
                                      }}
                                    >
                                      * Question type {section.questionType} is
                                      not automatically graded
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            );
                          },
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Box>
            ))
          )}
        </Box>
      )}

      {/* Quiz Attempt */}
      {attemptType === 'quiz' && quiz && (
        <Box>
          {!quizAttempt ? (
            <Alert severity="info">Student has not done this quiz</Alert>
          ) : (
            <Box>
              {/* Quiz Summary */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                    Overview
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip
                      label={`Score: ${quizAttempt.totalScore ?? 0}`}
                      color="primary"
                      size="medium"
                    />
                    <Chip
                      label={`Started: ${quizAttempt.startedAt ? new Date(quizAttempt.startedAt).toLocaleString('vi-VN') : 'N/A'}`}
                      variant="outlined"
                    />
                    <Chip
                      label={`Submitted: ${quizAttempt.submittedAt ? new Date(quizAttempt.submittedAt).toLocaleString('vi-VN') : 'N/A'}`}
                      variant="outlined"
                    />
                  </Box>
                </CardContent>
              </Card>

              {/* Quiz Sections */}
              {(quiz.sections ?? []).map((section: any, sIdx: number) => {
                return (
                  <Card key={section._id} sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                        {section.title || `Section ${sIdx + 1}`}
                      </Typography>

                      {/* Section Media */}
                      {renderSectionMedia(section)}

                      {/* Questions */}
                      {(section.questions ?? []).map(
                        (question: any, qIdx: number) => {
                          const studentAnswer = (
                            quizAttempt.answers ?? []
                          ).find(
                            (ans: any) =>
                              String(ans.questionId) === String(question._id),
                          );

                          const isNonGradable = [
                            'pronunciation',
                            'video-recording',
                            'writing',
                          ].includes(section.questionType);
                          const isCorrect =
                            !isNonGradable &&
                            studentAnswer &&
                            JSON.stringify(studentAnswer.answer?.sort()) ===
                              JSON.stringify(question.correctAnswer?.sort());

                          let bgColor = 'background.paper';
                          let borderColor = 'divider';
                          let icon = null;

                          if (isNonGradable) {
                            bgColor = 'info.lighter';
                            borderColor = 'info.main';
                            icon = (
                              <InfoIcon sx={{ color: 'info.main', mt: 0.5 }} />
                            );
                          } else if (isCorrect) {
                            bgColor = 'success.lighter';
                            borderColor = 'success.main';
                            icon = (
                              <CheckCircleIcon
                                sx={{ color: 'success.main', mt: 0.5 }}
                              />
                            );
                          } else {
                            bgColor = 'error.lighter';
                            borderColor = 'error.main';
                            icon = (
                              <CancelIcon
                                sx={{ color: 'error.main', mt: 0.5 }}
                              />
                            );
                          }

                          return (
                            <Box
                              key={question._id}
                              sx={{
                                mb: 3,
                                p: 2,
                                bgcolor: bgColor,
                                borderRadius: 1,
                                border: '2px solid',
                                borderColor: borderColor,
                              }}
                            >
                              {/* Question Header */}
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  mb: 2,
                                }}
                              >
                                {icon}
                                <Typography
                                  variant="h6"
                                  sx={{ fontWeight: 600 }}
                                >
                                  Question {qIdx + 1}
                                </Typography>
                                <Chip
                                  label={`${question.point} points`}
                                  size="small"
                                />
                              </Box>

                              {/* Question Media */}
                              {renderQuestionMedia(question)}

                              {/* Question Content */}
                              <Typography
                                variant="body1"
                                sx={{ mb: 2, whiteSpace: 'pre-wrap' }}
                              >
                                {question.title}
                              </Typography>

                              {/* Options */}
                              {question.options &&
                                question.options.length > 0 && (
                                  <Box sx={{ mb: 2, pl: 2 }}>
                                    {(() => {
                                      const effectiveType = (question as any).type || section.questionType;
                                      const blanksCount = (question.title || '').split('____').length - 1;
                                      const isPerBlankOptions =
                                        effectiveType === 'dropdown-choice' &&
                                        question.options.length === blanksCount;

                                      if (isPerBlankOptions) {
                                        return question.options.map((optString: string, optIdx: number) => (
                                          <Typography key={optIdx} variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
                                            <strong>Blank {optIdx + 1} options:</strong> {optString}
                                          </Typography>
                                        ));
                                      }

                                      return question.options.map(
                                        (option: string, optIdx: number) => {
                                          const isCorrectOption =
                                            question.correctAnswer?.includes(
                                              option,
                                            );
                                          const isStudentChoice =
                                            studentAnswer?.answer?.includes(
                                              option,
                                            );

                                          return (
                                            <Typography
                                              key={optIdx}
                                              variant="body2"
                                              sx={{
                                                color: 'text.secondary',
                                                fontWeight: isCorrectOption
                                                  ? 600
                                                  : 400,
                                                bgcolor:
                                                  isStudentChoice &&
                                                  !isCorrectOption
                                                    ? 'error.lighter'
                                                    : 'transparent',
                                                p: 0.5,
                                                borderRadius: 0.5,
                                              }}
                                            >
                                              {String.fromCharCode(65 + optIdx)}.{' '}
                                              {option}
                                              {isCorrectOption && ' ✓'}
                                            </Typography>
                                          );
                                        },
                                      );
                                    })()}
                                  </Box>
                                )}

                              {/* Word Bank */}
                              {question.wordBank &&
                                question.wordBank.length > 0 && (
                                  <Box
                                    sx={{
                                      mb: 2,
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: 0.5,
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                      sx={{ fontWeight: 600, mr: 1 }}
                                    >
                                      Word bank:
                                    </Typography>
                                    {question.wordBank.map(
                                      (word: string, wIdx: number) => (
                                        <Chip
                                          key={wIdx}
                                          label={word}
                                          size="small"
                                          variant="outlined"
                                        />
                                      ),
                                    )}
                                  </Box>
                                )}

                              <Divider sx={{ my: 2 }} />

                              {/* Student Answer Section */}
                              <Box
                                sx={{
                                  p: 2,
                                  bgcolor: 'background.default',
                                  borderRadius: 1,
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  sx={{
                                    mb: 1.5,
                                    fontWeight: 700,
                                    color: 'primary.main',
                                  }}
                                >
                                  📝 Student answer:
                                </Typography>

                                {isNonGradable ? (
                                  <Box>
                                    {studentAnswer?.answer &&
                                    studentAnswer.answer.length > 0 ? (
                                      studentAnswer.answer.map(
                                        (ans: string, idx: number) => (
                                          <Box key={idx}>
                                            {renderFileAnswer(ans)}
                                          </Box>
                                        ),
                                      )
                                    ) : (
                                      <Chip
                                        label="(Not answered)"
                                        size="small"
                                        color="default"
                                      />
                                    )}
                                  </Box>
                                ) : (
                                  <Typography
                                    variant="body2"
                                    sx={{
                                      color: isCorrect
                                        ? 'success.main'
                                        : 'error.main',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {studentAnswer?.answer?.join(', ') ||
                                      '(Not answered)'}
                                  </Typography>
                                )}

                                {!isNonGradable && !isCorrect && (
                                  <Typography
                                    variant="body2"
                                    sx={{ color: 'success.main', mt: 1 }}
                                  >
                                    <strong>Correct answer:</strong>{' '}
                                    {question.correctAnswer?.join(', ')}
                                  </Typography>
                                )}

                                {isNonGradable && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: 'info.main',
                                      fontStyle: 'italic',
                                      display: 'block',
                                      mt: 1,
                                    }}
                                  >
                                    * Question type {section.questionType} is
                                    not automatically graded
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          );
                        },
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
