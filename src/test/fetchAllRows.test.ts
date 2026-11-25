import { describe, expect, it, vi } from "vitest";
import { fetchAllRows } from "@/lib/fetchAllRows";

describe("fetchAllRows", () => {
  it("includes new active orders after 1,000 historical records", async () => {
    const orders = Array.from({ length: 1018 }, (_, id) => ({
      id, status: id < 1000 ? "closed" : "open",
    }));
    const page = vi.fn(async (from: number, to: number) => ({
      data: orders.slice(from, to + 1), error: null,
    }));
    const result = await fetchAllRows(page);
    expect(result.data).toHaveLength(1018);
    expect(result.data?.filter((o) => o.status === "open")).toHaveLength(18);
    expect(result.data?.at(-1)?.id).toBe(1017);
    expect(page.mock.calls).toEqual([[0, 499], [500, 999], [1000, 1499]]);
  });

  it("checks the next page when history ends at exactly 1,000 rows", async () => {
    const rows = Array.from({ length: 1000 }, (_, id) => id);
    const page = vi.fn(async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null }));
    expect((await fetchAllRows(page)).data).toEqual(rows);
    expect(page).toHaveBeenCalledTimes(3);
  });

  it("returns an empty list when there are no matching orders", async () => {
    expect(await fetchAllRows(async () => ({ data: [], error: null }))).toEqual({ data: [], error: null });
  });

  it("does not present incomplete history as a successful result", async () => {
    const error = { message: "Connection lost" };
    const result = await fetchAllRows(async (from) => from === 0
      ? { data: Array.from({ length: 500 }, (_, id) => id), error: null }
      : { data: null, error });
    expect(result).toEqual({ data: null, error });
  });
});