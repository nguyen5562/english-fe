import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, CheckCircle as CheckCircleIcon, Timer as TimerIcon } from '@mui/icons-material';
import { getQuiz, getUser, saveQuizAttempt } from '../services/storage';
import type { Quiz, Question } from '../types';

export default function QuizDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
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
        // Initialize answers
        const initialAnswers: Record<string, string | string[]> = {};
        loadedQuiz.questions.forEach(q => {
          initialAnswers[q.id] = q.type === 'multiple-choice' ? '' : '';
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

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    let totalScore = 0;
    let maxScore = 0;

    quiz.questions.forEach(question => {
      maxScore += question.points;
      const userAnswer = answers[question.id];
      const correctAnswer = question.correctAnswer;

      if (Array.isArray(correctAnswer)) {
        if (Array.isArray(userAnswer) && JSON.stringify(userAnswer.sort()) === JSON.stringify(correctAnswer.sort())) {
          totalScore += question.points;
        }
      } else {
        if (userAnswer === correctAnswer) {
          totalScore += question.points;
        }
      }
    });

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
      });
    }
  };

  const renderQuestion = (question: Question) => {
    switch (question.type) {
      case 'multiple-choice':
        return (
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">{question.question}</FormLabel>
            <RadioGroup
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            >
              {question.options?.map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={option}
                  control={<Radio />}
                  label={option}
                />
              ))}
            </RadioGroup>
          </FormControl>
        );
      case 'fill-blank':
        return (
          <Box>
            <Typography variant="body1" gutterBottom>
              {question.question}
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Nhập câu trả lời của bạn"
            />
          </Box>
        );
      default:
        return (
          <Box>
            <Typography variant="body1" gutterBottom>
              {question.question}
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={answers[question.id] || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Nhập câu trả lời của bạn"
            />
          </Box>
        );
    }
  };

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
          <LinearProgress variant="determinate" value={progress} sx={{ mt: 2, mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Câu hỏi {currentQuestionIndex + 1} / {quiz.questions.length}
          </Typography>

          <Box sx={{ minHeight: 200, mb: 3, mt: 3 }}>
            {renderQuestion(currentQuestion)}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              Câu trước
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
            >
              {currentQuestionIndex === quiz.questions.length - 1 ? 'Nộp bài' : 'Câu tiếp'}
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
            Quay lại danh sách
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

