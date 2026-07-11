import { Library, Image, HardDrive } from "lucide-react";

type HomeStatsProps = {
  albumCount: number;
  photoCount: number;
  storageUsed: string;
  storageLimit: string;
};

function formatStorage(bytes: string): string {
  const num = Number(bytes);
  if (!Number.isFinite(num) || num === 0) return "0 B";
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
  return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const iconClass = "h-5 w-5 text-[var(--film)]";

export function HomeStats({ albumCount, photoCount, storageUsed, storageLimit }: HomeStatsProps) {
  const stats = [
    {
      icon: <Library className={iconClass} />,
      label: "相册",
      value: albumCount,
    },
    {
      icon: <Image className={iconClass} />,
      label: "照片",
      value: photoCount,
    },
    {
      icon: <HardDrive className={iconClass} />,
      label: "已用空间",
      value: `${formatStorage(storageUsed)} / ${formatStorage(storageLimit)}`,
    },
  ];

  return (
    <section className="mx-auto max-w-5xl">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="noir-glass-panel flex flex-col items-center gap-3 rounded-2xl p-4 transition hover:border-[var(--border-strong)] sm:p-5"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full noir-glass-chip">
              {item.icon}
            </span>
            <p className="text-lg font-black text-[var(--text)] sm:text-2xl">
              {item.value}
            </p>
            <p className="text-xs text-[var(--muted)]">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
