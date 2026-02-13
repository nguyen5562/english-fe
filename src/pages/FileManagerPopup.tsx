import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Filemanager,
  Willow,
  type IApi,
  type IEntity,
} from '@svar-ui/react-filemanager';
import { RestDataProvider } from '@svar-ui/filemanager-data-provider';
import '@svar-ui/react-filemanager/all.css';
import { API_ROUTES, API_URL } from '../const/apiConfig';

function encodePathPreserveSlash(p: string) {
  return p
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

/**
 * SVAR expects IEntity.date to be Date | undefined.
 * Backend của bạn có thể trả seconds/ms/string => normalize hết về Date.
 */
function normalizeEntities(input: unknown): IEntity[] {
  if (!Array.isArray(input)) return [];

  return input.map((raw) => {
    const it = raw as IEntity & { date?: unknown };

    const d = it.date;
    let date: Date | undefined;

    if (d instanceof Date) {
      date = d;
    } else if (typeof d === 'number') {
      const ms = d < 1e12 ? d * 1000 : d; // seconds -> ms
      date = new Date(ms);
      if (Number.isNaN(date.getTime())) date = undefined;
    } else if (typeof d === 'string') {
      const dt = new Date(d);
      date = Number.isNaN(dt.getTime()) ? undefined : dt;
    }

    // đảm bảo date luôn là Date|undefined
    return { ...it, date };
  });
}

/**
 * loadInfo có thể trả:
 * - { stats: { used, total } } (theo backend bạn)
 * - hoặc { used, total } (tuỳ provider)
 * - hoặc array (một số impl)
 */
function parseDrive(info: unknown): { used: number; total: number } {
  if (info && typeof info === 'object') {
    // case { stats: {...} }
    if ('stats' in info) {
      const stats = (info as { stats?: unknown }).stats;
      if (stats && typeof stats === 'object') {
        const used = (stats as { used?: unknown }).used;
        const total = (stats as { total?: unknown }).total;
        return {
          used: typeof used === 'number' ? used : 0,
          total: typeof total === 'number' ? total : 0,
        };
      }
    }

    // case { used, total }
    const used = (info as { used?: unknown }).used;
    const total = (info as { total?: unknown }).total;
    return {
      used: typeof used === 'number' ? used : 0,
      total: typeof total === 'number' ? total : 0,
    };
  }

  // case array -> lấy phần tử đầu
  if (Array.isArray(info) && info.length > 0) return parseDrive(info[0]);

  return { used: 0, total: 0 };
}

export default function FileManagerPopup() {
  const API_BASE = API_URL + API_ROUTES.FILE_MANAGER;
  /* PUBLIC_BASE removed */

  const restProvider = useMemo(
    () => new RestDataProvider(API_BASE),
    [API_BASE],
  );

  const [data, setData] = useState<IEntity[]>([]);
  const [drive, setDrive] = useState<{ used: number; total: number }>({
    used: 0,
    total: 0,
  });

  const apiRef = useRef<IApi | null>(null);

  useEffect(() => {
    document.documentElement.style.height = '100%';
    document.body.style.height = '100%';
    document.body.style.margin = '0';

    Promise.all([
      restProvider.loadFiles('/') as Promise<unknown>,
      restProvider.loadInfo(undefined) as Promise<unknown>,
    ]).then(([files, info]) => {
      setData(normalizeEntities(files));
      setDrive(parseDrive(info));
    });
  }, [restProvider]);

  const sendToOpener = (id: string) => {
    // Chỉ gửi phần path (đã encode segment) để lưu vào DB
    const url = encodePathPreserveSlash(id);
    window.opener?.postMessage(
      { type: 'FM_PICK', url, id },
      window.location.origin,
    );
    window.close();
  };

  const onRequestData = useCallback(
    ({ id }: { id: string }) => {
      (restProvider.loadFiles(id) as Promise<unknown>).then((files) => {
        apiRef.current?.exec('provide-data', {
          id,
          data: normalizeEntities(files),
        });
      });
    },
    [restProvider],
  );

  const init = (api: IApi) => {
    apiRef.current = api;

    api.setNext(restProvider);

    api.on('open-file', ({ id }: { id: string }) => {
      sendToOpener(id);
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Willow>
        <div style={{ flex: 1, height: '100%', minHeight: 0 }}>
          <Filemanager
            init={init}
            data={data}
            drive={drive}
            onRequestData={onRequestData}
          />
        </div>
      </Willow>
    </div>
  );
}
