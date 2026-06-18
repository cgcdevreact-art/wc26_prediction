const API_BASE = "https://api.football-data.org/v4";

export async function fetchFootballData<T>(endpoint: string, cache: RequestCache = "no-store"): Promise<T> {
  const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

  if (!API_KEY) {
    throw new Error("FOOTBALL_DATA_API_KEY is not set");
  }

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      "X-Auth-Token": API_KEY,
    },
    cache,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Football Data API Error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  return response.json() as Promise<T>;
}
