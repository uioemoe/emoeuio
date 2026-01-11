import { supabaseClient } from './supabase.js';
import { auth } from './auth.js';

class Feed {
    constructor() {
        this.posts = [];
        this.currentPage = 0;
        this.postsPerPage = 5;
        this.isLoading = false;
        this.hasMore = true;
        this.init();
    }

    async init() {
        if (document.getElementById('posts-feed')) {
            await this.loadCurrentUser();
            await this.loadFeed();
            this.setupEventListeners();
            this.setupRealtime();
        }
        
        if (document.getElementById('explore-grid')) {
            await this.loadExplore();
        }
    }

    async loadCurrentUser() {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;
        
        const profile = await auth.getCurrentUserProfile();
        if (profile) {
            const avatar = document.getElementById('current-user-avatar');
            const username = document.getElementById('current-username');
            const displayName = document.getElementById('current-display-name');
            
            if (avatar) {
                avatar.innerHTML = profile.profile_picture 
                    ? `<img src="${profile.profile_picture}" alt="${profile.username}">`
                    : `<i class="fas fa-user"></i>`;
            }
            if (username) username.textContent = profile.username;
            if (displayName) displayName.textContent = profile.display_name;
        }
    }

    async loadFeed() {
        if (this.isLoading || !this.hasMore) return;
        
        this.isLoading = true;
        const loader = document.getElementById('load-more');
        if (loader) loader.disabled = true;
        
        const currentUser = auth.getCurrentUser();
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        try {
            // Get users that current user follows
            const { data: following } = await supabaseClient
                .from('followers')
                .select('following_id')
                .eq('follower_id', currentUser.id);

            const followingIds = following ? following.map(f => f.following_id) : [];
            followingIds.push(currentUser.id); // Include own posts

            const { data: posts, error } = await supabaseClient
                .from('posts')
                .select(`
                    *,
                    user:users(username, profile_picture, display_name)
                `)
                .in('user_id', followingIds)
                .order('created_at', { ascending: false })
                .range(this.currentPage * this.postsPerPage, (this.currentPage + 1) * this.postsPerPage - 1);

            if (error) throw error;

            if (posts.length === 0) {
                this.hasMore = false;
                const loadMoreBtn = document.getElementById('load-more');
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            } else {
                this.posts.push(...posts);
                this.renderPosts(posts);
                this.currentPage++;
            }

            // Load suggestions
            await this.loadSuggestions();
        } catch (error) {
            console.error('Error loading feed:', error);
        } finally {
            this.isLoading = false;
            const loader = document.getElementById('load-more');
            if (loader) loader.disabled = false;
        }
    }

    async loadExplore() {
        try {
            const { data: posts, error } = await supabaseClient
                .from('posts')
                .select(`
                    *,
                    user:users(username, profile_picture, display_name)
                `)
                .order('created_at', { ascending: false })
                .limit(30);

            if (error) throw error;

            this.renderExplorePosts(posts);
        } catch (error) {
            console.error('Error loading explore:', error);
        }
    }

    async loadSuggestions() {
        try {
            const currentUser = auth.getCurrentUser();
            if (!currentUser) return;

            // Get users not followed by current user
            const { data: suggestions, error } = await supabaseClient
                .rpc('get_suggestions', { current_user_id: currentUser.id })
                .limit(5);

            if (error) throw error;

            this.renderSuggestions(suggestions);
        } catch (error) {
            console.error('Error loading suggestions:', error);
        }
    }

    renderPosts(posts) {
        const feed = document.getElementById('posts-feed');
        if (!feed) return;

        posts.forEach(post => {
            const postElement = this.createPostElement(post);
            feed.appendChild(postElement);
        });
    }

    renderExplorePosts(posts) {
        const grid = document.getElementById('explore-grid');
        if (!grid) return;

        grid.innerHTML = '';
        posts.forEach(post => {
            const postElement = this.createExplorePostElement(post);
            grid.appendChild(postElement);
        });
    }

    createPostElement(post) {
        const postElement = document.createElement('div');
        postElement.className = 'post';
        postElement.dataset.postId = post.id;
        
        const timeAgo = this.formatTimeAgo(post.created_at);
        const isVideo = post.media_type === 'video';
        
        postElement.innerHTML = `
            <div class="post-header">
                <div class="post-user">
                    <img src="${post.user.profile_picture || 'https://via.placeholder.com/150'}" 
                         alt="${post.user.username}">
                    <div class="post-user-info">
                        <h3>${post.user.username}</h3>
                        <span>${timeAgo}</span>
                    </div>
                </div>
                <button class="post-options"><i class="fas fa-ellipsis-h"></i></button>
            </div>
            <div class="post-media">
                ${isVideo 
                    ? `<video src="${post.media_url}" controls></video>`
                    : `<img src="${post.media_url}" alt="Post by ${post.user.username}">`
                }
            </div>
            <div class="post-actions">
                <div class="action-left">
                    <button class="action-btn like-btn" data-post-id="${post.id}">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="action-btn comment-btn" data-post-id="${post.id}">
                        <i class="far fa-comment"></i>
                    </button>
                    <button class="action-btn share-btn">
                        <i class="far fa-paper-plane"></i>
                    </button>
                </div>
                <button class="action-btn save-btn">
                    <i class="far fa-bookmark"></i>
                </button>
            </div>
            <div class="post-stats">
                <div class="post-likes">${post.like_count} likes</div>
                <div class="post-caption">
                    <strong>${post.user.username}</strong>
                    ${post.caption || ''}
                </div>
                <div class="post-time">${timeAgo}</div>
            </div>
            <div class="post-comments">
                <div class="view-comments" data-post-id="${post.id}">
                    View all ${post.comment_count} comments
                </div>
                <!-- Latest 2 comments will be loaded here -->
            </div>
            <div class="add-comment">
                <input type="text" placeholder="Add a comment..." data-post-id="${post.id}">
                <button class="post-comment-btn" data-post-id="${post.id}">Post</button>
            </div>
        `;
        
        // Load comments and like status
        this.loadPostComments(post.id);
        this.checkIfLiked(post.id);
        
        return postElement;
    }

    createExplorePostElement(post) {
        const postElement = document.createElement('div');
        postElement.className = 'explore-post';
        postElement.dataset.postId = post.id;
        
        postElement.innerHTML = `
            ${post.media_type === 'video'
                ? `<video src="${post.media_url}"></video>`
                : `<img src="${post.media_url}" alt="Post by ${post.user.username}">`
            }
            <div class="explore-post-overlay">
                <div class="explore-post-stats">
                    <i class="fas fa-heart"></i>
                    <span>${post.like_count}</span>
                </div>
                <div class="explore-post-stats">
                    <i class="fas fa-comment"></i>
                    <span>${post.comment_count}</span>
                </div>
            </div>
        `;
        
        postElement.addEventListener('click', () => {
            // Navigate to post detail or show modal
            this.showPostDetail(post.id);
        });
        
        return postElement;
    }

    renderSuggestions(users) {
        const list = document.getElementById('suggestions-list');
        if (!list) return;

        list.innerHTML = '';
        users.forEach(user => {
            const suggestion = document.createElement('div');
            suggestion.className = 'suggestion';
            
            suggestion.innerHTML = `
                <div class="suggestion-user">
                    <img src="${user.profile_picture || 'https://via.placeholder.com/150'}" 
                         alt="${user.username}">
                    <div class="suggestion-user-info">
                        <h4>${user.username}</h4>
                        <span>Suggested for you</span>
                    </div>
                </div>
                <button class="follow-btn follow-suggestion-btn" data-user-id="${user.id}">
                    Follow
                </button>
            `;
            
            list.appendChild(suggestion);
        });
    }

    async loadPostComments(postId) {
        try {
            const { data: comments, error } = await supabaseClient
                .from('comments')
                .select(`
                    *,
                    user:users(username)
                `)
                .eq('post_id', postId)
                .order('created_at', { ascending: false })
                .limit(2);

            if (error) throw error;

            this.renderPostComments(postId, comments);
        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    renderPostComments(postId, comments) {
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (!postElement) return;

        const commentsContainer = postElement.querySelector('.post-comments');
        if (!commentsContainer) return;

        // Clear existing comments except view all button
        const viewAllBtn = commentsContainer.querySelector('.view-comments');
        commentsContainer.innerHTML = '';
        if (viewAllBtn) commentsContainer.appendChild(viewAllBtn);

        comments.reverse().forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.className = 'comment';
            commentElement.dataset.commentId = comment.id;
            
            const timeAgo = this.formatTimeAgo(comment.created_at);
            
            commentElement.innerHTML = `
                <div>
                    <strong>${comment.user.username}</strong>
                    ${comment.content}
                    <div style="color: #8e8e8e; font-size: 12px;">${timeAgo}</div>
                </div>
                <div class="comment-actions">
                    <button class="delete-comment" data-comment-id="${comment.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            commentsContainer.appendChild(commentElement);
        });
    }

    async checkIfLiked(postId) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;

        try {
            const { data, error } = await supabaseClient
                .from('likes')
                .select('id')
                .eq('post_id', postId)
                .eq('user_id', currentUser.id)
                .single();

            if (!error && data) {
                const likeBtn = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
                if (likeBtn) {
                    likeBtn.classList.add('liked');
                    likeBtn.querySelector('i').className = 'fas fa-heart';
                }
            }
        } catch (error) {
            // Not liked
        }
    }

    async toggleLike(postId) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;

        const likeBtn = document.querySelector(`.like-btn[data-post-id="${postId}"]`);
        if (!likeBtn) return;

        const isLiked = likeBtn.classList.contains('liked');
        
        try {
            if (isLiked) {
                // Unlike
                const { error } = await supabaseClient
                    .from('likes')
                    .delete()
                    .eq('post_id', postId)
                    .eq('user_id', currentUser.id);

                if (error) throw error;
                
                likeBtn.classList.remove('liked');
                likeBtn.querySelector('i').className = 'far fa-heart';
            } else {
                // Like
                const { error } = await supabaseClient
                    .from('likes')
                    .insert([{
                        post_id: postId,
                        user_id: currentUser.id
                    }]);

                if (error) throw error;
                
                likeBtn.classList.add('liked');
                likeBtn.querySelector('i').className = 'fas fa-heart';
            }
        } catch (error) {
            console.error('Error toggling like:', error);
        }
    }

    async addComment(postId, content) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;

        if (!content.trim()) return;

        try {
            const { error } = await supabaseClient
                .from('comments')
                .insert([{
                    post_id: postId,
                    user_id: currentUser.id,
                    content: content.trim()
                }]);

            if (error) throw error;

            // Clear input
            const input = document.querySelector(`input[data-post-id="${postId}"]`);
            if (input) input.value = '';

            // Reload comments
            await this.loadPostComments(postId);
        } catch (error) {
            console.error('Error adding comment:', error);
        }
    }

    async deleteComment(commentId) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;

        if (!confirm('Are you sure you want to delete this comment?')) return;

        try {
            const { error } = await supabaseClient
                .from('comments')
                .delete()
                .eq('id', commentId)
                .eq('user_id', currentUser.id);

            if (error) throw error;

            // Remove comment from DOM
            const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (commentElement) commentElement.remove();
        } catch (error) {
            console.error('Error deleting comment:', error);
            alert('You can only delete your own comments.');
        }
    }

    formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHour < 24) return `${diffHour}h ago`;
        if (diffDay < 7) return `${diffDay}d ago`;
        
        return date.toLocaleDateString();
    }

    setupEventListeners() {
        // Load more button
        const loadMoreBtn = document.getElementById('load-more');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => this.loadFeed());
        }

        // Load more explore button
        const loadMoreExploreBtn = document.getElementById('load-more-explore');
        if (loadMoreExploreBtn) {
            loadMoreExploreBtn.addEventListener('click', () => this.loadExplore());
        }

        // Delegate events for dynamically loaded content
        document.addEventListener('click', async (e) => {
            // Like button
            if (e.target.closest('.like-btn')) {
                const likeBtn = e.target.closest('.like-btn');
                const postId = likeBtn.dataset.postId;
                await this.toggleLike(postId);
            }
            
            // Comment button
            else if (e.target.closest('.comment-btn')) {
                const commentBtn = e.target.closest('.comment-btn');
                const postId = commentBtn.dataset.postId;
                this.showCommentModal(postId);
            }
            
            // View comments
            else if (e.target.closest('.view-comments')) {
                const viewComments = e.target.closest('.view-comments');
                const postId = viewComments.dataset.postId;
                this.showCommentModal(postId);
            }
            
            // Post comment button
            else if (e.target.closest('.post-comment-btn')) {
                const postBtn = e.target.closest('.post-comment-btn');
                const postId = postBtn.dataset.postId;
                const input = document.querySelector(`input[data-post-id="${postId}"]`);
                if (input && input.value.trim()) {
                    await this.addComment(postId, input.value);
                }
            }
            
            // Delete comment
            else if (e.target.closest('.delete-comment')) {
                const deleteBtn = e.target.closest('.delete-comment');
                const commentId = deleteBtn.dataset.commentId;
                await this.deleteComment(commentId);
            }
            
            // Follow suggestion
            else if (e.target.closest('.follow-suggestion-btn')) {
                const followBtn = e.target.closest('.follow-suggestion-btn');
                const userId = followBtn.dataset.userId;
                await this.followUser(userId, followBtn);
            }
            
            // Enter key for comment input
            else if (e.target.type === 'text' && e.key === 'Enter') {
                const input = e.target;
                const postId = input.dataset.postId;
                if (postId && input.value.trim()) {
                    await this.addComment(postId, input.value);
                }
            }
        });

        // Modal close buttons
        const closeModalBtns = document.querySelectorAll('.close-modal');
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) modal.style.display = 'none';
            });
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    setupRealtime() {
        // Subscribe to posts updates
        const postsSubscription = supabaseClient
            .channel('posts-channel')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'posts' },
                (payload) => {
                    console.log('Posts change:', payload);
                    // Handle real-time updates for posts
                }
            )
            .subscribe();

        // Subscribe to likes updates
        const likesSubscription = supabaseClient
            .channel('likes-channel')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'likes' },
                async (payload) => {
                    console.log('Likes change:', payload);
                    // Update like count in real-time
                    if (payload.eventType === 'INSERT') {
                        const postElement = document.querySelector(`[data-post-id="${payload.new.post_id}"]`);
                        if (postElement) {
                            const likeCountEl = postElement.querySelector('.post-likes');
                            if (likeCountEl) {
                                const currentCount = parseInt(likeCountEl.textContent) || 0;
                                likeCountEl.textContent = `${currentCount + 1} likes`;
                            }
                        }
                    } else if (payload.eventType === 'DELETE') {
                        const postElement = document.querySelector(`[data-post-id="${payload.old.post_id}"]`);
                        if (postElement) {
                            const likeCountEl = postElement.querySelector('.post-likes');
                            if (likeCountEl) {
                                const currentCount = parseInt(likeCountEl.textContent) || 0;
                                likeCountEl.textContent = `${Math.max(0, currentCount - 1)} likes`;
                            }
                        }
                    }
                }
            )
            .subscribe();

        // Subscribe to comments updates
        const commentsSubscription = supabaseClient
            .channel('comments-channel')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'comments' },
                async (payload) => {
                    console.log('Comments change:', payload);
                    // Update comments in real-time
                    if (payload.eventType === 'INSERT') {
                        await this.loadPostComments(payload.new.post_id);
                    } else if (payload.eventType === 'DELETE') {
                        const commentElement = document.querySelector(`[data-comment-id="${payload.old.id}"]`);
                        if (commentElement) commentElement.remove();
                    }
                }
            )
            .subscribe();
    }

    showCommentModal(postId) {
        const modal = document.getElementById('comment-modal');
        if (!modal) return;

        modal.dataset.currentPostId = postId;
        modal.style.display = 'flex';
        
        // Load all comments for this post
        this.loadAllComments(postId);
    }

    async loadAllComments(postId) {
        try {
            const { data: comments, error } = await supabaseClient
                .from('comments')
                .select(`
                    *,
                    user:users(username, profile_picture)
                `)
                .eq('post_id', postId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            this.renderModalComments(comments);
        } catch (error) {
            console.error('Error loading all comments:', error);
        }
    }

    renderModalComments(comments) {
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) return;

        commentsList.innerHTML = '';
        
        comments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.className = 'comment';
            commentElement.dataset.commentId = comment.id;
            
            const timeAgo = this.formatTimeAgo(comment.created_at);
            
            commentElement.innerHTML = `
                <div class="comment-user">
                    <img src="${comment.user.profile_picture || 'https://via.placeholder.com/150'}" 
                         alt="${comment.user.username}">
                    <div>
                        <strong>${comment.user.username}</strong>
                        <p>${comment.content}</p>
                        <div style="color: #8e8e8e; font-size: 12px;">${timeAgo}</div>
                    </div>
                </div>
                <div class="comment-actions">
                    <button class="delete-comment" data-comment-id="${comment.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            commentsList.appendChild(commentElement);
        });
    }

    async followUser(userId, buttonElement) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;

        try {
            const { error } = await supabaseClient
                .from('followers')
                .insert([{
                    follower_id: currentUser.id,
                    following_id: userId
                }]);

            if (error) throw error;

            buttonElement.textContent = 'Following';
            buttonElement.disabled = true;
        } catch (error) {
            console.error('Error following user:', error);
        }
    }

    showPostDetail(postId) {
        // Navigate to post detail page or show modal
        alert(`Post detail for ${postId} would open here`);
    }
}

// Initialize feed
const feed = new Feed();
export { feed };
