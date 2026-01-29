import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "@mui/material";
import { Assignment as AssignmentIcon } from "@mui/icons-material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  getExercises,
  getCourses,
  getExerciseAttempts,
  getUser,
} from "../types old/storage";
import type { Exercise } from "../types old";

export default function Exercises() {
  const [exercises] = useState<Exercise[]>(() => getExercises());
  const [courses] = useState<{ id: string; name: string }[]>(() =>
    getCourses().map((c) => ({ id: c.id, name: c.name }))
  );
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const navigate = useNavigate();
  const user = getUser();

  // Mapping từ sectionType sang label hiển thị và màu cho Chip
  const sectionTypeMap: Record<
    string,
    {
      label: string;
      color?:
        | "primary"
        | "secondary"
        | "error"
        | "info"
        | "success"
        | "warning";
    }
  > = {
    grammar: { label: "Grammar", color: "primary" },
    vocabulary: { label: "Vocabulary", color: "success" },
    listening: { label: "Listening", color: "info" },
    reading: { label: "Reading", color: "warning" },
    pronunciation: { label: "Pronunciation", color: "secondary" },
    speaking: { label: "Speaking", color: "error" },
    writing: { label: "Writing", color: "warning" },
    mixed: { label: "Mixed" },
  };

  const filteredExercises =
    selectedCourse === "all"
      ? exercises
      : exercises.filter((e) => e.courseId === selectedCourse);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
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
              <MenuItem key={course.id} value={course.id}>
                {course.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {filteredExercises.length === 0 ? (
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
            // gather attempts per section to compute sections completed and overall percent (using last attempt per section)
            const attempts = user
              ? getExerciseAttempts(user.id, exercise.id)
              : [];
            const lastAttemptBySection = new Map<
              number,
              (typeof attempts)[0]
            >();
            attempts.forEach((a) => {
              if (typeof a.sectionIndex === "number") {
                const idx = a.sectionIndex as number;
                const prev = lastAttemptBySection.get(idx);
                if (
                  !prev ||
                  new Date(a.completedAt).getTime() >
                    new Date(prev.completedAt).getTime()
                ) {
                  lastAttemptBySection.set(idx, a);
                }
              }
            });
            const sectionsCompleted = lastAttemptBySection.size;

            const totalSections = exercise.sections.length;
            let totalPercent = 0;

            for (let i = 0; i < totalSections; i++) {
              const attempt = lastAttemptBySection.get(i);
              if (attempt) {
                totalPercent += (attempt.score / attempt.maxScore) * 100;
              }
              // chưa làm → +0
            }

            const overallPercent =
              totalSections > 0 ? Math.round(totalPercent / totalSections) : 0;

            return (
              <Accordion
                key={exercise.id}
                disableGutters
                sx={{ mb: 2, borderRadius: 1, boxShadow: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                    }}
                  >
                    <AssignmentIcon
                      sx={{ fontSize: 36, color: "primary.main", mr: 2 }}
                    />
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6">{exercise.title}</Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ display: "flex", gap: 1, alignItems: "center" }}
                      >
                        <span>
                          {
                            courses.find((c) => c.id === exercise.courseId)
                              ?.name
                          }
                        </span>
                        <span>·</span>
                        <span>
                          {sectionsCompleted}/{(exercise.sections ?? []).length}{" "}
                          phần đã làm
                        </span>
                        <span>·</span>
                        <span>Điểm tổng: {overallPercent}%</span>
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
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
                            0
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
                      const sectionAttempts = user
                        ? getExerciseAttempts(user.id, exercise.id).filter(
                            (a) => a.sectionIndex === idx
                          )
                        : [];
                      const lastAttempt =
                        sectionAttempts.length > 0
                          ? sectionAttempts
                              .slice()
                              .sort(
                                (a, b) =>
                                  new Date(b.completedAt).getTime() -
                                  new Date(a.completedAt).getTime()
                              )[0]
                          : null;
                      const tries = lastAttempt
                        ? lastAttempt.tries ?? sectionAttempts.length
                        : 0;
                      const lastPercent = lastAttempt
                        ? Math.round(
                            (lastAttempt.score / lastAttempt.maxScore) * 100
                          )
                        : null;

                      return (
                        <ListItemButton
                          key={section.id}
                          onClick={() =>
                            navigate(`/exercises/${exercise.id}?section=${idx}`)
                          }
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <ListItemText
                              primary={section.title}
                              secondary={section.description}
                              sx={{ mr: 2 }}
                            />
                            <Chip
                              label={
                                sectionTypeMap[section.sectionType]?.label ??
                                section.sectionType
                              }
                              size="small"
                              color={
                                sectionTypeMap[section.sectionType]
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  ?.color as any
                              }
                              variant={
                                sectionTypeMap[section.sectionType]?.color
                                  ? "filled"
                                  : "outlined"
                              }
                              sx={{ textTransform: "capitalize", ml: 1 }}
                            />
                          </Box>

                          <Box
                            sx={{
                              display: "flex",
                              gap: 2,
                              alignItems: "center",
                            }}
                          >
                            <Box sx={{ textAlign: "center" }}>
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
                                {tries === 1 ? "try" : "tries"}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: "center" }}>
                              <Typography variant="body2">
                                {lastPercent !== null ? `${lastPercent}%` : "-"}
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
