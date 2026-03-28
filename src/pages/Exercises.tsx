import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Divider,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import { exerciseService } from '../services/exercise.service';
import { courseService } from '../services/course.service';
import { unitService } from '../services/unit.service';
import { exerciseAttemptService } from '../services/exercise-attempt.service';
import { toast } from '../utils/toast';

import type { Exercise, Course, ExerciseAttempt, Unit } from '../types';

export default function Exercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
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
        const [exercisesData, coursesData, unitsData] = await Promise.all([
          exerciseService.getAllExercise(),
          courseService.getAllCourse(),
          unitService.getAllUnits(),
        ]);
        setExercises(exercisesData);
        setCourses(coursesData);
        setUnits(unitsData);

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
            'Failed to load exercises';
          toast.error(String(msg));
        } else {
          toast.error('Failed to load exercises');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?._id]);

  const filteredExercises =
    selectedCourse === 'all'
      ? exercises
      : exercises.filter((e) => e.courseId === selectedCourse);

  const getAttemptsForExercise = (exerciseId: string): ExerciseAttempt[] => {
    return (exerciseAttempts || []).filter((a) => {
      const aId =
        typeof a.exerciseId === 'object'
          ? (a.exerciseId as any)._id
          : a.exerciseId;
      return String(aId) === String(exerciseId);
    });
  };

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
        <Typography variant="h4">Exercises</Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by course</InputLabel>
          <Select
            value={selectedCourse}
            label="Filter by course"
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
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
              No exercises found
            </Typography>
          </CardContent>
        </Card>
      ) : (() => {
        const grouped = filteredExercises.reduce((acc, ex) => {
          const uid = ex.unitId || 'unassigned';
          if (!acc[uid]) acc[uid] = [];
          acc[uid].push(ex);
          return acc;
        }, {} as Record<string, Exercise[]>);

        const validUnits = units.filter(u => grouped[u._id]).sort((a,b) => (a.order || 0) - (b.order || 0));
        const orderKeys = [...validUnits.map(u => u._id)];
        if (grouped['unassigned']) orderKeys.push('unassigned');

        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {orderKeys.map((unitId) => {
              const unitInfo = units.find(u => u._id === unitId);
              const unitExercises = grouped[unitId];
              return (
                <Box key={unitId} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', borderBottom: '2px solid', borderColor: '#e0e0e0', pb: 1, mt: 1 }}>
                    {unitInfo ? unitInfo.title : 'General Exercises (Unassigned)'}
                  </Typography>
                  {unitExercises.map((exercise) => {
                    const sectionAttemptInfo = (exercise.sections ?? []).map(
              (section) => getLastAttemptForSection(exercise._id, section._id),
            );

            const sectionsCompletedCount = sectionAttemptInfo.filter(
              (info) => info !== null,
            ).length;
            const totalSectionsCount = (exercise.sections ?? []).length;

            const overallPercent =
              totalSectionsCount > 0
                ? Math.round(
                    (sectionsCompletedCount / totalSectionsCount) * 100,
                  )
                : 0;

            const progressColor =
              overallPercent >= 80
                ? 'success.main'
                : overallPercent >= 40
                  ? 'warning.main'
                  : 'error.main';

            return (
              <Accordion
                key={exercise._id}
                disableGutters
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: 'none',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': {
                    boxShadow: 4,
                    borderColor: 'primary.light',
                    mb: 2,
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.08)',
                    borderColor: 'primary.main',
                    zIndex: 1,
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon color="primary" />}
                  sx={{
                    px: 3,
                    py: 1,
                    '& .MuiAccordionSummary-content': {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    },
                  }}
                >
                  <Box
                    sx={{
                      color: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <AssignmentIcon sx={{ fontSize: 32 }} />
                  </Box>

                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700, lineHeight: 1.2 }}
                    >
                      {exercise.title}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontWeight: 600, display: 'block' }}
                    >
                      {courses.find(
                        (c) => String(c._id) === String(exercise.courseId),
                      )?.name || 'Course'}
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      width: 200,
                      display: { xs: 'none', md: 'block' },
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mb: 0.5,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        Progress
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ fontWeight: 700, color: progressColor }}
                      >
                        {overallPercent}%
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: '100%',
                        height: 6,
                        bgcolor: 'action.hover',
                        borderRadius: 3,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${overallPercent}%`,
                          height: '100%',
                          bgcolor: progressColor,
                          transition: 'width 0.5s',
                        }}
                      />
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      textAlign: 'right',
                      display: { xs: 'none', lg: 'block' },
                      minWidth: 100,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        display: 'block',
                      }}
                    >
                      Status
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 700,
                        color:
                          sectionsCompletedCount === totalSectionsCount
                            ? 'success.main'
                            : 'text.primary',
                      }}
                    >
                      {sectionsCompletedCount}/{totalSectionsCount} Sections
                    </Typography>
                  </Box>
                </AccordionSummary>

                <AccordionDetails
                  sx={{ p: 0, bgcolor: 'rgba(25, 118, 210, 0.02)' }}
                >
                  <Divider />
                  <List disablePadding>
                    {(exercise.sections ?? []).map((section, idx) => {
                      const lastAttempt = getLastAttemptForSection(
                        exercise._id,
                        section._id,
                      );
                      const isDone = lastAttempt !== null;
                      const scorePercent = lastAttempt
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
                            px: 4,
                            py: 2,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            '&:last-child': { borderBottom: 'none' },
                            '&:hover': { bgcolor: 'action.hover' },
                          }}
                        >
                          <ListItemText
                            primary={section.title}
                            primaryTypographyProps={{
                              variant: 'body1',
                              sx: { fontWeight: 600 },
                            }}
                            secondary={section.sectionType.toUpperCase()}
                          />

                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {isDone && (
                              <Box sx={{ textAlign: 'center' }}>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: 'block' }}
                                >
                                  {[
                                    'pronunciation',
                                    'video-recording',
                                    'writing',
                                  ].includes(section.questionType)
                                    ? 'Status'
                                    : 'Last score'}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    fontWeight: 700,
                                    color: [
                                      'pronunciation',
                                      'video-recording',
                                      'writing',
                                    ].includes(section.questionType)
                                      ? 'success.main'
                                      : (scorePercent ?? 0) >= 60
                                        ? 'success.main'
                                        : 'warning.main',
                                  }}
                                >
                                  {[
                                    'pronunciation',
                                    'video-recording',
                                    'writing',
                                  ].includes(section.questionType)
                                    ? 'Done'
                                    : `${scorePercent}%`}
                                </Typography>
                              </Box>
                            )}
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              {isDone ? (
                                <CheckCircleIcon color="success" />
                              ) : (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Not done
                                </Typography>
                              )}
                              <Button
                                size="small"
                                variant="outlined"
                                sx={{
                                  borderRadius: 2,
                                  textTransform: 'none',
                                  fontWeight: 700,
                                }}
                              >
                                {isDone ? 'Retry' : 'Start'}
                              </Button>
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
              );
            })}
        </Box>
        );
      })()}
    </Box>
  );
}
