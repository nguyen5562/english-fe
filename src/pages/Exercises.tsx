import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import { Assignment as AssignmentIcon } from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import { exerciseService } from '../services/exercise.service';
import { courseService } from '../services/course.service';
import { exerciseAttemptService } from '../services/exercise-attempt.service';
import { toast } from '../utils/toast';

import type { Exercise, Course, ExerciseAttempt } from '../types';

export default function Exercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [exerciseAttempts, setExerciseAttempts] = useState<ExerciseAttempt[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [exercisesData, coursesData] = await Promise.all([
          exerciseService.getAllExercise(),
          courseService.getAllCourse(),
        ]);
        setExercises(exercisesData);
        setCourses(coursesData);

        // Fetch exercise attempts if user is logged in
        if (user?._id) {
          try {
            const attemptsData =
              await exerciseAttemptService.getExerciseAttemptByUserId(user._id);
            setExerciseAttempts(attemptsData);
          } catch (e) {
            // Silently fail if attempts can't be loaded
            console.error('Failed to load exercise attempts:', e);
          }
        }
      } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
          const msg =
            (e.response?.data as { message?: string })?.message ??
            e.response?.statusText ??
            'Không thể tải danh sách bài tập';
          toast.error(String(msg));
        } else {
          toast.error('Không thể tải danh sách bài tập');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?._id]);

  // Mapping từ sectionType sang label hiển thị và màu cho Chip
  const sectionTypeMap: Record<
    string,
    {
      label: string;
      color?:
        | 'primary'
        | 'secondary'
        | 'error'
        | 'info'
        | 'success'
        | 'warning';
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

  const filteredExercises =
    selectedCourse === 'all'
      ? exercises
      : exercises.filter((e) => e.courseId === selectedCourse);

  // Helper function to get attempts for an exercise
  const getAttemptsForExercise = (exerciseId: string): ExerciseAttempt[] => {
    return (exerciseAttempts || []).filter((a) => {
      const aId =
        typeof a.exerciseId === 'object'
          ? (a.exerciseId as any)._id
          : a.exerciseId;
      return String(aId) === String(exerciseId);
    });
  };

  // Helper function to get last attempt for a section
  const getLastAttemptForSection = (
    exerciseId: string,
    sectionId: string,
  ): { tries: number; score: number; maxScore: number } | null => {
    const attempts = getAttemptsForExercise(exerciseId);
    if (attempts.length === 0) return null;

    let bestAttempt: { tries: number; score: number; maxScore: number } | null =
      null;
    let maxTries = -1;

    attempts.forEach((attempt) => {
      const sectionAttempt = attempt.sectionAttempts?.find((sa) => {
        const saId =
          typeof sa.sectionId === 'object'
            ? (sa.sectionId as any)._id
            : sa.sectionId;
        return String(saId) === String(sectionId);
      });

      if (sectionAttempt) {
        const currentTries = sectionAttempt.tries ?? 0;
        // Since backend overwrites, we just take the one we found (or the one with most tries if multiple)
        if (currentTries >= maxTries) {
          maxTries = currentTries;
          const section = exercises
            .find((e) => {
              const eId = typeof e._id === 'object' ? (e as any)._id : e._id;
              return String(eId) === String(exerciseId);
            })
            ?.sections.find((s) => String(s._id) === String(sectionId));

          const maxScore = section
            ? (section.questions ?? []).reduce(
                (sum, q) => sum + (q.point ?? 0),
                0,
              )
            : sectionAttempt.score || 0;

          bestAttempt = {
            tries: Math.max(currentTries, 1),
            score: sectionAttempt.score || 0,
            maxScore: maxScore || 1,
          };
        }
      }
    });

    return bestAttempt;
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Typography variant="h4">Bài tập</Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Lọc theo khóa học</InputLabel>
          <Select
            value={selectedCourse}
            label="Lọc theo khóa học"
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <MenuItem value="all">Tất cả</MenuItem>
            {courses.map((course) => (
              <MenuItem key={course._id} value={course._id}>
                {course.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredExercises.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary" align="center">
              Chưa có bài tập nào
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {filteredExercises.map((exercise) => {
            // Calculate sections completed and overall percent
            const sectionAttemptInfo = (exercise.sections ?? []).map(
              (section) => getLastAttemptForSection(exercise._id, section._id),
            );

            const sectionsCompletedCount = sectionAttemptInfo.filter(
              (info) => info !== null,
            ).length;
            const totalSectionsCount = (exercise.sections ?? []).length;

            let totalWeightedPercent = 0;
            let gradedSectionsCount = 0;
            sectionAttemptInfo.forEach((info, idx) => {
              const qType = exercise.sections[idx].questionType;
              const isGraded = ![
                'pronunciation',
                'video-recording',
                'writing',
              ].includes(qType);

              if (isGraded) {
                gradedSectionsCount++;
                if (info && info.maxScore > 0) {
                  totalWeightedPercent += (info.score / info.maxScore) * 100;
                }
              }
            });

            const overallPercent =
              gradedSectionsCount > 0
                ? Math.round(totalWeightedPercent / gradedSectionsCount)
                : 0;

            return (
              <Accordion
                key={exercise._id}
                disableGutters
                sx={{ mb: 2, borderRadius: 1, boxShadow: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      width: '100%',
                    }}
                  >
                    <AssignmentIcon
                      sx={{ fontSize: 36, color: 'primary.main', mr: 2 }}
                    />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6">{exercise.title}</Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
                      >
                        <span>
                          {courses.find(
                            (c) => String(c._id) === String(exercise.courseId),
                          )?.name || 'Course'}
                        </span>
                        <span>·</span>
                        <span>
                          {sectionsCompletedCount}/{totalSectionsCount} phần đã
                          làm
                        </span>
                        <span>·</span>
                        <span>Điểm tổng: {overallPercent}%</span>
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                        <Chip
                          label={`${(exercise.sections ?? []).length} phần`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          label={`${(exercise.sections ?? []).reduce(
                            (total, section) =>
                              total + (section.questions?.length ?? 0),
                            0,
                          )} câu hỏi`}
                          size="small"
                        />
                      </Box>
                    </Box>
                    <Typography
                      variant="body2"
                      color="success.main"
                      sx={{ ml: 2 }}
                    >
                      {overallPercent}%
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <List>
                    {(exercise.sections ?? []).map((section, idx) => {
                      const lastAttempt = getLastAttemptForSection(
                        exercise._id,
                        section._id,
                      );
                      const tries = lastAttempt ? lastAttempt.tries : 0;
                      const lastPercent = lastAttempt
                        ? Math.round(
                            (lastAttempt.score / lastAttempt.maxScore) * 100,
                          )
                        : null;

                      return (
                        <ListItemButton
                          key={section._id}
                          onClick={() =>
                            navigate(
                              `/exercises/${exercise._id}?section=${idx}`,
                            )
                          }
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <ListItemText
                              primary={section.title}
                              sx={{ mr: 2 }}
                            />
                            <Chip
                              label={
                                sectionTypeMap[section.sectionType]?.label ??
                                section.sectionType
                              }
                              size="small"
                              color={
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                sectionTypeMap[section.sectionType]
                                  ?.color as any
                              }
                              variant={
                                sectionTypeMap[section.sectionType]?.color
                                  ? 'filled'
                                  : 'outlined'
                              }
                              sx={{ textTransform: 'capitalize', ml: 1 }}
                            />
                          </Box>

                          <Box
                            sx={{
                              display: 'flex',
                              gap: 2,
                              alignItems: 'center',
                            }}
                          >
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {tries}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {tries === 1 ? 'try' : 'tries'}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'center' }}>
                              <Typography variant="body2">
                                {(() => {
                                  if (!lastAttempt) return '-';
                                  const isGraded = ![
                                    'pronunciation',
                                    'video-recording',
                                    'writing',
                                  ].includes(section.questionType);
                                  if (!isGraded) return 'Done';
                                  return `${lastPercent}%`;
                                })()}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                last
                              </Typography>
                            </Box>
                          </Box>
                        </ListItemButton>
                      );
                    })}
                  </List>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
