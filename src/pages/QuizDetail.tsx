import { useEffect, useState } from 'react';
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
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, CheckCircle as CheckCircleIcon, Timer as TimerIcon } from '@mui/icons-material';
import { getQuiz, getUser, saveQuizAttempt } from '../types old/storage';
import type { Quiz, Question, Section } from '../types old';
import { sectionTypeMap, renderSectionMedia, renderSectionWordBank, calculateScore, renderMultipleChoice, renderTextInput, renderQuestionMedia, renderQuestionWordBank } from '../utils/questionHelpers';

export default function QuizDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number; percentage: number; passed: boolean } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0); // in seconds
  const [startTime, setStartTime] = useState<Date | null>(null);
  const user = getUser();

  useEffect(() => {
    if (id) {
      const loadedQuiz = getQuiz(id);
      if (loadedQuiz) {
        setQuiz(loadedQuiz);
        setTimeRemaining(loadedQuiz.timeLimit * 60); // Convert minutes to seconds
        setStartTime(new Date());
        // Initialize answers for all questions in all sections
        const initialAnswers: Record<string, string | string[]> = {};
        loadedQuiz.sections.forEach(section => {
          section.questions.forEach(q => {
            const effectiveType = q.type ?? section.questionType;
            if (effectiveType === 'fill-blank') {
              initialAnswers[q.id] = [];
            } else {
              initialAnswers[q.id] = '';
            }
          });
        });
        setAnswers(initialAnswers);
      }
    }
  }, [id]);

  useEffect(() => {
    if (timeRemaining > 0 && !showResult) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRemaining, showResult]);

  if (!quiz) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  const currentSection = quiz.sections[currentSectionIndex];
  const allQuestions = quiz.sections.flatMap(section => section.questions);
  const totalQuestions = allQuestions.length;
  const questionsCompleted = quiz.sections
    .slice(0, currentSectionIndex)
    .reduce((sum, section) => sum + section.questions.length, 0);
  const progress = ((questionsCompleted + currentSection.questions.length) / totalQuestions) * 100;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    // Chuyển sang section tiếp theo
    if (currentSectionIndex < quiz.sections.length - 1) {
      setCurrentSectionIndex(prev => prev + 1);
    } else {
      // Đã làm hết tất cả các phần, nộp bài
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    // Chuyển về section trước
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    const { score: totalScore, maxScore } = calculateScore(allQuestions, answers);
    const percentage = (totalScore / maxScore) * 100;
    const passed = percentage >= quiz.passingScore;
    const timeSpent = startTime ? Math.round((new Date().getTime() - startTime.getTime()) / 60000) : 0;

    setResult({ score: totalScore, maxScore, percentage, passed });
    setShowResult(true);

    // Save attempt
    if (user) {
      saveQuizAttempt({
        id: Date.now().toString(),
        quizId: quiz.id,
        studentId: user.id,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer: Array.isArray(answer) ? answer : [answer],
        })),
        score: totalScore,
        maxScore,
        percentage,
        passed,
        completedAt: new Date(),
        timeSpent,
        currentSectionIndex: currentSectionIndex,
      });
    }
  };

  const renderQuestion = (question: Question, section: Section, index: number) => {
    const effectiveType = question.type ?? section.questionType;
    const answerValue = answers[question.id] || '';
    const value = Array.isArray(answerValue) ? '' : answerValue;
    const questionNumber = <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>Câu {index + 1}</Typography>;
    
    switch (effectiveType) {
      case 'multiple-choice':
      case 'reading-mcq':
      case 'picture-choice':
        return (
          <Box key={question.id} sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            {renderMultipleChoice(question, value, (v) => handleAnswerChange(question.id, v))}
          </Box>
        );
      case 'listening':
        return (
          <Box key={question.id} sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            {question.options && question.options.length > 0
              ? renderMultipleChoice(question, value, (v) => handleAnswerChange(question.id, v))
              : renderTextInput(question, value, (v) => handleAnswerChange(question.id, v))
            }
          </Box>
        );
      case 'fill-sentence':
      case 'word-order':
      case 'word-bank':
        return (
          <Box key={question.id} sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            {renderTextInput(question, value, (v) => handleAnswerChange(question.id, v))}
          </Box>
        );
      case 'fill-blank': {
        // Điền từ vào nhiều chỗ trống trong câu
        const blanks = question.question.split('____');
        const answerArray = Array.isArray(answerValue)
          ? answerValue
          : typeof answerValue === 'string' && answerValue
            ? answerValue.split(',').map((s) => s.trim())
            : Array(blanks.length - 1).fill('');
        
        return (
          <Box key={question.id} sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
              {blanks.map((part, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography component="span">{part}</Typography>
                  {idx < blanks.length - 1 && (
                    <TextField
                      size="small"
                      value={answerArray[idx] || ''}
                      onChange={(e) => {
                        const newArray = [...answerArray];
                        newArray[idx] = e.target.value;
                        handleAnswerChange(question.id, newArray);
                      }}
                      sx={{ width: 100 }}
                      placeholder="..."
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
          <Box key={question.id} sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Điền từ vào chỗ trống số {question.question}:
            </Typography>
            {renderTextInput(question, value, (v) => handleAnswerChange(question.id, v), {
              placeholder: 'Nhập từ cần điền',
            })}
          </Box>
        );
      case 'dropdown-choice': {
        const parts = question.question.split('____');
        const hasBlank = parts.length > 1;
        
        return (
          <Box key={question.id} sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            {hasBlank ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                {parts.map((part, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography component="span" variant="body1">{part}</Typography>
                    {idx < parts.length - 1 && (
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                          value={value || ''}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="" disabled><em></em></MenuItem>
                          {question.options?.map((option, optIdx) => (
                            <MenuItem key={optIdx} value={option}>{option}</MenuItem>
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
                <Select
                  value={value || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  label={question.question}
                >
                  {question.options?.map((option, optIdx) => (
                    <MenuItem key={optIdx} value={option}>{option}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        );
      }
      case 'pronunciation':
      case 'video-recording':
        // Trong quiz, pronunciation và video-recording có thể chỉ cần text input
        // (hoặc có thể thêm recording sau nếu cần)
        return (
          <Box key={question.id} sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            <Typography variant="body1" gutterBottom>
              {question.question}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {effectiveType === 'pronunciation' 
                ? 'Nhập câu trả lời của bạn (hoặc mô tả phát âm)'
                : 'Nhập câu trả lời của bạn (mô tả nội dung video)'}
            </Typography>
            {renderTextInput(question, value, (v) => handleAnswerChange(question.id, v), {
              rows: 4,
            })}
          </Box>
        );
      case 'writing':
        return (
          <Box key={question.id} sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            {renderTextInput(question, value, (v) => handleAnswerChange(question.id, v), {
              placeholder: 'Nhập bài viết của bạn',
              rows: 6,
            })}
          </Box>
        );
      default:
        return (
          <Box key={question.id} sx={{ mb: 3 }}>
            {questionNumber}
            {renderQuestionMedia(question)}
            {renderQuestionWordBank(question)}
            {renderTextInput(question, value, (v) => handleAnswerChange(question.id, v), { rows: 4 })}
          </Box>
        );
    }
  };

  const isLastSection = currentSectionIndex === quiz.sections.length - 1;

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/quizzes')} sx={{ mb: 2 }}>
        Quay lại
      </Button>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">{quiz.title}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimerIcon />
              <Typography variant="h6" color={timeRemaining < 60 ? 'error.main' : 'inherit'}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </Typography>
            </Box>
          </Box>

          {/* Section info */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="h6">
                Phần {currentSectionIndex + 1}: {currentSection.title}
              </Typography>
              {currentSection.sectionType && (
                <Chip
                  label={sectionTypeMap[currentSection.sectionType]?.label || currentSection.sectionType}
                  size="small"
                  color={sectionTypeMap[currentSection.sectionType]?.color}
                />
              )}
            </Box>
            {currentSection.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {currentSection.description}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              Phần {currentSectionIndex + 1} / {quiz.sections.length} · {currentSection.questions.length} câu hỏi
            </Typography>
          </Box>

          <LinearProgress variant="determinate" value={progress} sx={{ mt: 2, mb: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Tổng tiến độ: {questionsCompleted + currentSection.questions.length} / {totalQuestions} câu hỏi
          </Typography>

          <Divider sx={{ my: 2 }} />

          {/* Section media (audio, video, image, passage) */}
          {renderSectionMedia(currentSection) && <Box sx={{ mb: 3 }}>{renderSectionMedia(currentSection)}</Box>}

          {/* Word bank cho toàn phần (nếu có) */}
          {renderSectionWordBank(currentSection) && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ width: '100%', mb: 1 }}>Word Bank:</Typography>
              {renderSectionWordBank(currentSection)}
            </Box>
          )}

          {/* Hiển thị tất cả câu hỏi trong section */}
          <Box sx={{ mb: 3 }}>
            {currentSection.questions.map((question, index) => 
              renderQuestion(question, currentSection, index)
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={handlePrevious}
              disabled={currentSectionIndex === 0}
            >
              Phần trước
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
            >
              {isLastSection ? 'Nộp bài' : 'Phần tiếp'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Dialog open={showResult} onClose={() => {}} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CheckCircleIcon sx={{ color: result?.passed ? 'success.main' : 'error.main', mr: 1 }} />
            Kết quả bài kiểm tra
          </Box>
        </DialogTitle>
        <DialogContent>
          {result && (
            <Box>
              <Typography variant="h4" align="center" gutterBottom color={result.passed ? 'success.main' : 'error.main'}>
                {result.percentage.toFixed(1)}%
              </Typography>
              <Typography variant="body1" align="center" color="text.secondary" gutterBottom>
                Điểm số: {result.score} / {result.maxScore}
              </Typography>
              <Alert severity={result.passed ? 'success' : 'warning'} sx={{ mt: 2 }}>
                {result.passed
                  ? `Chúc mừng! Bạn đã đạt yêu cầu (${quiz.passingScore}%)`
                  : `Bạn chưa đạt yêu cầu. Cần ${quiz.passingScore}% để đạt.`}
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
