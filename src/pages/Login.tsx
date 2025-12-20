import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { School as SchoolIcon } from '@mui/icons-material';
import { setUser } from '../services/storage';
import type { User } from '../types';

export default function Login() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    if (!name || !email) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (role === 'student' && !studentId) {
      setError('Vui lòng nhập mã sinh viên');
      return;
    }

    const user: User = {
      id: Date.now().toString(),
      name,
      email,
      role,
      ...(role === 'student' && { studentId }),
    };

    setUser(user);
    navigate('/');
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
            <SchoolIcon sx={{ fontSize: 48, color: 'primary.main', mr: 2 }} />
            <Typography variant="h4" component="h1">
              Đăng nhập
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box component="form" sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Họ và tên"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>Vai trò</InputLabel>
              <Select value={role} label="Vai trò" onChange={(e) => setRole(e.target.value as 'student' | 'teacher')}>
                <MenuItem value="student">Sinh viên</MenuItem>
                <MenuItem value="teacher">Giảng viên</MenuItem>
              </Select>
            </FormControl>
            {role === 'student' && (
              <TextField
                margin="normal"
                required
                fullWidth
                label="Mã sinh viên"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            )}
            <Button
              type="button"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              onClick={handleLogin}
            >
              Đăng nhập
            </Button>
            <Typography variant="body2" color="text.secondary" align="center">
              Lưu ý: Đây là phiên bản demo, không cần xác thực thật
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

