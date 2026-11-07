import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import { SPECIES, spriteUrl, type Element, typeLabel } from "./data";
import { maxHp, type Creature } from "./engine";

export type IconName =
  | "compass"
  | "bag"
  | "book"
  | "close"
  | "arrow"
  | "home"
  | "spark"
  | "heart"
  | "flag"
  | "settings"
  | "foot"
  | "check"
  | "leaf"
  | "water"
  | "fire"
  | "rock"
  | "shield"
  | "moon";
const paths: Record<IconName, ReactNode> = {
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m16 8-2 6-6 2 2-6 6-2Z" />
    </>
  ),
  bag: (
    <>
      <path d="M8 7V5a4 4 0 0 1 8 0v2M5 9a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v11H5V9Z" />
      <path d="M8 14h8v6H8zM8 10h8" />
    </>
  ),
  book: (
    <>
      <path d="M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1ZM12 5v16" />
      <path d="M6 8h2M16 8h2M6 12h2M16 12h2" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  home: (
    <>
      <path d="m2 11 10-8 10 8M5 9v12h14V9" />
      <path d="M9 21v-7h6v7" />
    </>
  ),
  spark: <path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z" />,
  heart: (
    <path d="M20 4a5 5 0 0 0-8 2 5 5 0 0 0-8-2c-6 6 8 17 8 17S26 10 20 4Z" />
  ),
  flag: (
    <>
      <path d="M5 22V3M5 3c5-4 9 4 15 0v11c-6 4-10-4-15 0" />
    </>
  ),
  settings: (
    <>
      <path d="m9 3 1-2h4l1 2 3 2 3 1v4l-2 2 2 2v4l-3 1-3 2-1 2h-4l-1-2-3-2-3-1v-4l2-2-2-2V6l3-1 3-2Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  foot: (
    <>
      <ellipse cx="8" cy="8" rx="3" ry="6" transform="rotate(22 8 8)" />
      <path d="m4 16 4 2M16 10c-4 0-5 11-1 11s6-11 1-11ZM16 5l4 1" />
    </>
  ),
  check: <path d="m4 12 5 5L20 6" />,
  leaf: (
    <>
      <path d="M21 3C8 0-2 14 7 19S24 14 21 3ZM4 22 17 8" />
    </>
  ),
  water: (
    <path d="M12 2S4 11 4 15a8 8 0 0 0 16 0c0-4-8-13-8-13ZM8 15c0 3 2 4 4 4" />
  ),
  fire: (
    <path d="M12 2c2 7 6 5 6 10 2-1 2-3 2-3 5 14-20 18-16 3 1-3 4-4 4-7 2 2 2 4 2 4s3-4 2-7Z" />
  ),
  rock: (
    <path d="m7 3 10 1 5 9-6 8H5L2 11l5-8ZM7 3l5 10 5-9M2 11l10 2 4 8M12 13l10 0" />
  ),
  shield: (
    <>
      <path d="M12 2 3 6v6c0 6 9 10 9 10s9-4 9-10V6L12 2Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  moon: <path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z" />,
};
export function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
export function Item({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  return (
    <img
      className={`item-sprite ${className}`}
      src={`/game/items/${name}.png`}
      alt=""
      width="30"
      height="30"
      draggable="false"
    />
  );
}
export function Sprite({
  id,
  back = false,
  className = "",
  decorative = false,
  style,
}: {
  id: number;
  back?: boolean;
  className?: string;
  decorative?: boolean;
  style?: CSSProperties;
}) {
  const [fallback, setFallback] = useState(false);
  return (
    <img
      key={`${id}-${back}`}
      className={`pokemon-sprite ${className}`}
      style={style}
      src={spriteUrl(id, fallback ? false : back)}
      width="96"
      height="96"
      alt={decorative ? "" : SPECIES[id]?.name || "宝可梦"}
      draggable="false"
      onError={() => {
        if (back && !fallback) setFallback(true);
      }}
    />
  );
}
export function ActionButton({
  icon,
  children,
  primary = false,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      className={`action-button ${primary ? "primary" : ""} ${className}`}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
export function TypeTag({ type }: { type: Element }) {
  const icon: IconName =
    type === "electric"
      ? "spark"
      : type === "fire"
        ? "fire"
        : type === "water"
          ? "water"
          : type === "rock"
            ? "rock"
            : type === "grass" || type === "bug"
              ? "leaf"
              : "shield";
  return (
    <span className={`type-tag type-${type}`}>
      <Icon name={icon} />
      {typeLabel(type)}
    </span>
  );
}
export function Health({
  creature,
  compact = false,
}: {
  creature: Creature;
  compact?: boolean;
}) {
  const total = maxHp(creature),
    ratio = Math.max(0, Math.min(1, creature.hp / total));
  return (
    <div
      className={`health ${ratio <= 0.25 ? "low" : ""} ${compact ? "compact" : ""}`}
    >
      <div
        className="health-track"
        role="progressbar"
        aria-label={`${SPECIES[creature.speciesId].name}体力`}
        aria-valuenow={creature.hp}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <span style={{ transform: `scaleX(${ratio})` }} />
      </div>
      {!compact && (
        <span className="health-numbers">
          {creature.hp}
          <small> / {total}</small>
        </span>
      )}
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
      queueMicrotask(() => {
        if (document.querySelector("dialog[open]")) return;
        const fallback = document.querySelector<HTMLElement>(
          ".adventure-dock button:nth-child(2), .battle-actions button:not(:disabled), .settings-trigger",
        );
        const target =
          opener?.isConnected &&
          opener !== document.body &&
          !opener.matches(":disabled")
            ? opener
            : fallback;
        target?.focus({ preventScroll: true });
      });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`game-dialog ${className}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="dialog-inner">
        <header className="dialog-header">
          <div>
            {subtitle && <p className="eyebrow">{subtitle}</p>}
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="关闭窗口"
          >
            <Icon name="close" />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
