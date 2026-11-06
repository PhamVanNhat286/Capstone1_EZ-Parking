"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Car, Check, Clock3, LoaderCircle, LockKeyhole } from "lucide-react";
import { clsx } from "clsx";
import styles from "./partner.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "small" | "medium" | "large";
  loading?: boolean;
  demoState?: "hover" | "pressed";
};

export function PartnerButton({ children, variant = "primary", size = "medium", loading, demoState, className, disabled, ...props }: ButtonProps) {
  return <button {...props} type={props.type ?? "button"} data-variant={variant} disabled={disabled || loading} aria-busy={loading || undefined}
    className={clsx(styles.button, styles[variant], styles[size], demoState && styles[demoState], className)}>
    {loading && <LoaderCircle size={16} className={styles.spin} aria-hidden="true" />}{children}
  </button>;
}

export type PartnerTone = "success" | "warning" | "danger" | "info" | "neutral";
export function PartnerBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: PartnerTone }) {
  return <span className={clsx(styles.badge, styles[tone])}><span className={styles.dot} />{children}</span>;
}

export type SlotState = "available" | "holding" | "occupied" | "locked";
const slotLabels: Record<SlotState, string> = { available: "Trống", holding: "Đang giữ chỗ", occupied: "Đang đỗ", locked: "Khóa / Bảo trì" };
export function PartnerSlot({ code, state, selected = false, onClick, inspectable = false, className, iconSize = 16 }: { code: string; state: SlotState; selected?: boolean; onClick?: () => void; inspectable?: boolean; className?: string; iconSize?: number }) {
  const StateIcon = selected ? Check : state === "available" ? Check : state === "holding" ? Clock3 : state === "occupied" ? Car : LockKeyhole;
  return <button type="button" className={clsx(styles.slot, styles[state], selected && styles.selected, className)}
    disabled={state !== "available" && !inspectable} aria-label={`Ô ${code}: ${slotLabels[state]}`} aria-pressed={selected} onClick={onClick}>
    <span>{code}</span><StateIcon size={iconSize} aria-hidden="true" />
  </button>;
}

export function PartnerKpi({ label, value, unit, tone, icon, footnote }: { label: string; value: string; unit: string; tone: PartnerTone; icon: ReactNode; footnote: ReactNode }) {
  return <article className={styles.kpi}>
    <div className={styles.kpiTop}><span>{label}</span><span className={clsx(styles.kpiIcon, styles[tone])}>{icon}</span></div>
    <div className={styles.kpiValue}><strong className={styles[`${tone}Text`]}>{value}</strong><span>{unit}</span></div>
    <div className={styles.kpiFoot}>{footnote}</div>
  </article>;
}
