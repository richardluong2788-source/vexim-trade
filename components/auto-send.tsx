"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Zap } from "lucide-react";
import { cx } from "@/components/ui";

const KEY = "vexim.autosend";

const Ctx = createContext<{ value: boolean; set: (v: boolean) => void }>({
  value: false,
  set: () => {},
});

export function useAutoSend() {
  return useContext(Ctx);
}

export function AutoSendProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState(false);

  useEffect(() => {
    try {
      setValue(localStorage.getItem(KEY) === "1");
    } catch {
      /* bỏ qua */
    }
  }, []);

  const set = useCallback((v: boolean) => {
    setValue(v);
    try {
      localStorage.setItem(KEY, v ? "1" : "0");
    } catch {
      /* bỏ qua */
    }
  }, []);

  const api = useMemo(() => ({ value, set }), [value, set]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function AutoSendToggle({ className }: { className?: string }) {
  const { value, set } = useAutoSend();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => set(!value)}
      title={
        value
          ? "Đang bật: chọn trạng thái là gửi email ngay, không hỏi lại"
          : "Đang tắt: hệ thống sẽ hỏi xác nhận người nhận trước khi gửi"
      }
      className={cx(
        "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition",
        value
          ? "border-brand-300 bg-brand-50 text-brand-800"
          : "border-ink-300 bg-white text-ink-600 hover:bg-ink-50",
        className,
      )}
    >
      <Zap className={cx("h-3.5 w-3.5", value ? "text-brand-600" : "text-ink-400")} />
      Gửi ngay, không hỏi lại
      <span
        className={cx(
          "relative h-4 w-7 shrink-0 rounded-full transition",
          value ? "bg-brand-600" : "bg-ink-300",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all",
            value ? "left-3.5" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
