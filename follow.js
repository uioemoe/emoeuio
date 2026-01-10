import { supabaseClient } from './supabase.js';
import { auth } from './auth.js';

class FollowManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupRealtime();
    }

    setupRealtime() {
        // Subscribe to followers updates
        const followersSubscription = supabaseClient
            .channel('followers-channel')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'followers' },
                (payload) => {
                    console.log('Followers change:', payload);
                    // Update followers count in real-time
                    if (payload.eventType === 'INSERT') {
                        // Update followers count for the user being followed
                        this.updateFollowersCount(payload.new.following_id, 1);
                    } else if (payload.eventType === 'DELETE') {
                        // Update followers count for the user being unfollowed
                        this.updateFollowersCount(payload.old.following_id, -1);
                    }
                }
            )
            .subscribe();
    }

    async updateFollowersCount(userId, change) {
        try {
            // Get current followers count
            const { data: user, error } = await supabaseClient
                .from('users')
                .select('followers_count')
                .eq('id', userId)
                .single();

            if (error) throw error;

            // Update followers count
            const newCount = Math.max(0, (user.followers_count || 0) + change);
            
            const { error: updateError } = await supabaseClient
                .from('users')
                .update({ followers_count: newCount })
                .eq('id', userId);

            if (updateError) throw updateError;

            // Update UI if on profile page
            const profileUserId = new URLSearchParams(window.location.search).get('id') || 
                                 auth.getCurrentUser()?.id;
            
            if (profileUserId === userId) {
                const followersCountEl = document.getElementById('followers-count');
                if (followersCountEl) {
                    followersCountEl.textContent = newCount;
                }
            }

        } catch (error) {
            console.error('Error updating followers count:', error);
        }
    }

    async followUser(userId) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return { error: 'Not authenticated' };

        if (currentUser.id === userId) {
            return { error: 'Cannot follow yourself' };
        }

        try {
            const { error } = await supabaseClient
                .from('followers')
                .insert([{
                    follower_id: currentUser.id,
                    following_id: userId
                }]);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Error following user:', error);
            return { error: error.message };
        }
    }

    async unfollowUser(userId) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return { error: 'Not authenticated' };

        try {
            const { error } = await supabaseClient
                .from('followers')
                .delete()
                .eq('follower_id', currentUser.id)
                .eq('following_id', userId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Error unfollowing user:', error);
            return { error: error.message };
        }
    }

    async getFollowers(userId) {
        try {
            const { data, error } = await supabaseClient
                .from('followers')
                .select(`
                    follower:users!followers_follower_id_fkey(id, username, profile_picture, display_name)
                `)
                .eq('following_id', userId);

            if (error) throw error;

            return { data: data.map(item => item.follower), error: null };
        } catch (error) {
            console.error('Error getting followers:', error);
            return { data: null, error };
        }
    }

    async getFollowing(userId) {
        try {
            const { data, error } = await supabaseClient
                .from('followers')
                .select(`
                    following:users!followers_following_id_fkey(id, username, profile_picture, display_name)
                `)
                .eq('follower_id', userId);

            if (error) throw error;

            return { data: data.map(item => item.following), error: null };
        } catch (error) {
            console.error('Error getting following:', error);
            return { data: null, error };
        }
    }

    async isFollowing(followerId, followingId) {
        try {
            const { data, error } = await supabaseClient
                .from('followers')
                .select('id')
                .eq('follower_id', followerId)
                .eq('following_id', followingId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            
            return { isFollowing: !!data, error: null };
        } catch (error) {
            console.error('Error checking follow status:', error);
            return { isFollowing: false, error };
        }
    }
}

// Initialize follow manager
const followManager = new FollowManager();
export { followManager };