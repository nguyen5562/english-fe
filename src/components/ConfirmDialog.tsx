import { useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: "primary" | "error" | "warning";
};

let confirmResolver: ((value: boolean) => void) | null = null;

export const useConfirm = () => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    message: "",
  });

  const confirm = useCallback(
    (opts: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setOptions(opts);
        setOpen(true);
        confirmResolver = resolve;
      });
    },
    []
  );

  const handleClose = useCallback((confirmed: boolean) => {
    setOpen(false);
    if (confirmResolver) {
      confirmResolver(confirmed);
      confirmResolver = null;
    }
  }, []);

  const ConfirmDialog = (
    <Dialog
      open={open}
      onClose={() => handleClose(false)}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      {options.title && (
        <DialogTitle sx={{ fontWeight: 600 }}>{options.title}</DialogTitle>
      )}
      <DialogContent>
        <DialogContentText>{options.message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={() => handleClose(false)}
          sx={{ textTransform: "none" }}
        >
          {options.cancelText || "Hủy"}
        </Button>
        <Button
          onClick={() => handleClose(true)}
          variant="contained"
          color={options.confirmColor || "primary"}
          sx={{ textTransform: "none" }}
        >
          {options.confirmText || "Xác nhận"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return { confirm, ConfirmDialog };
};
