import { supabaseClient } from './supabase.js';
import { auth } from './auth.js';

class Profile {
    constructor() {
        this.currentUserId = null;
        this.profileUserId = null;
        this.isOwnProfile = false;
        this.init();
    }

    async init() {
        // Get profile user ID from URL or use current user
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('id');
        
        const currentUser = auth.getCurrentUser();
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        this.currentUserId = currentUser.id;
        this.profileUserId = userId || currentUser.id;
        this.isOwnProfile = this.profileUserId === this.currentUserId;

        await this.loadProfile();
        await this.loadPosts();
        this.setupEventListeners();
    }

    async loadProfile() {
        try {
            const { data: profile, error } = await supabaseClient
                .from('users')
                .select('*')
                .eq('id', this.profileUserId)
                .single();

            if (error) throw error;

            this.renderProfile(profile);
            
            // Check if current user follows this profile
            if (!this.isOwnProfile) {
                await this.checkFollowStatus();
            }

        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    renderProfile(profile) {
        // Update profile header
        const profilePicture = document.getElementById('profile-picture');
        const profileUsername = document.getElementById('profile-username');
        const displayName = document.getElementById('display-name');
        const bio = document.getElementById('bio');
        const postsCount = document.getElementById('posts-count');
        const followersCount = document.getElementById('followers-count');
        const followingCount = document.getElementById('following-count');
        const followBtn = document.getElementById('follow-btn');
        const editProfileBtn = document.getElementById('edit-profile-btn');

        if (profilePicture) {
            profilePicture.src = profile.profile_picture || 'https://via.placeholder.com/150';
            profilePicture.alt = profile.username;
        }
        if (profileUsername) profileUsername.textContent = profile.username;
        if (displayName) displayName.textContent = profile.display_name || profile.username;
        if (bio) bio.textContent = profile.bio || 'No bio yet';
        if (postsCount) postsCount.textContent = profile.posts_count || 0;
        if (followersCount) followersCount.textContent = profile.followers_count || 0;
        if (followingCount) followingCount.textContent = profile.following_count || 0;

        // Show/hide buttons based on ownership
        if (this.isOwnProfile) {
            if (followBtn) followBtn.style.display = 'none';
            if (editProfileBtn) editProfileBtn.style.display = 'block';
        } else {
            if (followBtn) followBtn.style.display = 'block';
            if (editProfileBtn) editProfileBtn.style.display = 'none';
        }
    }

    async checkFollowStatus() {
        try {
            const { data, error } = await supabaseClient
                .from('followers')
                .select('id')
                .eq('follower_id', this.currentUserId)
                .eq('following_id', this.profileUserId)
                .single();

            const followBtn = document.getElementById('follow-btn');
            if (followBtn) {
                if (data) {
                    followBtn.textContent = 'Following';
                    followBtn.classList.add('following');
                } else {
                    followBtn.textContent = 'Follow';
                    followBtn.classList.remove('following');
                }
            }
        } catch (error) {
            // Not following
            const followBtn = document.getElementById('follow-btn');
            if (followBtn) {
                followBtn.textContent = 'Follow';
                followBtn.classList.remove('following');
            }
        }
    }

    async loadPosts() {
        try {
            const { data: posts, error } = await supabaseClient
                .from('posts')
                .select('*')
                .eq('user_id', this.profileUserId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.renderPosts(posts);
            
            // Show/hide no posts message
            const noPosts = document.getElementById('no-posts');
            const postsGrid = document.getElementById('posts-grid');
            
            if (posts.length === 0) {
                if (noPosts) noPosts.style.display = 'block';
                if (postsGrid) postsGrid.style.display = 'none';
            } else {
                if (noPosts) noPosts.style.display = 'none';
                if (postsGrid) postsGrid.style.display = 'grid';
            }

        } catch (error) {
            console.error('Error loading posts:', error);
        }
    }

    renderPosts(posts) {
        const postsGrid = document.getElementById('posts-grid');
        if (!postsGrid) return;

        postsGrid.innerHTML = '';
        
        posts.forEach(post => {
            const postElement = this.createPostElement(post);
            postsGrid.appendChild(postElement);
        });
    }

    createPostElement(post) {
        const postElement = document.createElement('div');
        postElement.className = 'profile-post';
        postElement.dataset.postId = post.id;
        
        postElement.innerHTML = `
            ${post.media_type === 'video'
                ? `<video src="${post.media_url}"></video>`
                : `<img src="${post.media_url}" alt="Post">`
            }
            <div class="profile-post-overlay">
                <div class="post-stats-overlay">
                    <i class="fas fa-heart"></i>
                    <span>${post.like_count}</span>
                </div>
                <div class="post-stats-overlay">
                    <i class="fas fa-comment"></i>
                    <span>${post.comment_count}</span>
                </div>
            </div>
        `;
        
        postElement.addEventListener('click', () => {
            // Show post detail modal or navigate to post page
            this.showPostDetail(post.id);
        });
        
        return postElement;
    }

    async toggleFollow() {
        if (this.isOwnProfile) return;

        const followBtn = document.getElementById('follow-btn');
        if (!followBtn) return;

        const isFollowing = followBtn.classList.contains('following');

        try {
            if (isFollowing) {
                // Unfollow
                const { error } = await supabaseClient
                    .from('followers')
                    .delete()
                    .eq('follower_id', this.currentUserId)
                    .eq('following_id', this.profileUserId);

                if (error) throw error;

                followBtn.textContent = 'Follow';
                followBtn.classList.remove('following');
                
                // Update followers count
                const followersCount = document.getElementById('followers-count');
                if (followersCount) {
                    const currentCount = parseInt(followersCount.textContent) || 0;
                    followersCount.textContent = Math.max(0, currentCount - 1);
                }
            } else {
                // Follow
                const { error } = await supabaseClient
                    .from('followers')
                    .insert([{
                        follower_id: this.currentUserId,
                        following_id: this.profileUserId
                    }]);

                if (error) throw error;

                followBtn.textContent = 'Following';
                followBtn.classList.add('following');
                
                // Update followers count
                const followersCount = document.getElementById('followers-count');
                if (followersCount) {
                    const currentCount = parseInt(followersCount.textContent) || 0;
                    followersCount.textContent = currentCount + 1;
                }
            }
        } catch (error) {
            console.error('Error toggling follow:', error);
            alert('Error updating follow status');
        }
    }

    setupEventListeners() {
        // Follow button
        const followBtn = document.getElementById('follow-btn');
        if (followBtn) {
            followBtn.addEventListener('click', () => {
                this.toggleFollow();
            });
        }

        // Edit profile button
        const editProfileBtn = document.getElementById('edit-profile-btn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', () => {
                window.location.href = 'edit-profile.html';
            });
        }

        // Profile tabs
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });
    }

    switchTab(tab) {
        // Update active tab
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Load content for tab
        if (tab === 'posts') {
            this.loadPosts();
        } else if (tab === 'saved') {
            this.loadSavedPosts();
        } else if (tab === 'tagged') {
            this.loadTaggedPosts();
        }
    }

    async loadSavedPosts() {
        // Implement saved posts functionality
        alert('Saved posts feature coming soon!');
    }

    async loadTaggedPosts() {
        // Implement tagged posts functionality
        alert('Tagged posts feature coming soon!');
    }

    showPostDetail(postId) {
        // Navigate to post detail or show modal
        alert(`Post detail for ${postId} would open here`);
    }
}

// Initialize profile
const profile = new Profile();
export { profile };
