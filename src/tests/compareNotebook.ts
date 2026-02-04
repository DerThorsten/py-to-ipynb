import { describe, it, expect } from "vitest";

type Cell = {
  cell_type: string;
  source: string[] | string;
};

type Notebook = {
  cells: Cell[];
};

function normalizeSource(source: string[] | string): string {
  if (Array.isArray(source)) {
    return source.join("").trim();
  }
  return source.trim();
}

export function expectNotebooksToMatch(
  actual: Notebook,
  expected: Notebook
) {
  expect(actual.cells.length).toBe(expected.cells.length);

  actual.cells.forEach((cell, i) => {
    const exp = expected.cells[i];

    expect(cell.cell_type).toBe(exp.cell_type);
    expect(
      normalizeSource(cell.source)
    ).toBe(
      normalizeSource(exp.source)
    );
  });
}
