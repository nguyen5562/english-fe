import { useRef, useState } from 'react';
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
import { getExercise, getUser, saveExerciseAttempt } from '../services/storage';
import type { Exercise, Question, QuestionType } from '../types';

export default function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exercise] = useState<Exercise | null>(() => (id ? getExercise(id) : null));
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
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
  const [recordingStatus, setRecordingStatus] = useState<Record<string, 'idle' | 'recording' | 'recorded'>>({});
  const [recordings, setRecordings] = useState<Record<string, string | null>>({});
  const mediaRecordersRef = useRef<Record<string, MediaRecorder | null>>({});
  const user = getUser();

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

  const handleSubmit = () => {
    let totalScore = 0;
    let maxScore = 0;

    allQuestions.forEach(question => {
      const effectiveType: QuestionType | undefined =
        question.type ?? exercise.sections.find((s) => s.questions.some((q) => q.id === question.id))?.questionType;

      // Bỏ qua phần phát âm và video-recording – chỉ luyện tập, không tính điểm
      if (effectiveType === 'pronunciation' || effectiveType === 'video-recording') {
        return;
      }

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
                control={<Radio />}
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
                        <Select
                          value={value || ''}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          displayEmpty
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
                <Select
                  value={value || ''}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  label={question.question}
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
              fullWidth
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Nhập câu trả lời của bạn"
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
                disabled={status === 'recording'}
                onClick={() => startRecording(question.id)}
              >
                {status === 'recording' ? 'Đang ghi...' : 'Ghi âm'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                disabled={status !== 'recording'}
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
              fullWidth
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Nhập câu trả lời của bạn"
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
              fullWidth
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Nhập câu trả lời của bạn"
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
                fullWidth
                variant="outlined"
                value={value}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                placeholder="Nhập câu trả lời của bạn"
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
              fullWidth
              size="small"
              variant="outlined"
              value={value}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Nhập từ cần điền"
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
                disabled={status === 'recording'}
                onClick={() => startRecording(question.id)}
                sx={{ bgcolor: 'pink', '&:hover': { bgcolor: '#e91e63' } }}
              >
                {status === 'recording' ? 'Đang ghi...' : 'Ghi âm'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                disabled={status !== 'recording'}
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
              fullWidth
              multiline
              rows={4}
              variant="outlined"
              value={value}
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
            <Typography variant="body2" color="text.secondary">
              Phần {currentSectionIndex + 1} / {exercise.sections.length} · Tổng số câu hỏi: {allQuestions.length}
            </Typography>
          </Box>

          {/* Hiển thị 1 phần tại một thời điểm */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
              <Typography variant="h6">
                Phần {currentSectionIndex + 1}: {currentSection.title}
              </Typography>
              <Chip
                label={currentSection.sectionType}
                size="small"
                color="primary"
                variant="outlined"
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
                      p: 2,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.300',
                      whiteSpace: 'pre-wrap',
                      mb: 2,
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
                              size="small"
                              value={(answers[currentSection.questions[index].id] as string) || ''}
                              onChange={(e) =>
                                handleAnswerChange(currentSection.questions[index].id, e.target.value)
                              }
                              sx={{ width: 120, '& input': { py: 0.5 } }}
                              placeholder="..."
                            />
                          )}
                        </Box>
                      ))}
                    </Box>
                  );
                })()}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {currentSection.questions.map((question, index) => (
                  <Box key={question.id}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      Câu {index + 1}
                    </Typography>
                    {renderQuestion(
                      question,
                      currentSection.questionType,
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          <Divider sx={{ mt: 3, mb: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
            <Button
              variant="outlined"
              disabled={currentSectionIndex === 0}
              onClick={() => setCurrentSectionIndex((prev) => Math.max(prev - 1, 0))}
            >
              Phần trước
            </Button>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {currentSectionIndex < exercise.sections.length - 1 && (
                <Button
                  variant="contained"
                  onClick={() =>
                    setCurrentSectionIndex((prev) =>
                      Math.min(prev + 1, exercise.sections.length - 1),
                    )
                  }
                >
                  Phần tiếp theo
                </Button>
              )}
              {currentSectionIndex === exercise.sections.length - 1 && (
                <Button variant="contained" color="primary" onClick={handleSubmit}>
                  Nộp bài
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
