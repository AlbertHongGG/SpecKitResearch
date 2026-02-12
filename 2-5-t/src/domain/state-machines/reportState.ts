import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";

export type ReportStatus = "pending" | "accepted" | "rejected";

export type ResolveReportEffect = {
  status: "accepted" | "rejected";
  shouldHideTarget: boolean;
};

export function resolveReport(from: ReportStatus, to: "accepted" | "rejected"): ResolveReportEffect {
  if (from !== "pending") {
    throw new AppError(ErrorCodes.InvalidTransition, "Only pending reports can be resolved", {
      from,
      to,
    });
  }

  return {
    status: to,
    shouldHideTarget: to === "accepted",
  };
}
