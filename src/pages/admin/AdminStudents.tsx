import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { People as PeopleIcon } from '@mui/icons-material';
import { getQuizAttempts, getExerciseAttempts } from '../../services/storage';

export default function AdminStudents() {
  // Get all unique students from attempts
  const quizAttempts = getQuizAttempts(''); // Empty string to get all
  const exerciseAttempts = getExerciseAttempts(''); // Empty string to get all
  
  const uniqueStudents = new Set([
    ...quizAttempts.map(a => a.studentId),
    ...exerciseAttempts.map(a => a.studentId),
  ]);

  const students = Array.from(uniqueStudents).map(studentId => {
    const studentQuizAttempts = quizAttempts.filter(a => a.studentId === studentId);
    const studentExerciseAttempts = exerciseAttempts.filter(a => a.studentId === studentId);
    
    const allScores = [
      ...studentQuizAttempts.map(a => (a.score / a.maxScore) * 100),
      ...studentExerciseAttempts.map(a => (a.score / a.maxScore) * 100),
    ];
    
    const averageScore = allScores.length > 0
      ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
      : 0;

    return {
      id: studentId,
      name: `Sinh viên ${studentId}`,
      totalAttempts: studentQuizAttempts.length + studentExerciseAttempts.length,
      averageScore,
    };
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
        <Box>
          <Typography variant="h4">Quản lý Sinh viên</Typography>
          <Typography variant="body2" color="text.secondary">
            Danh sách sinh viên và kết quả học tập
          </Typography>
        </Box>
      </Box>

      {students.length === 0 ? (
        <Card>
          <CardContent>
            <Alert severity="info">Chưa có sinh viên nào trong hệ thống.</Alert>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>STT</TableCell>
                    <TableCell>Tên sinh viên</TableCell>
                    <TableCell align="right">Số lần làm bài</TableCell>
                    <TableCell align="right">Điểm trung bình</TableCell>
                    <TableCell align="center">Trạng thái</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student, index) => (
                    <TableRow key={student.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell align="right">{student.totalAttempts}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${student.averageScore.toFixed(1)}%`}
                          color={student.averageScore >= 70 ? 'success' : student.averageScore >= 50 ? 'warning' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={student.averageScore >= 70 ? 'Tốt' : student.averageScore >= 50 ? 'Trung bình' : 'Cần cải thiện'}
                          size="small"
                          color={student.averageScore >= 70 ? 'success' : student.averageScore >= 50 ? 'warning' : 'error'}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

