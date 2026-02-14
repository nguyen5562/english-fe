import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  MenuBook as MenuBookIcon,
  Assignment as AssignmentIcon,
  Quiz as QuizIcon,
  Assessment as AssessmentIcon,
  BarChart as BarChartIcon,
  AccountCircle as AccountCircleIcon,
  School as SchoolIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuthStore } from '../../store/auth.store';
import { userService } from '../../services/user.service';
import { authService } from '../../services/auth.service';
import { toast } from '../../utils/toast';
import { useUIStore } from '../../store/ui.store';
import type { User } from '../../types';

const drawerWidth = 240;

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '' });
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const updateUserInStore = useAuthStore((s) => s.updateUser);
  const isQuizLocked = useUIStore((s) => s.isQuizLocked);

  const menuItems = () => [
    { text: 'Trang chủ', icon: <DashboardIcon />, path: '/' },
    { text: 'Khóa học', icon: <MenuBookIcon />, path: '/materials' },
    { text: 'Bài tập', icon: <AssignmentIcon />, path: '/exercises' },
    { text: 'Quiz', icon: <QuizIcon />, path: '/quizzes' },
    ...(user?.role === 'teacher'
      ? [
          {
            text: 'Báo cáo thống kê',
            icon: <BarChartIcon />,
            path: '/statistics',
          },
        ]
      : [
          {
            text: 'Tiến độ học tập',
            icon: <AssessmentIcon />,
            path: '/progress',
          },
        ]),
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    if (isQuizLocked) {
      toast.warning(
        'Bạn đang trong quá trình làm quiz. Vui lòng hoàn thành hoặc hủy sát hạch trước khi chuyển trang.',
      );
      return;
    }
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfileClick = () => {
    handleMenuClose();
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
      });
      setProfileError('');
      setProfileOpen(true);
    }
  };

  const handleProfileClose = () => {
    setProfileOpen(false);
    // Reset form data to original values
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
      });
    }
  };

  const handleProfileCancel = () => {
    // Reset form data to original values
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
      });
    }
    setProfileOpen(false);
  };

  const handleProfileSave = async () => {
    if (!user) return;
    setProfileError('');
    setProfileSaving(true);
    try {
      const dto: Partial<User> = {
        username: formData.username,
        email: formData.email,
      };
      const updated: User = await userService.updateUser(user._id, dto);
      updateUserInStore(updated);
      setProfileOpen(false);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Cập nhật thông tin thất bại';
        setProfileError(String(msg));
      } else {
        setProfileError('Cập nhật thông tin thất bại');
      }
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePasswordClick = () => {
    handleMenuClose();
    setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    setChangePasswordOpen(true);
  };

  const handleChangePasswordClose = () => {
    setChangePasswordOpen(false);
    setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
  };

  const handleChangePasswordSave = async () => {
    setPasswordError('');

    if (
      !passwordData.oldPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      setPasswordError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp');
      return;
    }

    setPasswordSaving(true);
    try {
      await authService.changePassword(
        passwordData.oldPassword,
        passwordData.newPassword,
      );
      setChangePasswordOpen(false);
      setPasswordData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordError('');
      toast.success('Đổi mật khẩu thành công!');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Đổi mật khẩu thất bại';
        setPasswordError(String(msg));
      } else {
        setPasswordError('Đổi mật khẩu thất bại');
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleAdminClick = () => {
    if (isQuizLocked) {
      toast.warning(
        'Bạn đang trong quá trình làm quiz. Vui lòng hoàn thành hoặc hủy sát hạch trước khi chuyển trang.',
      );
      return;
    }
    handleMenuClose();
    navigate('/admin');
  };

  const handleLogout = () => {
    if (isQuizLocked) {
      toast.warning(
        'Bạn đang trong quá trình làm quiz. Vui lòng hoàn thành bài trước khi đăng xuất.',
      );
      return;
    }
    handleMenuClose();
    logout();
    toast.success('Đăng xuất thành công!');
    navigate('/login');
  };

  const isMenuOpen = Boolean(anchorEl);

  const drawer = (
    <Box>
      <Toolbar sx={{ bgcolor: 'primary.main', color: 'white' }}>
        <SchoolIcon sx={{ mr: 2 }} />
        <Typography variant="h6" noWrap component="div">
          Học Tiếng Anh
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems().map((item) => {
          // Hide teacher-only items for students
          if (user?.role === 'student' && item.path === '/statistics') {
            return null;
          }
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={location.pathname === item.path}
                onClick={() => handleNavigation(item.path)}
              >
                <ListItemIcon
                  sx={{
                    color:
                      location.pathname === item.path
                        ? 'primary.main'
                        : 'inherit',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Hệ thống Học Tiếng Anh Đại học
          </Typography>
          <IconButton
            size="large"
            edge="end"
            aria-label="account menu"
            aria-controls={isMenuOpen ? 'account-menu' : undefined}
            aria-haspopup="true"
            onClick={handleMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </Avatar>
          </IconButton>
          <Menu
            id="account-menu"
            anchorEl={anchorEl}
            open={isMenuOpen}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleProfileClick}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <PersonIcon />
              </Avatar>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {user?.username || 'Người dùng'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email || ''}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip
                    label={
                      user?.role === 'teacher' ? 'Giảng viên' : 'Sinh viên'
                    }
                    size="small"
                    color="secondary"
                  />
                </Box>
              </Box>
            </MenuItem>
            <Divider />
            {user?.role === 'teacher' && (
              <MenuItem onClick={handleAdminClick}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                Đến trang quản trị
              </MenuItem>
            )}
            <MenuItem onClick={handleProfileClick}>
              <ListItemIcon>
                <AccountCircleIcon fontSize="small" />
              </ListItemIcon>
              Thông tin cá nhân
            </MenuItem>
            <MenuItem onClick={handleChangePasswordClick}>
              <ListItemIcon>
                <LockIcon fontSize="small" />
              </ListItemIcon>
              Đổi mật khẩu
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Đăng xuất
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>

      {/* Profile Dialog */}
      <Dialog
        open={profileOpen}
        onClose={handleProfileClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Thông tin cá nhân</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {profileError && (
              <Alert
                severity="error"
                sx={{ mb: 2 }}
                onClose={() => setProfileError('')}
              >
                {profileError}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Tên người dùng"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Vai trò"
              value={user?.role === 'teacher' ? 'Giảng viên' : 'Sinh viên'}
              disabled
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleProfileCancel} disabled={profileSaving}>
            Hủy
          </Button>
          <Button
            onClick={handleProfileSave}
            variant="contained"
            disabled={profileSaving}
          >
            {profileSaving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog
        open={changePasswordOpen}
        onClose={handleChangePasswordClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Đổi mật khẩu</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {passwordError && (
              <Alert
                severity="error"
                sx={{ mb: 2 }}
                onClose={() => setPasswordError('')}
              >
                {passwordError}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Mật khẩu cũ"
              type="password"
              value={passwordData.oldPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  oldPassword: e.target.value,
                })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Mật khẩu mới"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  newPassword: e.target.value,
                })
              }
              margin="normal"
            />
            <TextField
              fullWidth
              label="Nhập lại mật khẩu mới"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  confirmPassword: e.target.value,
                })
              }
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleChangePasswordClose} disabled={passwordSaving}>
            Hủy
          </Button>
          <Button
            onClick={handleChangePasswordSave}
            variant="contained"
            disabled={passwordSaving}
          >
            {passwordSaving ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
