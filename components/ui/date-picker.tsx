"use client";

import React from "react";
import clsx from "clsx";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/zh-cn";
import Picker from "@rc-component/picker";
import type { PickerProps } from "@rc-component/picker";
import dayjsGenerateConfig from "@rc-component/picker/generate/dayjs";
import zhCN from "@rc-component/picker/locale/zh_CN";

dayjs.locale("zh-cn");

type DatePickerProps = Omit<
  PickerProps<Dayjs>,
  "value" | "defaultValue" | "onChange" | "generateConfig" | "locale" | "picker" | "format"
> & {
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function DatePicker({
  value,
  onChange,
  placeholder = "选择日期",
  className,
  rootClassName,
  ...props
}: DatePickerProps) {
  const pickerValue = value ? dayjs(value, "YYYY-MM-DD", true) : null;

  return (
    <Picker
      {...props}
      value={pickerValue?.isValid() ? pickerValue : null}
      onChange={(date, dateString) => {
        const nextValue = Array.isArray(dateString) ? dateString[0] ?? "" : dateString;
        onChange(nextValue);
      }}
      generateConfig={dayjsGenerateConfig}
      locale={zhCN}
      picker="date"
      format="YYYY-MM-DD"
      placeholder={placeholder}
      inputReadOnly
      allowClear={false}
      showNow={false}
      className={clsx("photo-date-picker", className)}
      rootClassName={clsx("photo-date-picker-root", rootClassName)}
      classNames={{
        popup: {
          root: "photo-date-picker-popup",
        },
      }}
      styles={{
        popup: {
          root: {
            zIndex: 1200,
            width: "fit-content",
            minWidth: "360px",
            maxWidth: "calc(100vw - 2rem)",
          },
        },
      }}
    />
  );
}
