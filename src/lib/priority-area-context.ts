import report from "../../data/priority-area-introductions-2025.json";

export const priorityAreaReport = report;

export function priorityAreaIntroduction(priority: string) {
  return report.areas.find((area) => area.priority === priority);
}
