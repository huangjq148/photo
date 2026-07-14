export type UploadProgress = {
  loaded: number;
  total: number;
};

export type UploadRequestSuccess<T = unknown> = {
  kind: "success";
  status: number;
  data: T;
};

export type UploadRequestBusinessError = {
  kind: "business-error";
  status: number;
  code: string;
  error: string;
  issues?: Array<{
    path: string;
    message: string;
  }>;
};

export type UploadRequestCancelled = {
  kind: "cancelled";
};

export type UploadRequestResult<T = unknown> =
  | UploadRequestSuccess<T>
  | UploadRequestBusinessError
  | UploadRequestCancelled;

export type UploadRequestOptions = {
  albumId: string;
  file: File;
  signal?: AbortSignal;
  onProgress?: (progress: UploadProgress) => void;
  xhrFactory?: () => XMLHttpRequest;
};

function safeJsonParse(text: string): unknown {
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function parseBusinessError(status: number, responseText: string): UploadRequestBusinessError {
  const parsed = safeJsonParse(responseText);
  const body = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};

  return {
    kind: "business-error",
    status,
    code: typeof body.code === "string" ? body.code : "UPLOAD_FAILED",
    error: typeof body.error === "string" ? body.error : "上传失败",
    issues: Array.isArray(body.issues)
      ? body.issues
          .map((issue) => {
            if (typeof issue !== "object" || issue === null) {
              return null;
            }

            const path = "path" in issue ? String((issue as { path?: unknown }).path ?? "") : "";
            const message =
              "message" in issue ? String((issue as { message?: unknown }).message ?? "") : "";

            if (!path || !message) {
              return null;
            }

            return { path, message };
          })
          .filter((issue): issue is NonNullable<typeof issue> => issue !== null)
      : undefined,
  };
}

export function uploadFile({
  albumId,
  file,
  signal,
  onProgress,
  xhrFactory = () => new XMLHttpRequest(),
}: UploadRequestOptions): Promise<UploadRequestResult> {
  return new Promise((resolve) => {
    const xhr = xhrFactory();
    let settled = false;

    const cleanup = () => {
      signal?.removeEventListener("abort", handleSignalAbort);
    };

    const finish = (result: UploadRequestResult) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(result);
    };

    const finishCancelled = () => {
      finish({ kind: "cancelled" });
    };

    const handleSignalAbort = () => {
      try {
        xhr.abort();
      } catch {
        finishCancelled();
      }
    };

    xhr.upload.addEventListener("progress", (event) => {
      const loaded = Number((event as ProgressEvent).loaded ?? 0);
      const total = Number((event as ProgressEvent).total ?? 0);
      onProgress?.({ loaded, total });
    });

    xhr.addEventListener("load", () => {
      const status = xhr.status;
      if (status >= 200 && status < 300) {
        const parsed = safeJsonParse(xhr.responseText);
        finish({
          kind: "success",
          status,
          data: parsed as unknown,
        });
        return;
      }

      finish(parseBusinessError(status, xhr.responseText));
    });

    xhr.addEventListener("error", () => {
      finish({
        kind: "business-error",
        status: xhr.status || 0,
        code: "NETWORK_ERROR",
        error: "网络请求失败",
      });
    });

    xhr.addEventListener("abort", finishCancelled);

    if (signal?.aborted) {
      finishCancelled();
      return;
    }

    signal?.addEventListener("abort", handleSignalAbort);

    xhr.open("POST", `/api/albums/${albumId}/photos/upload`, true);

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  });
}
