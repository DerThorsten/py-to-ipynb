import fs from "fs";
import path from "path";

export const fixturesDir = path.join(
  __dirname,
  "../testfiles"
);

export function readFixture(name: string) {
  return fs.readFileSync(
    path.join(fixturesDir, name),
    "utf8"
  );
}
