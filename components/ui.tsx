import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "./icon";

export function SectionHeading({ icon, title, action, href, onAction }: { icon: string; title: string; action?: string; href?: string; onAction?: () => void }) {
  return (
    <div className="section-heading">
      <div className="section-heading-title"><span className="section-icon"><Icon name={icon} size={17} /></span><h2>{title}</h2></div>
      {action && href ? <Link className="text-action" href={href}>{action}<Icon name="arrowRight" size={15} /></Link> : action && onAction ? <button className="text-action" onClick={onAction}>{action}<Icon name="arrowRight" size={15} /></button> : null}
    </div>
  );
}

export function ProgressBar({ value, color = "#3178f6" }: { value: number; color?: string }) {
  return <div className="progress-track"><span style={{ width: `${value}%`, backgroundColor: color }} /></div>;
}

export function EmptyState({ icon = "sparkles", title, text, action }: { icon?: string; title: string; text: string; action?: ReactNode }) {
  return <div className="empty-state"><span className="empty-state-icon"><Icon name={icon} size={20} /></span><div><strong>{title}</strong><p>{text}</p>{action}</div></div>;
}
