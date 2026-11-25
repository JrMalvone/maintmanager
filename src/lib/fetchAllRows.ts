// Data API responses are capped at 1,000 rows. Callers must supply a stable
// ordering (including an ID tie-breaker) and rebuild the query for each page.
export async function fetchAllRows<T, E>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: E | null }>,
): Promise<{ data: T[] | null; error: E | null }> {
  const pageSize = 500;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) return { data: null, error };
    if (!data) return { data: null, error };
    rows.push(...data);
    if (data.length < pageSize) return { data: rows, error: null };
  }
}