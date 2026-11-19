import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@un-eosg/ui/components/data-table";
import { figureDisplayRows } from "@/lib/budget-time-series";
import type { BudgetResult } from "@/lib/programme-budget";

const number = new Intl.NumberFormat("en", { maximumSignificantDigits: 21 });

/** Keep source values readable when they cannot safely form a time chart. */
export function BudgetFigureTable({
  figure,
  label,
  reportedThrough,
}: {
  figure: BudgetResult["figures"][number];
  label: string;
  reportedThrough: number;
}) {
  return (
    <Table aria-label={`${label} data`}>
      <TableHeader>
        <TableRow>
          <TableHead>Series</TableHead>
          <TableHead>Category</TableHead>
          <TableHead numeric>Value</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {figureDisplayRows(figure, reportedThrough).map((point, index) => (
          <TableRow key={index}>
            <TableCell>{point.series || "—"}</TableCell>
            <TableCell>{point.category || "Unlabelled"}</TableCell>
            <TableCell numeric>
              {number.format(point.value)}
              {point.percent ? "%" : ""}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
