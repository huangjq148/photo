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

type DateTimePickerProps = Omit<
  PickerProps<Dayjs>,
  "value" | "defaultValue" | "onChange" | "generateConfig" | "locale" | "picker" | "format" | "showTime"
> & {
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function DateTimePicker({
  value,
  onChange,
  placeholder = "选择日期和时间",
  className,
  rootClassName,
  ...props
}: DateTimePickerProps) {
  const pickerValue = value ? dayjs(value) : null;

  return (
    <Picker
      {...props}
      value={pickerValue?.isValid() ? pickerValue : null}
      onChange={(date, dateString) => {
        const nextValue = Array.isArray(dateString) ? dateString[0] ?? "" : dateString;
        onChange(nextValue ? nextValue.replace(" ", "T") : "");
      }}
      generateConfig={dayjsGenerateConfig}
      locale={zhCN}
      picker="date"
      showTime={{ format: "HH:mm" }}
      format="YYYY-MM-DD HH:mm"
      placeholder={placeholder}
      inputReadOnly
      needConfirm={false}
      allowClear={false}
      showNow={false}
      className={clsx("photo-date-picker", className)}
      rootClassName={clsx("photo-date-picker-root", rootClassName)}
      classNames={{
        popup: {
          root: "photo-date-time-picker-popup",
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
