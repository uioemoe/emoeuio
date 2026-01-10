import { supabaseClient } from './supabase.js';
import { auth } from './auth.js';

class LikeManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupRealtime();
    }

    setupRealtime() {
        // Subscribe to likes updates (already handled in feed.js)
        // This class can be extended for additional like-related functionality
    }

    async toggleLike(postId) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return { error: 'Not authenticated' };

        try {
            // Check if already liked
            const { data: existingLike, error: checkError } = await supabaseClient
                .from('likes')
                .select('id')
                .eq('post_id', postId)
                .eq('user_id', currentUser.id)
                .single();

            if (checkError && checkError.code !== 'PGRST116') throw checkError;

            if (existingLike) {
                // Unlike
                const { error: deleteError } = await supabaseClient
                    .from('likes')
                    .delete()
                    .eq('post_id', postId)
                    .eq('user_id', currentUser.id);

                if (deleteError) throw deleteError;

                return { liked: false };
            } else {
                // Like
                const { error: insertError } = await supabaseClient
                    .from('likes')
                    .insert([{
                        post_id: postId,
                        user_id: currentUser.id
                    }]);

                if (insertError) throw insertError;

                return { liked: true };
            }
        } catch (error) {
            console.error('Error toggling like:', error);
            return { error: error.message };
        }
    }

    async getLikesCount(postId) {
        try {
            const { count, error } = await supabaseClient
                .from('likes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', postId);

            if (error) throw error;

            return { count: count || 0, error: null };
        } catch (error) {
            console.error('Error getting likes count:', error);
            return { count: 0, error };
        }
    }

    async getLikedUsers(postId) {
        try {
            const { data, error } = await supabaseClient
                .from('likes')
                .select(`
                    user:users(id, username, profile_picture, display_name)
                `)
                .eq('post_id', postId);

            if (error) throw error;

            return { users: data.map(item => item.user), error: null };
        } catch (error) {
            console.error('Error getting liked users:', error);
            return { users: [], error };
        }
    }

    async hasLiked(postId, userId = null) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser && !userId) return { liked: false, error: 'Not authenticated' };

        const checkUserId = userId || currentUser.id;

        try {
            const { data, error } = await supabaseClient
                .from('likes')
                .select('id')
                .eq('post_id', postId)
                .eq('user_id', checkUserId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return { liked: !!data, error: null };
        } catch (error) {
            console.error('Error checking like status:', error);
            return { liked: false, error };
        }
    }
}

// Initialize like manager
const likeManager = new LikeManager();
export { likeManager };