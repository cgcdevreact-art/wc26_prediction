// Deprecated old votes endpoint. Replaced by /api/matches/[id]/predict
export async function POST() {
  return new Response("Deprecated", { status: 410 });
}

export async function ensureTablesExist() {
  // Deprecated - all active tables are now managed by standard migrations and schemas
}
