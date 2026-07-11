function parseDateValue(value: string | Date | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatChildAgeLabel(
  takenAt: string | Date | null | undefined,
  birthDate: string | Date | null | undefined
): string | null {
  const captured = parseDateValue(takenAt);
  const born = parseDateValue(birthDate);

  if (!captured || !born || captured.getTime() < born.getTime()) {
    return null;
  }

  let years = captured.getFullYear() - born.getFullYear();
  let months = captured.getMonth() - born.getMonth();
  let days = captured.getDate() - born.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(captured.getFullYear(), captured.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years > 0) {
    return months > 0 ? `${years}岁${months}个月` : `${years}岁`;
  }

  if (months > 0) {
    return `${months}个月`;
  }

  return `${days}天`;
}
