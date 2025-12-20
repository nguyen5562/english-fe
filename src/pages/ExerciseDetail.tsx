import { useState } from 'react';
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
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { getExercise, getUser, saveExerciseAttempt } from '../services/storage';
import type { Exercise, Question } from '../types';

export default function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exercise] = useState<Exercise | null>(() => id ? getExercise(id) : null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>(() => {
    if (!id) return {};
    const loadedExercise = getExercise(id);
    if (!loadedExercise) return {};
    const initialAnswers: Record<string, string | string[]> = {};
    loadedExercise.questions.forEach(q => {
      initialAnswers[q.id] = q.type === 'multiple-choice' ? '' : '';
    });
    return initialAnswers;
  });
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState<{ score: number; maxScore: number } | null>(null);
  const user = getUser();

  if (!exercise) {
    return (
      <Box>
        <Typography>Đang tải...</Typography>
      </Box>
    );
  }

  const currentQuestion = exercise.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / exercise.questions.length) * 100;

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < exercise.questions.length - 1) {
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

    exercise.questions.forEach(question => {
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

    setScore({ score: totalScore, maxScore });
    setShowResult(true);

    // Save attempt
    if (user) {
      saveExerciseAttempt({
        id: Date.now().toString(),
        exerciseId: exercise.id,
        studentId: user.id,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer: Array.isArray(answer) ? answer : [answer],
        })),
        score: totalScore,
        maxScore,
        completedAt: new Date(),
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
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/exercises')} sx={{ mb: 2 }}>
        Quay lại
      </Button>

      <Card>
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h5" gutterBottom>
              {exercise.title}
            </Typography>
            <LinearProgress variant="determinate" value={progress} sx={{ mt: 2, mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Câu hỏi {currentQuestionIndex + 1} / {exercise.questions.length}
            </Typography>
          </Box>

          <Box sx={{ minHeight: 200, mb: 3 }}>
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
              {currentQuestionIndex === exercise.questions.length - 1 ? 'Nộp bài' : 'Câu tiếp'}
            </Button>
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
          {score && (
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
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate('/exercises')} variant="contained">
            Quay lại danh sách
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

