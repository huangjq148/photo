import { describe, expect, it, vi } from "vitest";
import { uploadFile } from "@/lib/client/upload-request";

type Listener = (...args: any[]) => void;

class MockUploadTarget {
  private listeners = new Map<string, Listener[]>();

  addEventListener(type: string, listener: Listener) {
    const current = this.listeners.get(type) ?? [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  emit(type: string, event: any) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

class MockXMLHttpRequest {
  static instances: MockXMLHttpRequest[] = [];

  upload = new MockUploadTarget();
  onreadystatechange: Listener | null = null;
  onload: Listener | null = null;
  onerror: Listener | null = null;
  onabort: Listener | null = null;
  readyState = 0;
  status = 0;
  responseText = "";
  method = "";
  url = "";
  async = true;
  headers = new Map<string, string>();
  sendBody: FormData | null = null;
  aborted = false;
  private listeners = new Map<string, Listener[]>();

  constructor() {
    MockXMLHttpRequest.instances.push(this);
  }

  addEventListener(type: string, listener: Listener) {
    const current = this.listeners.get(type) ?? [];
    current.push(listener);
    this.listeners.set(type, current);
  }

  open(method: string, url: string, async = true) {
    this.method = method;
    this.url = url;
    this.async = async;
  }

  setRequestHeader(name: string, value: string) {
    this.headers.set(name, value);
  }

  send(body: FormData) {
    this.sendBody = body;
  }

  abort() {
    this.aborted = true;
    this.onabort?.({});
    for (const listener of this.listeners.get("abort") ?? []) {
      listener({});
    }
  }

  emit(type: string, event: any = {}) {
    if (type === "load") {
      this.onload?.(event);
    } else if (type === "error") {
      this.onerror?.(event);
    } else if (type === "readystatechange") {
      this.onreadystatechange?.(event);
    } else if (type === "abort") {
      this.onabort?.(event);
    }

    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

describe("uploadFile", () => {
  it("reports upload progress, sends the file, and resolves parsed json", async () => {
    MockXMLHttpRequest.instances = [];
    const onProgress = vi.fn();
    const file = new File(["hello"], "hello.txt", { type: "text/plain" });
    const request = uploadFile({
      albumId: "album-1",
      file,
      onProgress,
      xhrFactory: () => new MockXMLHttpRequest() as unknown as XMLHttpRequest,
    });

    const xhr = MockXMLHttpRequest.instances[0]!;
    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe("/api/albums/album-1/photos/upload");
    expect(xhr.sendBody).toBeInstanceOf(FormData);
    expect(xhr.sendBody?.get("file")).toBe(file);

    xhr.upload.emit("progress", { loaded: 25, total: 100 });
    expect(onProgress).toHaveBeenCalledWith({ loaded: 25, total: 100 });

    xhr.status = 201;
    xhr.responseText = JSON.stringify({ data: { id: "media-1", ok: true } });
    xhr.emit("load");

    await expect(request).resolves.toEqual({
      kind: "success",
      data: { data: { id: "media-1", ok: true } },
      status: 201,
    });
  });

  it("returns a business error for non-2xx responses", async () => {
    MockXMLHttpRequest.instances = [];
    const request = uploadFile({
      albumId: "album-1",
      file: new File(["hello"], "hello.txt", { type: "text/plain" }),
      xhrFactory: () => new MockXMLHttpRequest() as unknown as XMLHttpRequest,
    });

    const xhr = MockXMLHttpRequest.instances[0]!;
    xhr.status = 403;
    xhr.responseText = JSON.stringify({ error: "没有权限", code: "FORBIDDEN" });
    xhr.emit("load");

    await expect(request).resolves.toEqual({
      kind: "business-error",
      status: 403,
      error: "没有权限",
      code: "FORBIDDEN",
    });
  });

  it("maps abort to a cancelled result", async () => {
    MockXMLHttpRequest.instances = [];
    const controller = new AbortController();
    const request = uploadFile({
      albumId: "album-1",
      file: new File(["hello"], "hello.txt", { type: "text/plain" }),
      signal: controller.signal,
      xhrFactory: () => new MockXMLHttpRequest() as unknown as XMLHttpRequest,
    });

    const xhr = MockXMLHttpRequest.instances[0]!;
    controller.abort();
    expect(xhr.aborted).toBe(true);

    await expect(request).resolves.toEqual({ kind: "cancelled" });
  });
});
