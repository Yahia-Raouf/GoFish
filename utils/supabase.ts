import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, RealtimeChannel } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ============================================================================
// 🛠️ GENERIC DATABASE HELPERS
// These functions know NOTHING about Go Fish. They just move data.
// ============================================================================

/**
 * Inserts a row into a table.
 * @param table The table name (e.g., 'rooms')
 * @param data The object to insert (e.g., { code: 'ABCD' })
 */
export const dbInsert = async (table: string, data: any) => {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, data: result };
  } catch (error: any) {
    console.error(`Error inserting into ${table}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Updates a row where a column matches a value.
 * @param table The table name
 * @param updates The object with new values
 * @param matchColumn The column to find (e.g., 'id' or 'code')
 * @param matchValue The value to match
 */
export const dbUpdate = async (table: string, updates: any, matchColumn: string, matchValue: any) => {
  try {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq(matchColumn, matchValue)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error(`Error updating ${table}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Fetches a single row.
 * @param table The table name
 * @param column The column to filter by
 * @param value The value to search for
 * Fetches a single row. 
 * Uses maybeSingle() to return null instead of throwing an error if not found.
 */
export const dbGet = async (table: string, column: string, value: any) => {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(column, value)
      .maybeSingle(); // <--- CHANGED: .single() -> .maybeSingle()

    if (error) throw error;
    
    // If data is null, it means "Not Found" (Success = true, Data = null)
    return { success: true, data }; 
  } catch (error: any) {
    console.error(`Error fetching from ${table}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Fetches multiple rows (e.g., all players in a room).
 */
export const dbGetList = async (table: string, column: string, value: any) => {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq(column, value);

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error(`Error fetching list from ${table}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Deletes a row from a table.
 * @param table The table name (e.g., 'players')
 * @param column The column to match (e.g., 'id')
 * @param value The value to match (e.g., the player's UUID)
 */
export const dbDelete = async (table: string, column: string, value: any) => {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq(column, value);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting from ${table}:`, error.message);
    return { success: false, error: error.message };
  }
};

// ============================================================================
// ⚡ REALTIME HELPERS
// ============================================================================

/**
 * Subscribes to changes on a specific row or table filter.
 * @param channelName Unique ID for the connection (e.g., 'room_ABCD')
 * @param table The table to watch
 * @param filter The filter string (e.g., 'room_code=eq.ABCD')
 * @param callback Function to run when data changes
 * @returns The subscription object (call .unsubscribe() on it later)
 */
export const dbSubscribe = (
  channelName: string,
  table: string,
  filter: string | null, // Allow null
  callback: (payload: any) => void
): RealtimeChannel => {
  
  // 1. Build the configuration object dynamically
  const channelConfig: any = { 
    event: '*', 
    schema: 'public', 
    table: table 
  };

  // 2. Only add 'filter' property if it actually exists
  if (filter) {
    channelConfig.filter = filter;
  }

  return supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      channelConfig, // Pass the clean config
      (payload) => callback(payload)
    )
    .subscribe();
};