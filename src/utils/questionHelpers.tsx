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
  Paper,
} from '@mui/material';
import { API_ROUTES, API_URL } from '../const/apiConfig';
import type { Question, Section } from '../types';
import { parseHTML } from './htmlParser';

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
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <Box
          component="img"
          src={resolveUrl(question.imageUrl)}
          alt={question.title}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          sx={{ 
            maxWidth: '100%', 
            maxHeight: '400px',
            borderRadius: 3,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            objectFit: 'contain'
          }}
        />
      </Box>
    )}
    {question.audioUrl && (
      <Box sx={{ mb: 3, width: '100%', display: 'flex' }}>
        <Box
          component="audio"
          controls
          src={resolveUrl(question.audioUrl)}
          sx={{
            width: '100%',
            maxWidth: '500px',
            height: '48px',
            borderRadius: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            backgroundColor: '#f8fafc',
          }}
        >
          Trình duyệt của bạn không hỗ trợ audio.
        </Box>
      </Box>
    )}
    {question.videoUrl && (
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <Box
          component="video"
          controls
          src={resolveUrl(question.videoUrl)}
          sx={{ 
            width: '100%', 
            maxWidth: '800px', 
            borderRadius: 3,
            boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            backgroundColor: '#000'
          }}
        >
          Trình duyệt của bạn không hỗ trợ video.
        </Box>
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
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3, p: 2, bgcolor: '#f1f5f9', borderRadius: 3, border: '1px dashed #cbd5e1' }}>
      {question.wordBank.map((word) => (
        <Chip
          key={word}
          label={word}
          clickable={!!onWordClick}
          onClick={onWordClick ? () => onWordClick(word) : undefined}
          color="primary"
          variant={onWordClick ? "outlined" : "filled"}
          sx={{
            fontWeight: 600,
            fontSize: '0.95rem',
            py: 1,
            px: 0.5,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(8px)',
            boxShadow: onWordClick ? '0 2px 4px rgba(25, 118, 210, 0.1)' : 'none',
            '&:hover': onWordClick ? {
              transform: 'translateY(-2px) scale(1.02)',
              boxShadow: '0 6px 12px rgba(25, 118, 210, 0.2)',
              backgroundColor: 'primary.main',
              color: 'primary.contrastText'
            } : {},
          }}
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
    <Box sx={{ mb: 4 }}>
      {section.imageUrl && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <Box
            component="img"
            src={resolveUrl(section.imageUrl)}
            alt={section.title}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            sx={{ maxWidth: '100%', maxHeight: '400px', borderRadius: 3, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', objectFit: 'contain' }}
          />
        </Box>
      )}
      {section.audioUrl && (
        <Box sx={{ mb: 3, display: 'flex' }}>
          <Box
            component="audio"
            controls
            src={resolveUrl(section.audioUrl)}
            sx={{
              width: '100%',
              maxWidth: '500px',
              height: '48px',
              borderRadius: '24px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              backgroundColor: '#f8fafc',
            }}
          >
            Trình duyệt của bạn không hỗ trợ audio.
          </Box>
        </Box>
      )}
      {section.videoUrl && (
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
          <Box
            component="video"
            controls
            src={resolveUrl(section.videoUrl)}
            sx={{ width: '100%', maxWidth: '800px', borderRadius: 3, boxShadow: '0 12px 32px rgba(0,0,0,0.15)', overflow: 'hidden', backgroundColor: '#000' }}
          >
            Trình duyệt của bạn không hỗ trợ video.
          </Box>
        </Box>
      )}
      {section.passage && section.questionType !== 'paragraph-fill' && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            bgcolor: '#f8fafc',
            borderRadius: 4,
            border: '1px solid',
            borderColor: '#e2e8f0',
            mb: 2,
            boxShadow: 'inset 0 2px 4px rgba(0,10,20,0.02), 0 4px 12px rgba(0,0,0,0.02)',
            transform: 'translateZ(0)',
            overflowX: 'auto',
          }}
        >
          <Typography 
            variant="body1"
            component="div"
            sx={{ 
              lineHeight: 1.9, 
              color: '#334155',
              fontSize: '1.05rem',
              letterSpacing: '0.01em',
              '& p': { mb: 2, '&:last-child': { mb: 0 } }
            }}
          >
            {parseHTML(section.passage)}
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

// Helper: render section word bank
export const renderSectionWordBank = (section: Section) => {
  if (!section.wordBank || section.wordBank.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 3, p: 2.5, bgcolor: '#f8fafc', borderRadius: 3, border: '1px dashed #94a3b8' }}>
      {section.wordBank.map((word) => (
        <Chip 
          key={word} 
          label={word} 
          color="secondary"
          variant="filled"
          sx={{
            fontWeight: 600,
            fontSize: '0.95rem',
            boxShadow: '0 2px 4px rgba(156, 39, 176, 0.15)',
          }}
        />
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
      <FormLabel component="legend">
        <Box component="div" sx={{ '& p': { margin: 0 }, '& *': { display: 'inline' } }}>
          {parseHTML(question.title)}
        </Box>
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
    <Typography component="div" variant="body1" gutterBottom sx={{ mb: 1 }}>
      {parseHTML(question.title)}
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
