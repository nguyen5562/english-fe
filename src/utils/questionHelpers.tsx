import {
  Box,
  Typography,
  Chip,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  TextField,
} from '@mui/material';
import { API_ROUTES, API_URL } from '../const/apiConfig';
import type { Question, Section } from '../types';

// Map sectionType to label and color (used for Chips in detail view)
export const sectionTypeMap: Record<
  string,
  {
    label: string;
    color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  }
> = {
  grammar: { label: 'Grammar', color: 'primary' },
  vocabulary: { label: 'Vocabulary', color: 'success' },
  listening: { label: 'Listening', color: 'info' },
  reading: { label: 'Reading', color: 'warning' },
  pronunciation: { label: 'Pronunciation', color: 'secondary' },
  speaking: { label: 'Speaking', color: 'error' },
  writing: { label: 'Writing', color: 'warning' },
  mixed: { label: 'Mixed' },
};

export const PUBLIC_BASE = (API_URL + API_ROUTES.RESOURCES).replace(/\/$/, '');

export function resolveUrl(url?: string): string | undefined {
  if (!url || typeof url !== 'string') return undefined;
  if (
    url.startsWith('http') ||
    url.startsWith('//') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  // Remove leading slash if present to avoid double slash if PUBLIC_BASE ends with slash (though we stripped it)
  // But RESOURCES usually starts with slash. e.g. /resources.
  // API_URL usually http://domain.
  // PUBLIC_BASE = http://domain/resources
  // If url = /foo.png -> http://domain/resources/foo.png
  // If url = foo.png -> http://domain/resources/foo.png
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${PUBLIC_BASE}${cleanUrl}`;
}

// Helper: render media (audio, image, video) for a question
export const renderQuestionMedia = (question: Question) => (
  <>
    {question.imageUrl && (
      <Box sx={{ mb: 2 }}>
        <Box
          component="img"
          src={resolveUrl(question.imageUrl)}
          alt={question.title}
          sx={{ maxWidth: '100%', borderRadius: 1 }}
        />
      </Box>
    )}
    {question.audioUrl && (
      <Box sx={{ mb: 2 }}>
        <audio controls src={resolveUrl(question.audioUrl)}>
          Trình duyệt của bạn không hỗ trợ audio.
        </audio>
      </Box>
    )}
    {question.videoUrl && (
      <Box sx={{ mb: 2 }}>
        <video
          controls
          src={resolveUrl(question.videoUrl)}
          style={{ width: '100%', maxWidth: '800px', borderRadius: '8px' }}
        >
          Trình duyệt của bạn không hỗ trợ video.
        </video>
      </Box>
    )}
  </>
);

// Helper: render wordBank for a question
export const renderQuestionWordBank = (
  question: Question,
  onWordClick?: (word: string) => void,
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
  if (
    !section.audioUrl &&
    !section.videoUrl &&
    !section.imageUrl &&
    !section.passage
  ) {
    return null;
  }

  return (
    <Box sx={{ mb: 2 }}>
      {section.audioUrl && (
        <Box sx={{ mb: 1 }}>
          <audio controls src={resolveUrl(section.audioUrl)}>
            Trình duyệt của bạn không hỗ trợ audio.
          </audio>
        </Box>
      )}
      {section.videoUrl && (
        <Box sx={{ mb: 1 }}>
          <video
            controls
            src={resolveUrl(section.videoUrl)}
            style={{ width: '100%', maxWidth: '800px', borderRadius: '8px' }}
          >
            Trình duyệt của bạn không hỗ trợ video.
          </video>
        </Box>
      )}
      {section.imageUrl && (
        <Box
          component="img"
          src={resolveUrl(section.imageUrl)}
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
  answers: Record<string, string | string[]>,
): { score: number; maxScore: number } => {
  let totalScore = 0;
  let maxScore = 0;

  questions.forEach((question) => {
    maxScore += question.point;
    const userAnswer = answers[question._id];
    const correctAnswer = question.correctAnswer;
    const userArr = Array.isArray(userAnswer)
      ? userAnswer
      : userAnswer != null
        ? [String(userAnswer)]
        : [];
    if (
      userArr.length === correctAnswer.length &&
      JSON.stringify([...userArr].sort()) ===
        JSON.stringify([...correctAnswer].sort())
    ) {
      totalScore += question.point;
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
  retryKey?: number,
) => {
  const qType = (question as any).type;
  return (
    <FormControl component="fieldset" fullWidth>
      <FormLabel component="legend" sx={{ whiteSpace: 'pre-wrap' }}>
        {question.title}
      </FormLabel>
      <RadioGroup
        key={
          retryKey !== undefined ? `${question._id}-rg-${retryKey}` : undefined
        }
        value={Array.isArray(value) ? '' : value || ''}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          flexDirection: qType === 'picture-choice' ? 'row' : 'column',
          flexWrap: 'wrap',
          gap: qType === 'picture-choice' ? 2 : 0,
        }}
      >
        {question.options?.map((option, index) => (
          <FormControlLabel
            key={index}
            value={option}
            labelPlacement={qType === 'picture-choice' ? 'top' : 'end'}
            control={
              <Radio
                key={
                  retryKey !== undefined
                    ? `${question._id}-${index}-${retryKey}`
                    : undefined
                }
                disabled={disabled}
                sx={{
                  mt: qType === 'picture-choice' ? 1 : 0,
                }}
              />
            }
            label={
              qType === 'picture-choice' ? (
                <Box
                  component="img"
                  src={resolveUrl(option)}
                  alt={`Option ${index + 1}`}
                  sx={{
                    width: '180px',
                    height: '140px',
                    objectFit: 'cover',
                    border:
                      value === option ? '3px solid #1976d2' : '1px solid #ddd',
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'scale(1.02)',
                      borderColor: 'primary.main',
                    },
                  }}
                />
              ) : (
                option
              )
            }
            sx={{
              ml: qType === 'picture-choice' ? 0 : undefined,
              mr: qType === 'picture-choice' ? 0 : 2,
              alignItems: 'center',
            }}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
};

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
  },
) => (
  <>
    <Typography variant="body1" gutterBottom sx={{ whiteSpace: 'pre-wrap' }}>
      {question.title}
    </Typography>
    <TextField
      key={
        options?.retryKey !== undefined
          ? `${question._id}-${options.retryKey}`
          : undefined
      }
      fullWidth
      multiline={!!options?.rows}
      rows={options?.rows}
      variant="outlined"
      value={Array.isArray(value) ? '' : value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={options?.placeholder || 'Nhập câu trả lời của bạn'}
      disabled={options?.disabled}
    />
  </>
);
