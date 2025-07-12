import { createClient } from "@/lib/supabase/client";

export async function session(userId: string, roomId: string): Promise<any> {

    const supabase = createClient();

    const { data, error } = await supabase
        .from('session')
        .select('id')
        .eq('room_id', roomId)
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('Session not found or unauthorized:', error);
          return null;
        } else {
          console.error('Query error:', error);
          return null;
        }
      } else {
        console.log('Session exists:', data);
        return data;
      }
}

