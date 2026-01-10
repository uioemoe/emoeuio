import { supabaseClient } from './supabase.js';
import { auth } from './auth.js';

class CommentManager {
    constructor() {
        this.currentPostId = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Post comment in modal
        const postCommentBtn = document.getElementById('post-comment');
        if (postCommentBtn) {
            postCommentBtn.addEventListener('click', () => {
                this.postComment();
            });
        }

        // Enter key in comment input
        const commentInput = document.getElementById('comment-input');
        if (commentInput) {
            commentInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.postComment();
                }
            });
        }

        // Delegate delete comment events
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.delete-comment')) {
                const deleteBtn = e.target.closest('.delete-comment');
                const commentId = deleteBtn.dataset.commentId;
                await this.deleteComment(commentId);
            }
        });
    }

    async postComment() {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) {
            alert('Please login to comment');
            window.location.href = 'login.html';
            return;
        }

        const commentInput = document.getElementById('comment-input');
        if (!commentInput) return;

        const content = commentInput.value.trim();
        if (!content) return;

        if (!this.currentPostId) {
            // Get post ID from modal
            const modal = document.getElementById('comment-modal');
            if (modal) {
                this.currentPostId = modal.dataset.currentPostId;
            }
        }

        if (!this.currentPostId) {
            alert('No post selected');
            return;
        }

        try {
            const { error } = await supabaseClient
                .from('comments')
                .insert([{
                    post_id: this.currentPostId,
                    user_id: currentUser.id,
                    content: content
                }]);

            if (error) throw error;

            // Clear input
            commentInput.value = '';

            // Comment will be added via real-time subscription
            // For immediate feedback, we can also manually update the UI
            this.addCommentToUI({
                id: Date.now().toString(), // Temporary ID
                user_id: currentUser.id,
                post_id: this.currentPostId,
                content: content,
                created_at: new Date().toISOString(),
                user: {
                    username: currentUser.user_metadata?.username || 'You',
                    profile_picture: null
                }
            });

        } catch (error) {
            console.error('Error posting comment:', error);
            alert('Error posting comment: ' + error.message);
        }
    }

    addCommentToUI(comment) {
        const commentsList = document.getElementById('comments-list');
        if (!commentsList) return;

        const commentElement = this.createCommentElement(comment);
        commentsList.appendChild(commentElement);
        
        // Scroll to bottom
        commentsList.scrollTop = commentsList.scrollHeight;
    }

    createCommentElement(comment) {
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
        
        return commentElement;
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

            // Remove from UI
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
}

// Initialize comment manager
const commentManager = new CommentManager();
export { commentManager };