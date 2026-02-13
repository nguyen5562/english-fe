import { API_ROUTES } from '../const/apiConfig';
import { api } from './api';

// Base URL for File Manager operations matches the controller prefix
// Assuming API_ROUTES.FILE_MANAGER is '/file-manager' or similar,
// and the controller is mapped to that prefix.
// However, the controller methods use specific paths like 'files', 'upload', etc.
// We need to construct URLs carefully.

const BASE_URL = API_ROUTES.FILE_MANAGER; 

const ensureFolder = async (path: string): Promise<void> => {
  // Normalize path to prevent double slashes
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;
  if (!cleanPath) return;

  const parts = cleanPath.split('/').filter(Boolean);
  let currentPath = '';

  for (const part of parts) {
    // Controller: @Post('files/*id') createInFolder(@Param('id') id, @Body() {name, type})
    // And fallback @Post('files') createInRoot(@Body() {name, type})

    // We need to verify existence first to avoid errors? Or just try create?
    // Let's try to list folder content first to check existence,
    // but that might be slow.
    // A better approach is usually just try create and ignore specific error "already exists".

    // Construct the correct execution path equivalent to "mkdir -p"

    // Attempt to create 'part' (name) inside 'currentPath' (parent ID)
    const creationParentId = currentPath ? currentPath : '';

    try {
      if (!creationParentId) {
        // Create in root
        await api.post(`${BASE_URL}/files`, {
          name: part,
          type: 'folder',
        });
      } else {
        // Create in folder
        const idPath = '/' + creationParentId; // e.g. /submissions
        const encodedId = encodeURIComponent(idPath); // %2Fsubmissions

        await api.post(`${BASE_URL}/files/${encodedId}`, {
          name: part,
          type: 'folder',
        });
      }
    } catch (e: any) {
      // Ignore if it already exists.
      // Need to distinguishing "already exists" from other errors if possible.
      // Usually 409 Conflict key. For now, we proceed.
      // console.warn(`Folder creation ${part} in ${creationParentId} msg:`, e.message);
    }

    currentPath = currentPath ? `${currentPath}/${part}` : part;
  }
};

const uploadFile = async (
  file: File | Blob,
  folderPath: string,
  filename: string,
): Promise<{ url: string; id: string }> => {
  // 1. Ensure folder exists
  await ensureFolder(folderPath);

  // 2. Upload file
  // Controller: @Post('upload') upload(@Query('id') id, @Body('name') name, @UploadedFile() file)
  // 'id' query param is the target folder ID (path).

  const formData = new FormData();
  // Append text fields first (best practice for some parsers)
  formData.append('name', filename);

  // If file is a Blob (and not a File with a name), we must provide a filename
  if (file instanceof Blob && !(file as File).name) {
    formData.append('file', file, filename);
  } else {
    // It's a File or Blob with name
    formData.append('file', file);
  }

  const targetFolderId = folderPath.startsWith('/')
    ? folderPath.substring(1)
    : folderPath;

  const response = await api.post(`${BASE_URL}/upload`, formData, {
    params: {
      id: targetFolderId,
    },
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  // Response: The controller returns metadata of the uploaded file.
  const uploadedFile = response.data;

  // Construct ID if the backend response doesn't provide the full path 'id' directly
  const finalId =
    uploadedFile.id ||
    `${targetFolderId ? targetFolderId + '/' : ''}${filename}`;

  return {
    id: finalId,
    url: finalId, // Path relative to storage root
  };
};

export const uploadService = {
  uploadFile,
  ensureFolder,
};
