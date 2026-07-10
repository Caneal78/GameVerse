import { describe, expect, it } from "vitest";
import { toGvfileUrl } from "./gvfileUrl.js";

describe("toGvfileUrl", () => {
  it("returns null for empty paths", () => {
    expect(toGvfileUrl(null)).toBeNull();
    expect(toGvfileUrl("")).toBeNull();
  });

  it("converts Windows drive paths", () => {
    const url = toGvfileUrl("C:\\vault\\Assets\\hero.glb");
    expect(url).toBe("gvfile:///C:/vault/Assets/hero.glb");
  });

  it("converts posix paths", () => {
    const url = toGvfileUrl("/tmp/project/image.png");
    expect(url).toBe("gvfile:///tmp/project/image.png");
  });
});
