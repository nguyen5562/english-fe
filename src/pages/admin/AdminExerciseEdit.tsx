import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { exerciseService } from '../../services/exercise.service';
import { courseService } from '../../services/course.service';
import { useConfirm } from '../../components/ConfirmDialog';
import { toast } from '../../utils/toast';
import type { Exercise, Course } from '../../types';

export default function AdminExerciseEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirm();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    description: '',
    courseId: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      exerciseService.getExerciseById(id),
      courseService.getAllCourse(),
    ])
      .then(([exData, coData]) => {
        if (!cancelled) {
          setExercise(exData);
          setCourses(coData);
          setEditData({
            title: exData.title,
            description: exData.description || '',
            courseId: exData.courseId,
          });
        }
      })
      .catch((e: unknown) => {
        if (!cancelled && axios.isAxiosError(e)) {
          const msg =
            (e.response?.data as { message?: string })?.message ??
            e.response?.statusText ??
            'Failed to load exercise';
          toast.error(String(msg));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDeleteSection = async (sectionId: string) => {
    if (!id) return;
    const ok = await confirm({
      title: 'Confirm delete section',
      message: 'Are you sure you want to delete this section?',
      confirmText: 'Delete',
      confirmColor: 'error',
    });
    if (!ok) return;
    try {
      setDeleting(true);
      const updated = await exerciseService.removeSection(id, sectionId);
      setExercise(updated);
      toast.success('Deleted section successfully');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Failed to delete section';
        toast.error(String(msg));
      } else {
        toast.error('Failed to delete section');
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveInfo = async () => {
    if (!id || !exercise) return;
    try {
      setSaving(true);
      const updated = await exerciseService.updateExercise(id, editData);
      setExercise(updated);
      setEditDialogOpen(false);
      toast.success('Updated exercise information successfully');
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg =
          (e.response?.data as { message?: string })?.message ??
          e.response?.statusText ??
          'Failed to update';
        toast.error(String(msg));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading || !id) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!exercise) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin/exercises')}
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        <Typography color="text.secondary">Exercise not found.</Typography>
      </Box>
    );
  }

  const courseName =
    courses.find((c) => c._id === exercise.courseId)?.name ?? 'N/A';

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/admin/exercises')}
        sx={{ mb: 2 }}
      >
        Back
      </Button>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <AssignmentIcon
              sx={{ fontSize: 40, color: 'primary.main', mr: 2 }}
            />
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5">{exercise.title}</Typography>
              <Typography variant="body2" color="text.secondary">
                {courseName} · {exercise.sections?.length ?? 0} sections
              </Typography>
            </Box>
            <Button
              startIcon={<EditIcon />}
              variant="outlined"
              size="small"
              onClick={() => setEditDialogOpen(true)}
            >
              Edit
            </Button>
          </Box>
          {exercise.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {exercise.description}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ mb: 2 }}>
        Sections
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() =>
          navigate(
            `/admin/exercises/${exercise.title ? exercise._id : ''}/sections/new`,
          )
        }
        sx={{ mb: 2 }}
      >
        Add section
      </Button>

      {(exercise.sections?.length ?? 0) === 0 ? (
        <Typography color="text.secondary">
          No sections found. Click &quot;Add section&quot; to create one.
        </Typography>
      ) : (
        <List>
          {(exercise.sections ?? []).map((section) => (
            <ListItem key={section._id} sx={{ mb: 1, p: 0 }}>
              <Card sx={{ width: '100%' }}>
                <CardContent
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    '&:last-child': { pb: 2 },
                  }}
                >
                  <ListItemText
                    primary={section.title}
                    secondary={
                      <Box
                        component="span"
                        sx={{ display: 'flex', gap: 1, mt: 0.5 }}
                      >
                        <Chip
                          label={section.sectionType}
                          size="small"
                          variant="outlined"
                        />
                        <Chip label={section.questionType} size="small" />
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                        >
                          {section.questions?.length ?? 0} questions
                        </Typography>
                      </Box>
                    }
                  />
                  <Box>
                    <IconButton
                      onClick={() =>
                        navigate(
                          `/admin/exercises/${exercise._id}/sections/${section._id}`,
                        )
                      }
                      sx={{ mr: 0.5 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteSection(section._id)}
                      disabled={deleting}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </ListItem>
          ))}
        </List>
      )}

      {ConfirmDialog}

      {/* Edit Info Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => !saving && setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit exercise information</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title"
              fullWidth
              value={editData.title}
              onChange={(e) =>
                setEditData({ ...editData, title: e.target.value })
              }
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={editData.description}
              onChange={(e) =>
                setEditData({ ...editData, description: e.target.value })
              }
            />
            <FormControl fullWidth>
              <InputLabel>Course</InputLabel>
              <Select
                value={editData.courseId}
                label="Course"
                onChange={(e) =>
                  setEditData({ ...editData, courseId: e.target.value })
                }
              >
                {courses.map((c) => (
                  <MenuItem key={c._id} value={c._id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveInfo}
            variant="contained"
            disabled={saving || !editData.title || !editData.courseId}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
