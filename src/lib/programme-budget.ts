import snapshot from "../../data/ppb-2027.json";

export type BudgetResult = {
  label: string;
  title: string;
  narrative: string;
  performanceYear?: number;
  measures: { label: string; year: number; type: string; value: string }[];
  figures: {
    label: string;
    title: string;
    subtitle: string;
    source?: string;
    series: {
      name: string;
      percent?: boolean;
      points: { category: string; value: number }[];
    }[];
  }[];
};

export type BudgetContent = {
  name: string;
  symbol: string;
  section: string;
  component?: string;
  source: string;
  objectives: string[];
  strategy: string[];
  performance: BudgetResult[];
  planned: BudgetResult[];
};

export type BudgetSubprogramme = {
  id: string;
  number: number;
  name: string;
  sections: BudgetContent[];
};

export type BudgetResultContext = {
  entity: { id: string; name: string; code: string | null };
  subprogramme?: { id: string; number: number; name: string };
};

export type BudgetEntity = {
  id: string;
  code: string | null;
  name: string;
  kind: string;
  priorities: string[];
  mainPriority: string | null;
  overview: BudgetContent[];
  subprogrammes: BudgetSubprogramme[];
};

export const budgetEdition = snapshot.edition;
export const budgetEntities: BudgetEntity[] = snapshot.entities;
export const budgetSections = snapshot.budgetSections;

const entitiesById = new Map(
  budgetEntities.map((entity) => [entity.id, entity]),
);

export function findBudgetEntity(id: string) {
  return entitiesById.get(id);
}
