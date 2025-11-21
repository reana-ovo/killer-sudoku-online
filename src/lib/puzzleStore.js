import { supabase } from './supabaseClient';

/**
 * Fetches a random puzzle from the database.
 * @param {string} difficulty - The difficulty level (Easy, Medium, Hard, Expert).
 * @param {number} [excludeId] - Optional ID to exclude from the result (to avoid repeating the same puzzle).
 * @returns {Promise<{id: number, data: object} | null>} - The puzzle object or null if not found.
 */
export async function getRandomPuzzle(difficulty, excludeId) {
  if (!supabase) return null;

  try {
    // First, get the count of puzzles for this difficulty
    let query = supabase
      .from('puzzles')
      .select('id', { count: 'exact', head: true })
      .eq('difficulty', difficulty);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { count, error: countError } = await query;

    if (countError) {
      console.error('Error counting puzzles:', countError);
      return null;
    }

    if (count === 0) return null;

    // Generate a random offset
    const randomOffset = Math.floor(Math.random() * count);

    // Fetch the puzzle at the random offset
    let fetchQuery = supabase
      .from('puzzles')
      .select('id, data')
      .eq('difficulty', difficulty)
      .range(randomOffset, randomOffset)
      .limit(1);

    if (excludeId) {
        // Note: Using range with a filter like neq might be tricky if the excluded ID affects the offset logic.
        // A simpler approach for small datasets is to fetch a few random ones and pick one.
        // But for now, let's try the offset method. If excludeId is passed, we might miss it if it was in the range?
        // Actually, if we filter by neq('id', excludeId), the count reflects that.
        // So the offset should be valid within the filtered set.
        fetchQuery = fetchQuery.neq('id', excludeId);
    }

    const { data, error } = await fetchQuery;

    if (error) {
      console.error('Error fetching random puzzle:', error);
      return null;
    }

    if (data && data.length > 0) {
      return data[0];
    }

    return null;
  } catch (err) {
    console.error('Unexpected error in getRandomPuzzle:', err);
    return null;
  }
}

/**
 * Saves a new puzzle to the database.
 * @param {string} difficulty - The difficulty level.
 * @param {object} gameData - The full game state object.
 * @returns {Promise<number | null>} - The ID of the inserted puzzle or null on error.
 */
export async function savePuzzle(difficulty, gameData) {
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('puzzles')
      .insert([
        { difficulty, data: gameData }
      ])
      .select('id')
      .single();

    if (error) {
      console.error('Error saving puzzle:', error);
      return null;
    }

    return data ? data.id : null;
  } catch (err) {
    console.error('Unexpected error in savePuzzle:', err);
    return null;
  }
}
