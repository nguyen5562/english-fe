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
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Courses', icon: <MenuBookIcon />, path: '/materials' },
    { text: 'Exercises', icon: <AssignmentIcon />, path: '/exercises' },
    { text: 'Quizzes', icon: <QuizIcon />, path: '/quizzes' },
    ...(user?.role === 'teacher'
      ? [
          {
            text: 'Statistics',
            icon: <BarChartIcon />,
            path: '/statistics',
          },
        ]
      : [
          {
            text: 'Progress',
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
        'You are in the process of taking a quiz. Please complete or cancel the exam before switching pages.',
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
          'Update profile failed';
        setProfileError(String(msg));
      } else {
        setProfileError('Update profile failed');
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
      setPasswordError('Please fill in all information');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Password confirmation does not match');
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
      toast.success('Change password successfully!');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Change password failed';
        setPasswordError(String(msg));
      } else {
        setPasswordError('Change password failed');
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleAdminClick = () => {
    if (isQuizLocked) {
      toast.warning(
        'You are in the process of taking a quiz. Please complete or cancel the exam before switching pages.',
      );
      return;
    }
    handleMenuClose();
    navigate('/admin');
  };

  const handleLogout = () => {
    if (isQuizLocked) {
      toast.warning(
        'You are in the process of taking a quiz. Please complete the exam before logging out.',
      );
      return;
    }
    handleMenuClose();
    logout();
    toast.success('Logout successfully!');
    navigate('/login');
  };

  const isMenuOpen = Boolean(anchorEl);

  const drawer = (
    <Box>
      <Toolbar sx={{ bgcolor: 'primary.main', color: 'white' }}>
        <SchoolIcon sx={{ mr: 2 }} />
        <Typography variant="h6" noWrap component="div">
          English Learning
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
            English Learning System
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
                  {user?.username || 'User'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email || ''}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip
                    label={
                      user?.role === 'teacher' ? 'Teacher' : 'Student'
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
                Admin
              </MenuItem>
            )}
            <MenuItem onClick={handleProfileClick}>
              <ListItemIcon>
                <AccountCircleIcon fontSize="small" />
              </ListItemIcon>
              Profile
            </MenuItem>
            <MenuItem onClick={handleChangePasswordClick}>
              <ListItemIcon>
                <LockIcon fontSize="small" />
              </ListItemIcon>
              Change password
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Logout
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
        <DialogTitle>Profile</DialogTitle>
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
              label="Username"
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
              label="Role"
              value={user?.role === 'teacher' ? 'Teacher' : 'Student'}
              disabled
              margin="normal"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleProfileCancel} disabled={profileSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleProfileSave}
            variant="contained"
            disabled={profileSaving}
          >
            {profileSaving ? 'Saving...' : 'Save'}
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
        <DialogTitle>Change password</DialogTitle>
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
              label="Old password"
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
              label="New password"
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
              label="Confirm new password"
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
            Cancel
          </Button>
          <Button
            onClick={handleChangePasswordSave}
            variant="contained"
            disabled={passwordSaving}
          >
            {passwordSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
