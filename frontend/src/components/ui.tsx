import { useRef, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

export function Feedback({ children, tone = 'error' }: { children: ReactNode; tone?: 'error' | 'success' }) {
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`feedback feedback-${tone}`}>{children}</div>;
}

export function LoadingState({ label }: { label: string }) {
  return <div role="status" className="empty-state flex flex-col items-center gap-3"><span aria-hidden="true" className="h-6 w-6 animate-spin rounded-full border-2 border-[#23634e] border-t-transparent" /><p className="text-sm text-[#53665e]">{label}</p></div>;
}

export function Modal({ open, onOpenChange, title, description, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode }) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="modal-overlay" /><Dialog.Content className="modal-content" onOpenAutoFocus={() => { returnFocus.current = document.activeElement as HTMLElement; }} onCloseAutoFocus={event => { event.preventDefault(); if (returnFocus.current?.isConnected) returnFocus.current.focus(); }}>
    <Dialog.Title className="pr-10 text-lg font-bold">{title}</Dialog.Title>
    <Dialog.Description className={description ? 'mt-2 text-sm leading-6 text-[#53665e]' : 'sr-only'}>{description || title}</Dialog.Description>
    <Dialog.Close className="btn-ghost absolute right-2 top-2 w-11 px-0" aria-label="Close dialog">✕</Dialog.Close>
    <div className="mt-5">{children}</div>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}
