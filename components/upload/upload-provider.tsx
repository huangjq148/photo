"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { GlobalUploadDialog, type UploadAlbum } from "@/components/upload/global-upload-dialog";

type UploadLaunchOptions = {
  albumId?: string;
};

type UploadContextValue = {
  openUpload: (options?: UploadLaunchOptions) => void;
};

const UploadContext = createContext<UploadContextValue | null>(null);

async function fetchUploadAlbums(): Promise<UploadAlbum[]> {
  const response = await fetch("/api/albums");
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error ?? "加载可上传相册失败");
  }

  const albums = Array.isArray(json.data) ? (json.data as UploadAlbum[]) : [];
  return albums.filter((album) => album.canUpload);
}

export function UploadProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [requestedAlbumId, setRequestedAlbumId] = useState<string | null>(null);
  const [albums, setAlbums] = useState<UploadAlbum[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [createAlbumName, setCreateAlbumName] = useState("");
  const [createAlbumDescription, setCreateAlbumDescription] = useState("");
  const [creatingAlbum, setCreatingAlbum] = useState(false);

  function openUpload(options?: UploadLaunchOptions) {
    setRequestedAlbumId(options?.albumId ?? null);
    setOpen(true);
  }

  function closeUpload() {
    setOpen(false);
    setRequestedAlbumId(null);
    setSearch("");
    setSelectedAlbumId(null);
    setLoadError(null);
    setShowCreateAlbum(false);
    setCreateAlbumName("");
    setCreateAlbumDescription("");
  }

  async function refreshAlbums(preferredAlbumId: string | null = requestedAlbumId) {
    setLoadingAlbums(true);
    setLoadError(null);

    try {
      const nextAlbums = await fetchUploadAlbums();
      setAlbums(nextAlbums);
      setSelectedAlbumId(selectInitialUploadAlbum(nextAlbums, preferredAlbumId));
    } catch (error) {
      setAlbums([]);
      setSelectedAlbumId(null);
      setLoadError(error instanceof Error ? error.message : "加载可上传相册失败");
    } finally {
      setLoadingAlbums(false);
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    void refreshAlbums(requestedAlbumId);
  }, [open, requestedAlbumId]);

  async function handleCreateAlbum() {
    if (!createAlbumName.trim()) {
      return;
    }

    setCreatingAlbum(true);
    try {
      const response = await fetch("/api/albums", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: createAlbumName.trim(),
          description: createAlbumDescription.trim() || undefined,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "创建相册失败");
      }

      setShowCreateAlbum(false);
      setCreateAlbumName("");
      setCreateAlbumDescription("");
      await refreshAlbums(json.data.id as string);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "创建相册失败");
    } finally {
      setCreatingAlbum(false);
    }
  }

  const value: UploadContextValue = {
    openUpload,
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
      <GlobalUploadDialog
        open={open}
        albums={albums}
        loadingAlbums={loadingAlbums}
        loadError={loadError}
        search={search}
        selectedAlbumId={selectedAlbumId}
        showCreateAlbum={showCreateAlbum}
        createAlbumName={createAlbumName}
        createAlbumDescription={createAlbumDescription}
        creatingAlbum={creatingAlbum}
        onClose={closeUpload}
        onSearchChange={setSearch}
        onSelectAlbum={setSelectedAlbumId}
        onOpenCreateAlbum={() => setShowCreateAlbum(true)}
        onCreateAlbumClose={() => setShowCreateAlbum(false)}
        onCreateAlbumNameChange={setCreateAlbumName}
        onCreateAlbumDescriptionChange={setCreateAlbumDescription}
        onCreateAlbum={handleCreateAlbum}
      />
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within UploadProvider");
  }

  return context;
}

export function selectInitialUploadAlbum(albums: UploadAlbum[], requestedAlbumId: string | null) {
  const selectableAlbums = albums.filter((album) => album.canUpload);
  if (selectableAlbums.length === 0) {
    return null;
  }

  if (requestedAlbumId) {
    const requested = selectableAlbums.find((album) => album.id === requestedAlbumId);
    if (requested) {
      return requested.id;
    }
  }

  const defaultAlbum = selectableAlbums.find((album) => album.isDefault);
  return defaultAlbum?.id ?? selectableAlbums[0]?.id ?? null;
}
