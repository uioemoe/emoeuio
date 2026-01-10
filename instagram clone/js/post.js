import { supabaseClient } from './supabase.js';
import { auth } from './auth.js';

class PostManager {
    constructor() {
        this.currentFile = null;
        this.mediaType = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Create post button
        const createPostBtn = document.getElementById('create-post-btn');
        if (createPostBtn) {
            createPostBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showCreatePostModal();
            });
        }

        // Choose file button
        const chooseFileBtn = document.getElementById('choose-file-btn');
        if (chooseFileBtn) {
            chooseFileBtn.addEventListener('click', () => {
                document.getElementById('media-upload').click();
            });
        }

        // File input change
        const mediaUpload = document.getElementById('media-upload');
        if (mediaUpload) {
            mediaUpload.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleFileSelect(file);
                }
            });
        }

        // Drag and drop
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = '#0095f6';
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.style.borderColor = '#dbdbdb';
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = '#dbdbdb';
                
                const file = e.dataTransfer.files[0];
                if (file) {
                    this.handleFileSelect(file);
                }
            });
        }

        // Publish post button
        const publishPostBtn = document.getElementById('publish-post');
        if (publishPostBtn) {
            publishPostBtn.addEventListener('click', () => {
                this.publishPost();
            });
        }

        // Modal close
        const closeModalBtns = document.querySelectorAll('.close-modal');
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                    this.resetPostForm();
                }
            });
        });
    }

    showCreatePostModal() {
        const modal = document.getElementById('create-post-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    handleFileSelect(file) {
        // Validate file type
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            alert('Please select an image or video file');
            return;
        }

        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            return;
        }

        this.currentFile = file;
        this.mediaType = file.type.startsWith('image/') ? 'image' : 'video';

        // Show preview
        this.showPreview(file);

        // Show caption form
        const uploadArea = document.getElementById('upload-area');
        const postForm = document.getElementById('post-form');
        if (uploadArea && postForm) {
            uploadArea.style.display = 'none';
            postForm.style.display = 'block';
        }
    }

    showPreview(file) {
        const previewArea = document.getElementById('preview-area');
        const mediaPreview = document.getElementById('media-preview');
        const videoPreview = document.getElementById('video-preview');

        if (!previewArea || !mediaPreview || !videoPreview) return;

        previewArea.style.display = 'block';

        if (this.mediaType === 'image') {
            const reader = new FileReader();
            reader.onload = (e) => {
                mediaPreview.src = e.target.result;
                mediaPreview.style.display = 'block';
                videoPreview.style.display = 'none';
            };
            reader.readAsDataURL(file);
        } else {
            videoPreview.src = URL.createObjectURL(file);
            videoPreview.style.display = 'block';
            mediaPreview.style.display = 'none';
        }
    }

    async publishPost() {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) {
            alert('Please login to post');
            window.location.href = 'login.html';
            return;
        }

        if (!this.currentFile) {
            alert('Please select a file first');
            return;
        }

        const caption = document.getElementById('caption')?.value || '';
        const publishBtn = document.getElementById('publish-post');
        
        if (publishBtn) {
            publishBtn.disabled = true;
            publishBtn.textContent = 'Publishing...';
        }

        try {
            // Upload file to Supabase Storage
            const fileExt = this.currentFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const filePath = `${currentUser.id}/${fileName}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('media')
                .upload(filePath, this.currentFile);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabaseClient.storage
                .from('media')
                .getPublicUrl(filePath);

            // Create post in database
            const { error: postError } = await supabaseClient
                .from('posts')
                .insert([{
                    user_id: currentUser.id,
                    media_url: publicUrl,
                    media_type: this.mediaType,
                    caption: caption.trim(),
                    like_count: 0,
                    comment_count: 0
                }]);

            if (postError) throw postError;

            // Success
            alert('Post published successfully!');
            
            // Close modal and reset
            const modal = document.getElementById('create-post-modal');
            if (modal) modal.style.display = 'none';
            
            this.resetPostForm();

            // Refresh feed or profile
            if (window.location.pathname.includes('profile.html')) {
                window.location.reload();
            } else if (window.location.pathname.includes('index.html')) {
                window.location.reload();
            }

        } catch (error) {
            console.error('Error publishing post:', error);
            alert('Error publishing post: ' + error.message);
        } finally {
            if (publishBtn) {
                publishBtn.disabled = false;
                publishBtn.textContent = 'Publish Post';
            }
        }
    }

    resetPostForm() {
        this.currentFile = null;
        this.mediaType = null;
        
        const uploadArea = document.getElementById('upload-area');
        const previewArea = document.getElementById('preview-area');
        const postForm = document.getElementById('post-form');
        const caption = document.getElementById('caption');
        const mediaUpload = document.getElementById('media-upload');
        
        if (uploadArea) uploadArea.style.display = 'block';
        if (previewArea) previewArea.style.display = 'none';
        if (postForm) postForm.style.display = 'none';
        if (caption) caption.value = '';
        if (mediaUpload) mediaUpload.value = '';
    }

    async deletePost(postId) {
        const currentUser = auth.getCurrentUser();
        if (!currentUser) return;

        if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
            return;
        }

        try {
            // Get post to get media URL
            const { data: post, error: fetchError } = await supabaseClient
                .from('posts')
                .select('*')
                .eq('id', postId)
                .eq('user_id', currentUser.id)
                .single();

            if (fetchError) throw fetchError;

            // Delete post from database (cascade will delete likes and comments)
            const { error: deleteError } = await supabaseClient
                .from('posts')
                .delete()
                .eq('id', postId)
                .eq('user_id', currentUser.id);

            if (deleteError) throw deleteError;

            // Delete media file from storage
            if (post.media_url) {
                const urlParts = post.media_url.split('/');
                const filePath = urlParts.slice(urlParts.indexOf('media') + 1).join('/');
                
                const { error: storageError } = await supabaseClient.storage
                    .from('media')
                    .remove([filePath]);

                if (storageError) {
                    console.error('Error deleting media file:', storageError);
                }
            }

            // Remove post from DOM
            const postElement = document.querySelector(`[data-post-id="${postId}"]`);
            if (postElement) postElement.remove();

            alert('Post deleted successfully');

            // Refresh counts
            if (window.location.pathname.includes('profile.html')) {
                window.location.reload();
            }

        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Error deleting post: ' + error.message);
        }
    }
}

// Initialize post manager
const postManager = new PostManager();
export { postManager };