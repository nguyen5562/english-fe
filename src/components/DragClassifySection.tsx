import { useState, useRef, useEffect, useMemo } from 'react';
import { Box, Typography, Paper, IconButton } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import type { Section, Question } from '../types';
import { resolveUrl } from '../utils/questionHelpers';

interface Props {
  section: Section;
  /** Map questionId -> đáp án đã chọn (category name hoặc word) */
  answers: Record<string, string>;
  onChange: (answers: Record<string, string>) => void;
  /** Hiển thị kết quả sau khi submit */
  showResult?: boolean;
  disabled?: boolean;
}

// ─── helpers ────────────────────────────────────────────────────────────────

/** Lấy categories từ section.wordBank — dùng cho dạng 1 */
function getCategories(section: Section): string[] {
  return (section.wordBank ?? []).filter(Boolean);
}

/**
 * Phát hiện mode:
 *  - 'classify' : section.wordBank có phần tử (các cột IN/ON/AT…)
 *  - 'audio'    : wordBank trống + question có audioUrl (ghép âm thanh)
 */
function detectMode(section: Section): 'classify' | 'audio' {
  const hasCats = (section.wordBank ?? []).some(Boolean);
  if (hasCats) return 'classify';
  return 'audio';
}

/** Kiểm tra xem một chuỗi có phải là đường dẫn ảnh không */
function isImageUrl(url: string): boolean {
  if (!url) return false;
  return /\.(jpeg|jpg|gif|png|webp|svg|avif)$/i.test(url) || url.startsWith('http') || url.includes('/uploads/');
}

/** Shuffle một mảng (Fisher–Yates) — dùng useMemo để không re-shuffle mỗi render */
function shuffleOnce<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── main component ──────────────────────────────────────────────────────────

export function DragClassifySection({
  section,
  answers,
  onChange,
  showResult = false,
  disabled = false,
}: Props) {
  const mode = detectMode(section);
  const categories = getCategories(section);
  const items = section.questions ?? [];

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * Dạng 2: word bank = tất cả correctAnswer (shuffle 1 lần).
   * Dạng 1: word bank không cần (items kéo là các question.title).
   */
  const shuffledWordBank = useMemo(() => {
    if (mode !== 'audio') return [];
    const words = items
      .map((q) => q.correctAnswer?.[0])
      .filter((w): w is string => !!w);
    return shuffleOnce([...new Set(words)]); // unique + shuffle
  }, [mode, items]);

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  const playAudio = (url: string) => {
    audioRef.current?.pause();
    const a = new Audio(url);
    audioRef.current = a;
    a.play().catch(() => {});
  };

  // ── drag handlers ──────────────────────────────────────────────────────────

  /** Khi drop vào zone với key (category name hoặc questionId) */
  const handleDrop = (targetKey: string) => {
    if (!draggedId || disabled) return;
    onChange({ ...answers, [draggedId]: targetKey });
    setDraggedId(null);
    setDragOver(null);
  };

  /** Trả item về word bank */
  const returnToBank = (id: string) => {
    if (disabled) return;
    const next = { ...answers };
    delete next[id];
    onChange(next);
  };

  // ── shared helpers ─────────────────────────────────────────────────────────

  const isCorrect = (q: Question) => {
    const ua = answers[q._id];
    return ua !== undefined && q.correctAnswer?.[0] === ua;
  };

  // ── render: DẠNG 1 — phân loại vào cột ───────────────────────────────────

  if (mode === 'classify') {
    /** Build map: category → questions placed here */
    const categoryMap: Record<string, Question[]> = {};
    categories.forEach((c) => { categoryMap[c] = []; });
    const unassigned: Question[] = [];
    items.forEach((q) => {
      const cat = answers[q._id];
      if (cat && categoryMap[cat] !== undefined) {
        categoryMap[cat].push(q);
      } else {
        unassigned.push(q);
      }
    });

    const renderItem = (q: Question, inBank = false) => {
      const hasAudio = !!q.audioUrl;
      const ua = answers[q._id];
      const correct = isCorrect(q);
      let borderColor = 'divider';
      let bgColor = 'background.paper';
      if (showResult && ua !== undefined) {
        borderColor = correct ? 'success.main' : 'error.main';
        bgColor = correct ? 'rgba(46,125,50,0.08)' : 'rgba(211,47,47,0.06)';
      }

      const isImg = isImageUrl(ua ?? '');

      return (
        <Box
          key={q._id}
          draggable={!disabled}
          onDragStart={() => setDraggedId(q._id)}
          onDragEnd={() => setDraggedId(null)}
          onDoubleClick={() => { if (!inBank) returnToBank(q._id); }}
          title={inBank ? undefined : 'Double-click to return to word bank'}
          sx={{
            display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
            gap: 0.5, m: 0.5,
            px: isImg ? 0.5 : (hasAudio ? 1 : 1.5), 
            py: isImg ? 0.5 : (hasAudio ? 1 : 0.75),
            border: '1.5px solid', borderColor,
            borderRadius: 2, bgcolor: bgColor,
            cursor: disabled ? 'default' : 'grab',
            userSelect: 'none', transition: 'all 0.15s',
            minWidth: hasAudio && !isImg ? 80 : undefined,
            '&:hover': disabled ? {} : { boxShadow: 2, transform: 'translateY(-1px)' },
          }}
        >
          {hasAudio && (
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); playAudio(q.audioUrl!); }}
              sx={{ bgcolor: 'primary.main', color: 'white', width: 40, height: 40, '&:hover': { bgcolor: 'primary.dark' }, mb: isImg ? 0.5 : 0 }}
            >
              <VolumeUpIcon fontSize="small" />
            </IconButton>
          )}
          {isImg ? (
            <Box 
              component="img" 
              src={resolveUrl(ua!)} 
              sx={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 1 }} 
            />
          ) : q.title && (
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{q.title}</Typography>
          )}
          {showResult && ua !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
              {correct
                ? <CheckCircleOutlineIcon fontSize="small" color="success" />
                : <>
                    <CancelOutlinedIcon fontSize="small" color="error" />
                    <Typography variant="caption" color="error.main">→ {q.correctAnswer?.[0]}</Typography>
                  </>
              }
            </Box>
          )}
        </Box>
      );
    };

    return (
      <Box>
        {section.audioUrl && (
          <Box sx={{ mb: 2 }}>
            <audio controls src={section.audioUrl} style={{ width: '100%' }} />
          </Box>
        )}

        {/* Category columns */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(categories.length, 4)}, 1fr)`,
          gap: 2, mb: 3,
        }}>
          {categories.map((cat) => {
            const over = dragOver === cat;
            return (
              <Paper
                key={cat}
                variant="outlined"
                onDragOver={(e) => { e.preventDefault(); setDragOver(cat); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(cat)}
                sx={{
                  borderRadius: 2, overflow: 'hidden',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  borderColor: over ? 'primary.main' : 'divider',
                  borderWidth: over ? 2 : 1, boxShadow: over ? 4 : 0,
                }}
              >
                <Box sx={{ bgcolor: over ? 'primary.main' : 'primary.light', px: 2, py: 1, textAlign: 'center', transition: 'background-color 0.2s' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: over ? 'white' : 'primary.dark', letterSpacing: 1 }}>
                    {cat}
                  </Typography>
                </Box>
                <Box sx={{ minHeight: 120, p: 1, display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', bgcolor: over ? 'rgba(25,118,210,0.04)' : 'background.default' }}>
                  {categoryMap[cat].map((q) => renderItem(q, false))}
                  {categoryMap[cat].length === 0 && (
                    <Typography variant="caption" color="text.disabled" sx={{ m: 'auto', fontStyle: 'italic' }}>
                      Drop here
                    </Typography>
                  )}
                </Box>
              </Paper>
            );
          })}
        </Box>

        {/* Word bank */}
        <Paper
          variant="outlined"
          sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50' }}
          onDragOver={(e) => { e.preventDefault(); setDragOver('__bank__'); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={() => {
            if (draggedId && !disabled) {
              returnToBank(draggedId);
              setDraggedId(null);
              setDragOver(null);
            }
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            Word bank — drag items into the correct group above
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
            {unassigned.length === 0
              ? <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>All items placed ✓</Typography>
              : unassigned.map((q) => renderItem(q, true))
            }
          </Box>
        </Paper>
      </Box>
    );
  }

  // ── render: DẠNG 2 — nghe âm thanh & kéo từ khớp ────────────────────────

  /**
   * Mỗi question = 1 ô nghe (audio slot).
   * Word bank = shuffledWordBank (các correctAnswer đã shuffle).
   * answers[q._id] = từ đã kéo vào ô đó.
   */

  /** Từ nào đã được dùng (assigned) */
  const usedWords = new Set(Object.values(answers).filter(Boolean));
  const availableWords = shuffledWordBank.filter((w) => !usedWords.has(w));

  const renderAudioSlot = (q: Question, index: number) => {
    const placedWord = answers[q._id];
    const correct = isCorrect(q);
    const over = dragOver === q._id;

    let borderColor = over ? 'primary.main' : 'divider';
    let bgColor = over ? 'rgba(25,118,210,0.06)' : 'background.default';
    if (showResult && placedWord) {
      borderColor = correct ? 'success.main' : 'error.main';
      bgColor = correct ? 'rgba(46,125,50,0.06)' : 'rgba(211,47,47,0.05)';
    }

    return (
      <Paper
        key={q._id}
        variant="outlined"
        onDragOver={(e) => { e.preventDefault(); setDragOver(q._id); }}
        onDragLeave={() => setDragOver(null)}
        onDrop={() => {
          // Drop a word from bank → place into slot (swap if slot already has word)
          if (!draggedId || disabled) return;
          const prevWord = answers[q._id];
          const newAnswers = { ...answers };

          // If the dragged item is a WORD (from bank), key = word itself prefixed
          if (draggedId.startsWith('__word__')) {
            const word = draggedId.slice(8);
            // If slot already occupied, return old word to bank (delete it)
            if (prevWord) {
              // find the question that had prevWord and clear it
              // (in audio mode answers map questionId → word, so just overwrite)
            }
            newAnswers[q._id] = word;
          } else {
            // Dragged from another slot → swap words between slots
            const fromWord = answers[draggedId];
            if (fromWord) {
              newAnswers[q._id] = fromWord;
              if (prevWord) {
                newAnswers[draggedId] = prevWord;
              } else {
                delete newAnswers[draggedId];
              }
            }
          }
          onChange(newAnswers);
          setDraggedId(null);
          setDragOver(null);
        }}
        sx={{
          borderRadius: 2, overflow: 'hidden',
          transition: 'all 0.15s',
          borderColor, borderWidth: over ? 2 : 1, boxShadow: over ? 3 : 0,
        }}
      >
        {/* Audio button */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, p: 1.5, bgcolor: bgColor, minHeight: 110, justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">#{index + 1}</Typography>
            {q.audioUrl ? (
              <IconButton
                onClick={() => playAudio(q.audioUrl!)}
                sx={{
                  bgcolor: 'primary.main', color: 'white',
                  width: 48, height: 48,
                  '&:hover': { bgcolor: 'primary.dark', transform: 'scale(1.1)' },
                  transition: 'all 0.2s',
                  boxShadow: 2,
                }}
              >
                <VolumeUpIcon />
              </IconButton>
            ) : (
              <Box sx={{ width: 48, height: 48, borderRadius: '50%', bgcolor: 'grey.200', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="caption" color="text.disabled">?</Typography>
              </Box>
            )}
          </Box>

          {/* Placed word/image chip — draggable to swap */}
          {placedWord ? (
            <Box
              draggable={!disabled}
              onDragStart={() => setDraggedId(q._id)}
              onDragEnd={() => setDraggedId(null)}
              onDoubleClick={() => !disabled && returnToBank(q._id)}
              title="Double-click to return to word bank"
              sx={{
                px: isImageUrl(placedWord) ? 0.5 : 1.5, 
                py: isImageUrl(placedWord) ? 0.5 : 0.5,
                bgcolor: showResult
                  ? correct ? 'success.main' : 'error.main'
                  : 'primary.main',
                color: 'white', borderRadius: 1,
                cursor: disabled ? 'default' : 'grab',
                display: 'flex', alignItems: 'center', gap: 0.5,
                userSelect: 'none',
                fontSize: '0.85rem', fontWeight: 600,
              }}
            >
              {isImageUrl(placedWord) ? (
                <Box 
                  component="img" 
                  src={resolveUrl(placedWord)} 
                  sx={{ width: 60, height: 45, objectFit: 'cover', borderRadius: 0.5 }} 
                />
              ) : placedWord}
              {showResult && (correct
                ? <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />
                : <CancelOutlinedIcon sx={{ fontSize: 14 }} />
              )}
            </Box>
          ) : (
            <Box sx={{
              px: 2, py: 0.5,
              border: '1.5px dashed', borderColor: over ? 'primary.main' : 'grey.400',
              borderRadius: 1, color: 'text.disabled',
              fontSize: '0.8rem', fontStyle: 'italic',
              minWidth: 60, textAlign: 'center',
            }}>
              drop here
            </Box>
          )}

          {showResult && placedWord && !correct && (
            <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
              ✓ {q.correctAnswer?.[0]}
            </Typography>
          )}
        </Box>
      </Paper>
    );
  };

  const renderWordChip = (word: string) => {
    const isImg = isImageUrl(word);
    return (
      <Box
        key={word}
        draggable={!disabled}
        onDragStart={() => setDraggedId(`__word__${word}`)}
        onDragEnd={() => setDraggedId(null)}
        sx={{
          px: isImg ? 0.5 : 1.5, py: isImg ? 0.5 : 0.75, m: 0.5,
          border: '1.5px solid', borderColor: 'divider',
          borderRadius: 2, bgcolor: 'background.paper',
          cursor: disabled ? 'default' : 'grab',
          userSelect: 'none', fontWeight: 500, fontSize: '0.9rem',
          transition: 'all 0.15s',
          display: 'flex',
          '&:hover': disabled ? {} : { boxShadow: 2, transform: 'translateY(-1px)', borderColor: 'primary.main' },
        }}
      >
        {isImg ? (
          <Box 
            component="img" 
            src={resolveUrl(word)} 
            sx={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 1 }} 
          />
        ) : word}
      </Box>
    );
  };

  return (
    <Box>
      {section.audioUrl && (
        <Box sx={{ mb: 2 }}>
          <audio controls src={section.audioUrl} style={{ width: '100%' }} />
        </Box>
      )}

      {/* Audio slot grid */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: 2, mb: 3,
      }}>
        {items.map((q, i) => renderAudioSlot(q, i))}
      </Box>

      {/* Word bank */}
      <Paper
        variant="outlined"
        sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50' }}
        onDragOver={(e) => { e.preventDefault(); setDragOver('__bank__'); }}
        onDragLeave={() => setDragOver(null)}
        onDrop={() => {
          // Drop a slot-word back to bank
          if (!draggedId || disabled) return;
          if (!draggedId.startsWith('__word__')) {
            // dragged from a slot → clear that slot
            returnToBank(draggedId);
          }
          setDraggedId(null);
          setDragOver(null);
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          Word bank — drag words into the matching audio boxes above · double-click a placed word to return it
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
          {availableWords.length === 0
            ? <Typography variant="caption" color="text.disabled" sx={{ fontStyle: 'italic' }}>All words placed ✓</Typography>
            : availableWords.map((w) => renderWordChip(w))
          }
        </Box>
      </Paper>
    </Box>
  );
}
