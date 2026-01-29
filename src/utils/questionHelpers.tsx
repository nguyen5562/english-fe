import { Box, Typography, Chip, FormControl, FormLabel, RadioGroup, Radio, FormControlLabel, TextField } from '@mui/material';
import type { Question, Section } from '../types old';

// Map sectionType to label and color (used for Chips in detail view)
export const sectionTypeMap: Record<string, { label: string; color?: 'primary'|'secondary'|'error'|'info'|'success'|'warning' }> = {
  grammar: { label: 'Grammar', color: 'primary' },
  vocabulary: { label: 'Vocabulary', color: 'success' },
  listening: { label: 'Listening', color: 'info' },
  reading: { label: 'Reading', color: 'warning' },
  pronunciation: { label: 'Pronunciation', color: 'secondary' },
  speaking: { label: 'Speaking', color: 'error' },
  writing: { label: 'Writing', color: 'warning' },
  mixed: { label: 'Mixed' },
};

// Helper: render media (audio, image, video) for a question
export const renderQuestionMedia = (question: Question) => (
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

// Helper: render wordBank for a question
export const renderQuestionWordBank = (
  question: Question,
  onWordClick?: (word: string) => void
) => {
  if (!question.wordBank || question.wordBank.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
      {question.wordBank.map((word) => (
        <Chip
          key={word}
          label={word}
          clickable={!!onWordClick}
          onClick={onWordClick ? () => onWordClick(word) : undefined}
        />
      ))}
    </Box>
  );
};

// Helper: render section media (audio, video, image, passage)
export const renderSectionMedia = (section: Section) => {
  if (!section.audioUrl && !section.videoUrl && !section.imageUrl && !section.passage) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      {section.audioUrl && (
        <Box sx={{ mb: 1 }}>
          <audio controls src={section.audioUrl}>
            Trình duyệt của bạn không hỗ trợ audio.
          </audio>
        </Box>
      )}
      {section.videoUrl && (
        <Box sx={{ mb: 1 }}>
          <video controls src={section.videoUrl} style={{ width: '100%', maxWidth: '800px', borderRadius: '8px' }}>
            Trình duyệt của bạn không hỗ trợ video.
          </video>
        </Box>
      )}
      {section.imageUrl && (
        <Box
          component="img"
          src={section.imageUrl}
          alt={section.title}
          sx={{ maxWidth: '100%', borderRadius: 1 }}
        />
      )}
      {section.passage && section.questionType !== 'paragraph-fill' && (
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
          <Typography variant="body1">{section.passage}</Typography>
        </Box>
      )}
    </Box>
  );
};

// Helper: render section word bank
export const renderSectionWordBank = (section: Section) => {
  if (!section.wordBank || section.wordBank.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
      {section.wordBank.map((word) => (
        <Chip key={word} label={word} />
      ))}
    </Box>
  );
};

// Helper: format answer for display
export const formatAnswer = (ans: string | string[]): string => {
  if (Array.isArray(ans)) return ans.join(', ');
  return String(ans ?? '');
};

// Helper: calculate score for answers
export const calculateScore = (
  questions: Question[],
  answers: Record<string, string | string[]>
): { score: number; maxScore: number } => {
  let totalScore = 0;
  let maxScore = 0;

  questions.forEach((question) => {
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

  return { score: totalScore, maxScore };
};

// Helper: render multiple choice question
export const renderMultipleChoice = (
  question: Question,
  value: string,
  onChange: (value: string) => void,
  disabled?: boolean,
  retryKey?: number
) => (
  <FormControl component="fieldset" fullWidth>
    <FormLabel component="legend">{question.question}</FormLabel>
    <RadioGroup
      key={retryKey !== undefined ? `${question.id}-rg-${retryKey}` : undefined}
      value={Array.isArray(value) ? '' : (value || '')}
      onChange={(e) => onChange(e.target.value)}
    >
      {question.options?.map((option, index) => (
        <FormControlLabel
          key={index}
          value={option}
          control={
            <Radio
              key={retryKey !== undefined ? `${question.id}-${index}-${retryKey}` : undefined}
              disabled={disabled}
            />
          }
          label={option}
        />
      ))}
    </RadioGroup>
  </FormControl>
);

// Helper: render text input question
export const renderTextInput = (
  question: Question,
  value: string,
  onChange: (value: string) => void,
  options?: {
    placeholder?: string;
    rows?: number;
    disabled?: boolean;
    retryKey?: number;
  }
) => (
  <>
    <Typography variant="body1" gutterBottom>
      {question.question}
    </Typography>
    <TextField
      key={options?.retryKey !== undefined ? `${question.id}-${options.retryKey}` : undefined}
      fullWidth
      multiline={!!options?.rows}
      rows={options?.rows}
      variant="outlined"
      value={Array.isArray(value) ? '' : (value || '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder={options?.placeholder || 'Nhập câu trả lời của bạn'}
      disabled={options?.disabled}
    />
  </>
);
