import { describe, it, expect } from "vitest";
import { pyToIpynb } from "../index";

describe("pyToIpynb", () => {
  it("creates a valid notebook skeleton", () => {
    const nb = pyToIpynb("");

    expect(nb.nbformat).toBe(4);
    expect(nb.nbformat_minor).toBe(5);
    expect(Array.isArray(nb.cells)).toBe(true);
  });

  it("creates a single code cell when no markers are present", () => {
    const nb = pyToIpynb("x = 1\nprint(x)");

    expect(nb.cells).toHaveLength(1);
    expect(nb.cells[0].cell_type).toBe("code");
    expect(nb.cells[0].source.join("")).toContain("print(x)");
  });

  it("splits cells on # %% markers", () => {
    const nb = pyToIpynb(`
# %%
x = 1
# %%
y = 2
`.trim());

    expect(nb.cells).toHaveLength(2);
    expect(nb.cells[0].source.join("")).toContain("x = 1");
    expect(nb.cells[1].source.join("")).toContain("y = 2");
  });

  it("detects markdown-only cells", () => {
    const nb = pyToIpynb(`
# %%
# This is markdown
# More text
`.trim());

    const cell = nb.cells[0];
    expect(cell.cell_type).toBe("markdown");
    expect(cell.source.join("")).toContain("This is markdown");
  });

  it("keeps mixed content as code", () => {
    const nb = pyToIpynb(`
# %%
# This is a comment
x = 42
`.trim());

    const cell = nb.cells[0];
    expect(cell.cell_type).toBe("code");
    expect(cell.source.join("")).toContain("x = 42");
  });

  it("produces executable code cells with no outputs", () => {
    const nb = pyToIpynb("print('hello')");

    const cell = nb.cells[0];
    expect(cell.cell_type).toBe("code");
    expect(cell.execution_count).toBeNull();
    expect(cell.outputs).toEqual([]);
  });






    



    

});