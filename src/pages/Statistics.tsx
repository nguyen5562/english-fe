import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Autocomplete,
  TextField,
  Button,
} from '@mui/material';
import {
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { userService } from '../services/user.service';
import { exerciseService } from '../services/exercise.service';
import { quizService } from '../services/quiz.service';
import { exerciseAttemptService } from '../services/exercise-attempt.service';
import { quizAttemptService } from '../services/quiz-attempt.service';
import { courseService } from '../services/course.service';
import { useAuthStore } from '../store/auth.store';
import { toast } from '../utils/toast';
import type {
  User,
  Exercise,
  Quiz,
  ExerciseAttempt,
  QuizAttempt,
  Course,
} from '../types';

type TabValue = 'exercises' | 'quizzes' | 'students';

export default function Statistics() {
  const currentUser = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabValue>('exercises');

  // Data
  const [students, setStudents] = useState<User[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [allExerciseAttempts, setAllExerciseAttempts] = useState<
    ExerciseAttempt[]
  >([]);
  const [allQuizAttempts, setAllQuizAttempts] = useState<QuizAttempt[]>([]);

  // Selected items
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [selectedQuizId, setSelectedQuizId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [studentsData, exercisesData, quizzesData, coursesData] =
          await Promise.all([
            userService.getAllUser(),
            exerciseService.getAllExercise(),
            quizService.getAllQuiz(),
            courseService.getAllCourse(),
          ]);

        // Filter only students
        const studentUsers = studentsData.filter((u) => u.role === 'student');
        setStudents(studentUsers);
        setExercises(exercisesData);
        setQuizzes(quizzesData);
        setCourses(coursesData);

        // Fetch all attempts for all students
        const exerciseAttemptsPromises = studentUsers.map((student) =>
          exerciseAttemptService
            .getExerciseAttemptByUserId(student._id)
            .catch(() => []),
        );
        const quizAttemptsPromises = studentUsers.map((student) =>
          quizAttemptService
            .getQuizAttemptByUserId(student._id)
            .catch(() => []),
        );

        const exerciseAttemptsResults = await Promise.all(
          exerciseAttemptsPromises,
        );
        const quizAttemptsResults = await Promise.all(quizAttemptsPromises);

        setAllExerciseAttempts(exerciseAttemptsResults.flat());
        setAllQuizAttempts(quizAttemptsResults.flat());
      } catch (e: unknown) {
        if (axios.isAxiosError(e)) {
          const msg =
            (e.response?.data as { message?: string })?.message ??
            e.response?.statusText ??
            'Failed to load statistics data';
          toast.error(String(msg));
        } else {
          toast.error('Failed to load statistics data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate statistics
  const totalSections = exercises.reduce(
    (sum, ex) => sum + (ex.sections ?? []).length,
    0,
  );
  const totalQuizzes = quizzes.length;

  // Calculate average section completion rate per student
  let totalSectionCompletionRate = 0;
  students.forEach((student) => {
    const studentAttempts = allExerciseAttempts.filter(
      (a) => String(a.userId) === String(student._id),
    );
    const completedSections = new Set<string>();

    studentAttempts.forEach((attempt) => {
      (attempt.sectionAttempts ?? []).forEach((sectionAttempt) => {
        const attemptExerciseId =
          typeof attempt.exerciseId === 'object'
            ? (attempt.exerciseId as any)._id
            : attempt.exerciseId;
        const sectionId =
          typeof sectionAttempt.sectionId === 'object'
            ? (sectionAttempt.sectionId as any)._id
            : sectionAttempt.sectionId;
        completedSections.add(`${attemptExerciseId}-${sectionId}`);
      });
    });

    const completionRate =
      totalSections > 0 ? (completedSections.size / totalSections) * 100 : 0;
    totalSectionCompletionRate += completionRate;
  });

  const avgSectionCompletionRate =
    students.length > 0 ? totalSectionCompletionRate / students.length : 0;

  // Calculate average quiz completion rate per student
  let totalQuizCompletionRate = 0;
  students.forEach((student) => {
    const studentQuizAttempts = allQuizAttempts.filter(
      (a) => String(a.userId) === String(student._id) && a.submittedAt != null,
    );
    const completionRate =
      totalQuizzes > 0 ? (studentQuizAttempts.length / totalQuizzes) * 100 : 0;
    totalQuizCompletionRate += completionRate;
  });

  const avgQuizCompletionRate =
    students.length > 0 ? totalQuizCompletionRate / students.length : 0;

  // Calculate average score
  let totalScore = 0;
  let totalMaxScore = 0;

  allExerciseAttempts.forEach((attempt) => {
    (attempt.sectionAttempts ?? []).forEach((sectionAttempt) => {
      const attemptExerciseId =
        typeof attempt.exerciseId === 'object'
          ? (attempt.exerciseId as any)._id
          : attempt.exerciseId;
      const exercise = exercises.find(
        (e) => String(e._id) === String(attemptExerciseId),
      );
      const sectionId =
        typeof sectionAttempt.sectionId === 'object'
          ? (sectionAttempt.sectionId as any)._id
          : sectionAttempt.sectionId;
      const section = exercise?.sections.find(
        (s) => String(s._id) === String(sectionId),
      );

      if (
        section &&
        !['pronunciation', 'video-recording', 'writing'].includes(
          section.questionType,
        )
      ) {
        const maxScore = (section.questions ?? []).reduce(
          (sum, q) => sum + (q.point ?? 0),
          0,
        );
        totalScore += sectionAttempt.score || 0;
        totalMaxScore += maxScore;
      }
    });
  });

  allQuizAttempts.forEach((attempt) => {
    if (attempt.submittedAt) {
      const quiz = quizzes.find(
        (q) => String(q._id) === String(attempt.quizId),
      );
      if (quiz) {
        const maxScore = (quiz.sections ?? []).reduce((sum, section) => {
          if (
            ['pronunciation', 'video-recording', 'writing'].includes(
              section.questionType,
            )
          ) {
            return sum;
          }
          return (
            sum +
            (section.questions ?? []).reduce((s, q) => s + (q.point ?? 0), 0)
          );
        }, 0);
        totalScore += attempt.totalScore ?? 0;
        totalMaxScore += maxScore;
      }
    }
  });

  const averageScore =
    totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

  // Get students for selected exercise
  const getStudentsForExercise = (exerciseId: string) => {
    const exercise = exercises.find((e) => e._id === exerciseId);
    if (!exercise) return { completed: [], notStarted: [] };

    const studentsWithAttempts = students.map((student) => {
      const attempts = allExerciseAttempts.filter((attempt) => {
        const attemptExerciseId =
          typeof attempt.exerciseId === 'object'
            ? (attempt.exerciseId as any)._id
            : attempt.exerciseId;
        return (
          String(attemptExerciseId) === String(exerciseId) &&
          String(attempt.userId) === String(student._id)
        );
      });

      const sectionsCompleted = new Set<string>();
      attempts.forEach((attempt) => {
        (attempt.sectionAttempts ?? []).forEach((sa) => {
          const sectionId =
            typeof sa.sectionId === 'object'
              ? (sa.sectionId as any)._id
              : sa.sectionId;
          sectionsCompleted.add(String(sectionId));
        });
      });

      return {
        student,
        sectionsCompleted: sectionsCompleted.size,
        totalSections: exercise.sections.length,
        attempts,
      };
    });

    const completed = studentsWithAttempts.filter(
      (s) => s.sectionsCompleted > 0,
    );
    const notStarted = studentsWithAttempts.filter(
      (s) => s.sectionsCompleted === 0,
    );

    return { completed, notStarted };
  };

  // Get students for selected quiz
  const getStudentsForQuiz = (quizId: string) => {
    const studentsWithAttempts = students.map((student) => {
      const attempt = allQuizAttempts.find(
        (a) =>
          String(a.quizId) === String(quizId) &&
          String(a.userId) === String(student._id) &&
          a.submittedAt != null,
      );

      return {
        student,
        attempt,
      };
    });

    const completed = studentsWithAttempts.filter((s) => s.attempt != null);
    const notStarted = studentsWithAttempts.filter((s) => s.attempt == null);

    return { completed, notStarted };
  };

  // Get exercises and quizzes for selected student
  const getActivitiesForStudent = (studentId: string) => {
    const studentExerciseAttempts = allExerciseAttempts.filter(
      (a) => String(a.userId) === String(studentId),
    );
    const studentQuizAttempts = allQuizAttempts.filter(
      (a) => String(a.userId) === String(studentId) && a.submittedAt != null,
    );

    const exercisesWithProgress = exercises.map((exercise) => {
      const attempts = studentExerciseAttempts.filter((attempt) => {
        const attemptExerciseId =
          typeof attempt.exerciseId === 'object'
            ? (attempt.exerciseId as any)._id
            : attempt.exerciseId;
        return String(attemptExerciseId) === String(exercise._id);
      });

      const sectionsCompleted = new Set<string>();
      attempts.forEach((attempt) => {
        (attempt.sectionAttempts ?? []).forEach((sa) => {
          const sectionId =
            typeof sa.sectionId === 'object'
              ? (sa.sectionId as any)._id
              : sa.sectionId;
          sectionsCompleted.add(String(sectionId));
        });
      });

      return {
        exercise,
        sectionsCompleted: sectionsCompleted.size,
        totalSections: exercise.sections.length,
        attempts,
      };
    });

    const quizzesWithAttempts = quizzes.map((quiz) => {
      const attempt = studentQuizAttempts.find(
        (a) => String(a.quizId) === String(quiz._id),
      );
      return {
        quiz,
        attempt,
      };
    });

    return {
      exercises: exercisesWithProgress.filter((e) => e.sectionsCompleted > 0),
      quizzes: quizzesWithAttempts.filter((q) => q.attempt != null),
    };
  };

  if (currentUser?.role !== 'admin' && currentUser?.role !== 'teacher') {
    return (
      <Box>
        <Alert severity="error">
          You do not have permission to access this page. Only teachers can access this page.
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const selectedExerciseData = selectedExerciseId
    ? getStudentsForExercise(selectedExerciseId)
    : null;
  const selectedQuizData = selectedQuizId
    ? getStudentsForQuiz(selectedQuizId)
    : null;
  const selectedStudentData = selectedStudentId
    ? getActivitiesForStudent(selectedStudentId)
    : null;

  // ── Excel export helpers ───────────────────────────────────────
  const exportExerciseTab = () => {
    if (!selectedExerciseData || !selectedExerciseId) return;
    const exercise = exercises.find((e) => e._id === selectedExerciseId);
    const rows = [
      ...selectedExerciseData.completed.map(({ student, sectionsCompleted, totalSections }) => ({
        'Student': student.username,
        'Email': student.email,
        'Exercise': exercise?.title ?? '',
        'Sections Completed': sectionsCompleted,
        'Total Sections': totalSections,
        'Status': 'Started',
      })),
      ...selectedExerciseData.notStarted.map(({ student }) => ({
        'Student': student.username,
        'Email': student.email,
        'Exercise': exercise?.title ?? '',
        'Sections Completed': 0,
        'Total Sections': exercise?.sections.length ?? 0,
        'Status': 'Not started',
      })),
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Exercise');
    XLSX.writeFile(wb, `exercise_${exercise?.title ?? 'report'}.xlsx`);
  };

  const exportQuizTab = () => {
    if (!selectedQuizData || !selectedQuizId) return;
    const quiz = quizzes.find((q) => q._id === selectedQuizId);
    const maxScore = quiz
      ? (quiz.sections ?? []).reduce((sum, section) => {
          if (['pronunciation', 'video-recording', 'writing'].includes(section.questionType)) return sum;
          return sum + (section.questions ?? []).reduce((s, q) => s + (q.point ?? 0), 0);
        }, 0)
      : 0;
    const rows = [
      ...selectedQuizData.completed.map(({ student, attempt }) => ({
        'Student': student.username,
        'Email': student.email,
        'Quiz': quiz?.title ?? '',
        'Score': attempt?.totalScore ?? 0,
        'Max Score': maxScore,
        'Percentage': maxScore > 0 ? `${Math.round(((attempt?.totalScore ?? 0) / maxScore) * 100)}%` : 'Completed',
        'Status': 'Completed',
      })),
      ...selectedQuizData.notStarted.map(({ student }) => ({
        'Student': student.username,
        'Email': student.email,
        'Quiz': quiz?.title ?? '',
        'Score': '',
        'Max Score': maxScore,
        'Percentage': '',
        'Status': 'Not started',
      })),
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quiz');
    XLSX.writeFile(wb, `quiz_${quiz?.title ?? 'report'}.xlsx`);
  };

  const exportStudentTab = () => {
    if (!selectedStudentData || !selectedStudentId) return;
    const student = students.find((s) => s._id === selectedStudentId);
    const exerciseRows = selectedStudentData.exercises.map(({ exercise, sectionsCompleted, totalSections }) => {
      const course = courses.find((c) => c._id === exercise.courseId);
      return {
        'Type': 'Exercise',
        'Title': exercise.title,
        'Course': course?.name ?? '',
        'Sections Completed': sectionsCompleted,
        'Total Sections': totalSections,
        'Score': '',
        'Max Score': '',
      };
    });
    const quizRows = selectedStudentData.quizzes.map(({ quiz, attempt }) => {
      const course = courses.find((c) => c._id === quiz.courseId);
      const maxScore = (quiz.sections ?? []).reduce((sum, section) => {
        if (['pronunciation', 'video-recording', 'writing'].includes(section.questionType)) return sum;
        return sum + (section.questions ?? []).reduce((s, q) => s + (q.point ?? 0), 0);
      }, 0);
      return {
        'Type': 'Quiz',
        'Title': quiz.title,
        'Course': course?.name ?? '',
        'Sections Completed': '',
        'Total Sections': '',
        'Score': attempt?.totalScore ?? 0,
        'Max Score': maxScore,
      };
    });
    const ws = XLSX.utils.json_to_sheet([...exerciseRows, ...quizRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student');
    XLSX.writeFile(wb, `student_${student?.username ?? 'report'}.xlsx`);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Statistics and Reports
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Track student progress
      </Typography>

      {/* Overview Statistics */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(4, 1fr)',
          },
          gap: 3,
          mb: 4,
        }}
      >
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PeopleIcon sx={{ color: 'primary.main', mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Students
              </Typography>
            </Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: 'primary.main' }}
            >
              {students.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total students
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AssignmentIcon sx={{ color: 'secondary.main', mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Exercises
              </Typography>
            </Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: 'secondary.main' }}
            >
              {avgSectionCompletionRate.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Average completion rate
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <QuizIcon sx={{ color: 'success.main', mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Quiz
              </Typography>
            </Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: 'success.main' }}
            >
              {avgQuizCompletionRate.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Average completion rate
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TrendingUpIcon sx={{ color: 'warning.main', mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Average score
              </Typography>
            </Box>
            <Typography
              variant="h4"
              sx={{ fontWeight: 700, color: 'warning.main' }}
            >
              {averageScore.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Average score
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Card>
        <Tabs
          value={tab}
          onChange={(_: React.SyntheticEvent, newValue: TabValue) => {
            setTab(newValue);
            setSelectedExerciseId('');
            setSelectedQuizId('');
            setSelectedStudentId('');
          }}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Exercises" value="exercises" />
          <Tab label="Quizzes" value="quizzes" />
          <Tab label="Students" value="students" />
        </Tabs>

        <CardContent>
          {/* Exercise Tab */}
          {tab === 'exercises' && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Autocomplete
                  options={exercises}
                  getOptionLabel={(option) => {
                    const course = courses.find((c) => c._id === option.courseId);
                    return `${option.title} (${course?.name || 'Unknown'})`;
                  }}
                  value={
                    exercises.find((ex) => ex._id === selectedExerciseId) || null
                  }
                  onChange={(_, newValue) => {
                    setSelectedExerciseId(newValue?._id || '');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select exercise"
                      placeholder="Search exercise..."
                    />
                  )}
                  sx={{ flex: 1, mr: 2 }}
                  noOptionsText="No exercises found"
                />
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<FileDownloadIcon />}
                  onClick={exportExerciseTab}
                  disabled={!selectedExerciseData}
                >
                  Export Excel
                </Button>
              </Box>

              {selectedExerciseData && (
                <Box>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <CheckCircleIcon color="success" />
                    Completed ({selectedExerciseData.completed.length})
                  </Typography>
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ mb: 3 }}
                  >
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Student
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Progress
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Action
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedExerciseData.completed.map(
                          ({ student, sectionsCompleted, totalSections }) => (
                            <TableRow key={student._id} hover>
                              <TableCell>{student.username}</TableCell>
                              <TableCell>{student.email}</TableCell>
                              <TableCell>
                                <Chip
                                  label={`${sectionsCompleted}/${totalSections} phần`}
                                  color={
                                    sectionsCompleted === totalSections
                                      ? 'success'
                                      : 'warning'
                                  }
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label="View details"
                                  color="primary"
                                  size="small"
                                  onClick={() =>
                                    navigate(
                                      `/attempt/exercise/${selectedExerciseId}?studentId=${student._id}`,
                                    )
                                  }
                                  sx={{ cursor: 'pointer' }}
                                />
                              </TableCell>
                            </TableRow>
                          ),
                        )}
                        {selectedExerciseData.completed.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              <Typography color="text.secondary">
                                No students have completed this exercise
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <CancelIcon color="error" />
                    Not started ({selectedExerciseData.notStarted.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Student
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedExerciseData.notStarted.map(({ student }) => (
                          <TableRow key={student._id}>
                            <TableCell>{student.username}</TableCell>
                            <TableCell>{student.email}</TableCell>
                          </TableRow>
                        ))}
                        {selectedExerciseData.notStarted.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} align="center">
                              <Typography color="text.secondary">
                                All students have completed this exercise
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}

          {/* Quiz Tab */}
          {tab === 'quizzes' && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Autocomplete
                  options={quizzes}
                  getOptionLabel={(option) => {
                    const course = courses.find((c) => c._id === option.courseId);
                    return `${option.title} (${course?.name || 'Unknown'})`;
                  }}
                  value={quizzes.find((q) => q._id === selectedQuizId) || null}
                  onChange={(_, newValue) => {
                    setSelectedQuizId(newValue?._id || '');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select quiz"
                      placeholder="Search quiz..."
                    />
                  )}
                  sx={{ flex: 1, mr: 2 }}
                  noOptionsText="No quizzes found"
                />
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<FileDownloadIcon />}
                  onClick={exportQuizTab}
                  disabled={!selectedQuizData}
                >
                  Export Excel
                </Button>
              </Box>

              {selectedQuizData && (
                <Box>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <CheckCircleIcon color="success" />
                    Completed ({selectedQuizData.completed.length})
                  </Typography>
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ mb: 3 }}
                  >
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Student
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Score</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Action
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedQuizData.completed.map(
                          ({ student, attempt }) => {
                            const quiz = quizzes.find(
                              (q) => q._id === selectedQuizId,
                            );
                            const maxScore = quiz
                              ? (quiz.sections ?? []).reduce((sum, section) => {
                                  if (
                                    [
                                      'pronunciation',
                                      'video-recording',
                                      'writing',
                                    ].includes(section.questionType)
                                  ) {
                                    return sum;
                                  }
                                  return (
                                    sum +
                                    (section.questions ?? []).reduce(
                                      (s, q) => s + (q.point ?? 0),
                                      0,
                                    )
                                  );
                                }, 0)
                              : 0;

                            return (
                              <TableRow key={student._id} hover>
                                <TableCell>{student.username}</TableCell>
                                <TableCell>{student.email}</TableCell>
                                <TableCell>
                                  {maxScore > 0 ? (
                                    <Chip
                                      label={`${attempt?.totalScore ?? 0}/${maxScore}`}
                                      color="primary"
                                      size="small"
                                    />
                                  ) : (
                                    <Chip
                                      label="Completed"
                                      color="success"
                                      size="small"
                                    />
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label="View details"
                                    color="primary"
                                    size="small"
                                    onClick={() =>
                                      navigate(
                                        `/attempt/quiz/${selectedQuizId}?studentId=${student._id}`,
                                      )
                                    }
                                    sx={{ cursor: 'pointer' }}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          },
                        )}
                        {selectedQuizData.completed.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              <Typography color="text.secondary">
                                No students have completed this quiz
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                  >
                    <CancelIcon color="error" />
                    Not started ({selectedQuizData.notStarted.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Student
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedQuizData.notStarted.map(({ student }) => (
                          <TableRow key={student._id}>
                            <TableCell>{student.username}</TableCell>
                            <TableCell>{student.email}</TableCell>
                          </TableRow>
                        ))}
                        {selectedQuizData.notStarted.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={2} align="center">
                              <Typography color="text.secondary">
                                All students have completed this quiz
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}

          {/* Student Tab */}
          {tab === 'students' && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Autocomplete
                  options={students}
                  getOptionLabel={(option) =>
                    `${option.username} (${option.email})`
                  }
                  value={
                    students.find((s) => s._id === selectedStudentId) || null
                  }
                  onChange={(_, newValue) => {
                    setSelectedStudentId(newValue?._id || '');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Select student"
                      placeholder="Search student..."
                    />
                  )}
                  sx={{ flex: 1, mr: 2 }}
                  noOptionsText="No students found"
                />
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<FileDownloadIcon />}
                  onClick={exportStudentTab}
                  disabled={!selectedStudentData}
                >
                  Export Excel
                </Button>
              </Box>

              {selectedStudentData && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Exercises completed ({selectedStudentData.exercises.length})
                  </Typography>
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ mb: 3 }}
                  >
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Exercise
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Course
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Progress
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Action
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedStudentData.exercises.map(
                          ({ exercise, sectionsCompleted, totalSections }) => {
                            const course = courses.find(
                              (c) => c._id === exercise.courseId,
                            );
                            return (
                              <TableRow key={exercise._id} hover>
                                <TableCell>{exercise.title}</TableCell>
                                <TableCell>
                                  {course?.name || 'Unknown'}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label={`${sectionsCompleted}/${totalSections} phần`}
                                    color={
                                      sectionsCompleted === totalSections
                                        ? 'success'
                                        : 'warning'
                                    }
                                    size="small"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label="View details"
                                    color="primary"
                                    size="small"
                                    onClick={() =>
                                      navigate(
                                        `/attempt/exercise/${exercise._id}?studentId=${selectedStudentId}`,
                                      )
                                    }
                                    sx={{ cursor: 'pointer' }}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          },
                        )}
                        {selectedStudentData.exercises.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              <Typography color="text.secondary">
                                No exercises completed
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Typography variant="h6" gutterBottom>
                    Quiz completed ({selectedStudentData.quizzes.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600 }}>Quiz</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Course
                          </TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>Score</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            Action
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedStudentData.quizzes.map(
                          ({ quiz, attempt }) => {
                            const course = courses.find(
                              (c) => c._id === quiz.courseId,
                            );
                            const maxScore = (quiz.sections ?? []).reduce(
                              (sum, section) => {
                                if (
                                  [
                                    'pronunciation',
                                    'video-recording',
                                    'writing',
                                  ].includes(section.questionType)
                                ) {
                                  return sum;
                                }
                                return (
                                  sum +
                                  (section.questions ?? []).reduce(
                                    (s, q) => s + (q.point ?? 0),
                                    0,
                                  )
                                );
                              },
                              0,
                            );

                            return (
                              <TableRow key={quiz._id} hover>
                                <TableCell>{quiz.title}</TableCell>
                                <TableCell>
                                  {course?.name || 'Unknown'}
                                </TableCell>
                                <TableCell>
                                  {maxScore > 0 ? (
                                    <Chip
                                      label={`${attempt?.totalScore ?? 0}/${maxScore}`}
                                      color="primary"
                                      size="small"
                                    />
                                  ) : (
                                    <Chip
                                      label="Completed"
                                      color="success"
                                      size="small"
                                    />
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    label="View details"
                                    color="primary"
                                    size="small"
                                    onClick={() =>
                                      navigate(
                                        `/attempt/quiz/${quiz._id}?studentId=${selectedStudentId}`,
                                      )
                                    }
                                    sx={{ cursor: 'pointer' }}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          },
                        )}
                        {selectedStudentData.quizzes.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} align="center">
                              <Typography color="text.secondary">
                                No quizzes completed
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
