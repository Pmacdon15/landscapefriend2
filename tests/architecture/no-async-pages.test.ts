import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  findAsyncPages,
  findPageFiles,
  hasAsyncDefaultExport,
} from "./async-pages";

const root = fileURLToPath(new URL("../..", import.meta.url));
const appDir = fileURLToPath(new URL("../../src/app", import.meta.url));

// Pages stay synchronous: they start their data promises and hand them to
// components inside <Suspense>, so the page shell streams immediately
// instead of waiting on the slowest query. Await inside the component that
// uses the data (or with `use()` in a client component), not in the page.
describe("app pages", () => {
  it("finds the app's pages", () => {
    expect(findPageFiles(appDir).length).toBeGreaterThan(0);
  });

  it("are not async", () => {
    expect(findAsyncPages(appDir, root)).toEqual([]);
  });
});

describe("hasAsyncDefaultExport", () => {
  it.each([
    ["inline async function", "export default async function Page() {}"],
    ["anonymous async function", "export default async function () {}"],
    ["async arrow", "export default async () => <div />;"],
    [
      "async function exported by name",
      "async function Page() {}\nexport default Page;",
    ],
    [
      "async arrow exported by name",
      "const Page = async (props: Props) => null;\nexport default Page;",
    ],
    [
      "typed async arrow exported by name",
      "const Page: FC = async () => null;\nexport default Page",
    ],
    [
      "async function in an export list",
      "async function Page() {}\nexport { Page as default };",
    ],
  ])("flags an %s", (_, source) => {
    expect(hasAsyncDefaultExport(source)).toBe(true);
  });

  it.each([
    ["sync function", "export default function Page() {}"],
    [
      "sync page with async callbacks inside",
      "export default function Page() {\n  const p = load().then(async (x) => x);\n  return null;\n}",
    ],
    [
      "sync function exported by name next to an async helper",
      "async function load() {}\nfunction Page() {}\nexport default Page;",
    ],
    [
      "async mention in a comment",
      "// export default async function\nexport default function Page() {}",
    ],
    [
      "async mention in a string",
      'const s = "export default async";\nexport default function Page() {}',
    ],
  ])("allows a %s", (_, source) => {
    expect(hasAsyncDefaultExport(source)).toBe(false);
  });
});
