"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { clsx } from "clsx";
import { X } from "lucide-react";
import styles from "./overview.module.css";

export default function PartnerDialog({ title, open, onClose, children, side = false }: { title: string; open: boolean; onClose: () => void; children: ReactNode; side?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { if (open && !ref.current?.open) ref.current?.showModal(); else if (!open && ref.current?.open) ref.current.close(); }, [open]);
  return <dialog ref={ref} className={clsx(styles.dialog, side && styles.drawer)} aria-labelledby={titleId} onCancel={onClose} onClose={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}><div className={styles.dialogBody}><div className={styles.dialogHeading}><h2 id={titleId}>{title}</h2><button type="button" aria-label="Đóng hộp thoại" onClick={onClose}><X size={20} /></button></div>{open && children}</div></dialog>;
}
