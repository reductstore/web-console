import { parseLocation } from "./ApiUrlParser";

describe("ApiUrlParser", () => {
  it("should use location for parsing", () => {
    const location = {
      pathname: "/ui/buckets",
      host: "reduct-storage.dev",
      protocol: "https",
    } as Location;
    const [apiUrl, uiUrl] = parseLocation(location, "/ui");

    expect(apiUrl).toEqual("https//reduct-storage.dev");
    expect(uiUrl).toEqual("/ui");
  });

  it("should use location for parsing (multi path)", () => {
    const location = {
      pathname: "/ui/buckets/some_bucket",
      host: "reduct-storage.dev",
      protocol: "https",
    } as Location;
    const [apiUrl, uiUrl] = parseLocation(location, "/ui");

    expect(apiUrl).toEqual("https//reduct-storage.dev");
    expect(uiUrl).toEqual("/ui");
  });

  it("should support prefix api", () => {
    const location = {
      pathname: "/server1/ui/buckets",
      host: "reduct-storage.dev",
      protocol: "https",
    } as Location;
    const [apiUrl, uiUrl] = parseLocation(location, "/ui");

    expect(apiUrl).toEqual("https//reduct-storage.dev/server1");
    expect(uiUrl).toEqual("/server1/ui");
  });
});
