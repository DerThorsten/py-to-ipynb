import { describe, it, expect } from "vitest";
import { pyToIpynb } from "../index";
import fs from "fs";
import path from "path";
import { expectNotebooksToMatch } from "./compareNotebook";

const fixturesDir = path.join(__dirname, "testfiles");

function readTestFile(name: string) {
  return fs.readFileSync(
    path.join(fixturesDir, name),
    "utf8"
  );
}



describe("basic conversion", () => {

  for (const file of fs.readdirSync(fixturesDir)) {
    if (!file.endsWith(".py")) continue;

    let ipynb_filename = file.replace(/\.py$/, ".ipynb");

    // expect file to exist
    expect(
      fs.existsSync(path.join(fixturesDir, ipynb_filename))
    ).toBe(true);


    // read 
    const actual = pyToIpynb(
      readTestFile(file)
    );


    const expected = JSON.parse(
      readTestFile(ipynb_filename)
    );

    it(`converts ${file} correctly`, () => {  

      expectNotebooksToMatch(actual, expected);
    });


  

  }
});

