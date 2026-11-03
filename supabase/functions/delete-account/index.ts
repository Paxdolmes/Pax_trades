// Deletes the caller's account, from Account in either app (Apple requires this of
// any app you can sign in to). forget_user removes their details and documents'
// records; then their documents and their login go. The login is soft-deleted, so
// finished jobs and payments keep pointing at it without saying who it was.
import { admin, caller, json, withCors } from './deps.ts';

Deno.serve(withCors(async (req) => {
  const user = await caller(req);
  if (!user) return json({ error: 'Please sign in' }, 401);
  const db = admin();

  const { data: docs, error } = await db.rpc('forget_user', { p_user: user.id });
  if (error) return json({ error: error.message }, 400);

  const paths = (docs ?? []) as string[];
  if (paths.length) {
    const removed = await db.storage.from('credential-docs').remove(paths);
    if (removed.error) console.error('Could not remove documents', removed.error.message);
  }

  const deleted = await db.auth.admin.deleteUser(user.id, true);
  if (deleted.error) return json({ error: deleted.error.message }, 500);
  return json({ deleted: true });
}));
