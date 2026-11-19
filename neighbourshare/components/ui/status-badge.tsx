import type { ComponentType, SVGProps } from "react";
import type { RequestStatus } from "@/lib/domain";
import {
  BanIcon,
  CheckCircleIcon,
  ClockIcon,
  FlagIcon,
  XCircleIcon,
} from "./icons";

// Every status has a text label and an icon, so color is never the only signal.
const styles: Record<
  RequestStatus,
  {
    label: string;
    className: string;
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
  }
> = {
  pending: { label: "Pending", className: "text-warning", Icon: ClockIcon },
  approved: {
    label: "Approved",
    className: "text-primary",
    Icon: CheckCircleIcon,
  },
  rejected: { label: "Rejected", className: "text-error", Icon: XCircleIcon },
  cancelled: { label: "Cancelled", className: "text-muted", Icon: BanIcon },
  completed: { label: "Completed", className: "text-info", Icon: FlagIcon },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const { label, className, Icon } = styles[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-current bg-surface px-2.5 py-0.5 text-sm font-medium ${className}`}
    >
      <Icon className="shrink-0" />
      {label}
    </span>
  );
}
