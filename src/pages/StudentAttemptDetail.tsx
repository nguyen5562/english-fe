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
} from '@mui/icons-material';
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
            🎤 File ghi âm:
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
            Tải xuống
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
            🎥 Video ghi hình:
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
            Tải xuống
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
            📄 File đính kèm:
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
      setError('Thiếu thông tin sinh viên hoặc bài tập/quiz');
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
        setError(err.response?.data?.message || 'Không thể tải dữ liệu');
        toast.error('Không thể tải dữ liệu');
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
          Quay lại
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Quay lại
        </Button>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Chi tiết bài làm
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip label={`Sinh viên: ${student?.username}`} color="primary" />
          <Chip label={`Email: ${student?.email}`} variant="outlined" />
          {attemptType === 'exercise' && exercise && (
            <Chip label={`Bài tập: ${exercise.title}`} color="secondary" />
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
            <Alert severity="info">Sinh viên chưa làm bài tập này</Alert>
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
                            label={`Điểm: ${sectionAttempt.score ?? 0}/${maxScore}`}
                            color={
                              sectionAttempt.score === maxScore
                                ? 'success'
                                : 'warning'
                            }
                          />
                          <Chip
                            label={`Số lần thử: ${sectionAttempt.tries ?? 0}`}
                          />
                          {sectionAttempt.submittedAt && (
                            <Chip
                              label={`Nộp: ${new Date(sectionAttempt.submittedAt).toLocaleString('vi-VN')}`}
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
                                    Câu {qIdx + 1}
                                  </Typography>
                                  <Chip
                                    label={`${question.point} điểm`}
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
                                      {question.options.map(
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
                                      )}
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
                                        Ngân hàng từ:
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
                                    📝 Đáp án của sinh viên:
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
                                          label="(Chưa trả lời)"
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
                                        '(Chưa trả lời)'}
                                    </Typography>
                                  )}

                                  {!isNonGradable && !isCorrect && (
                                    <Typography
                                      variant="body2"
                                      sx={{ color: 'success.main', mt: 1 }}
                                    >
                                      <strong>Đáp án đúng:</strong>{' '}
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
                                      * Câu hỏi dạng {section.questionType}{' '}
                                      không được chấm điểm tự động
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
            <Alert severity="info">Sinh viên chưa làm quiz này</Alert>
          ) : (
            <Box>
              {/* Quiz Summary */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                    Tổng quan
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip
                      label={`Điểm: ${quizAttempt.totalScore ?? 0}`}
                      color="primary"
                      size="medium"
                    />
                    <Chip
                      label={`Bắt đầu: ${quizAttempt.startedAt ? new Date(quizAttempt.startedAt).toLocaleString('vi-VN') : 'N/A'}`}
                      variant="outlined"
                    />
                    <Chip
                      label={`Nộp: ${quizAttempt.submittedAt ? new Date(quizAttempt.submittedAt).toLocaleString('vi-VN') : 'N/A'}`}
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
                        {section.title || `Phần ${sIdx + 1}`}
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
                                  Câu {qIdx + 1}
                                </Typography>
                                <Chip
                                  label={`${question.point} điểm`}
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
                                    {question.options.map(
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
                                    )}
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
                                      Ngân hàng từ:
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
                                  📝 Đáp án của sinh viên:
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
                                        label="(Chưa trả lời)"
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
                                      '(Chưa trả lời)'}
                                  </Typography>
                                )}

                                {!isNonGradable && !isCorrect && (
                                  <Typography
                                    variant="body2"
                                    sx={{ color: 'success.main', mt: 1 }}
                                  >
                                    <strong>Đáp án đúng:</strong>{' '}
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
                                    * Câu hỏi dạng {section.questionType} không
                                    được chấm điểm tự động
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
