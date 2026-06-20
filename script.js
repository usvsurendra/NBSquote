import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ==========================================
// 1. SUPABASE INITIALIZATION
// ==========================================
const SUPABASE_URL = 'https://fmsmtoawripfehcwxuva.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtc210b2F3cmlwZmVoY3d4dXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE5MTg2MTAsImV4cCI6MjA5NzQ5NDYxMH0.804z0O0AtW6-8nwFvuc4IVfb9O85jYRkDeJQTvYNDUA';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 2. STATE & MOCK FALLBACK
// ==========================================
let posts = [];
let currentSort = 'newest';

// Fallback data if DB fetch fails
const MOCK_DATA = [
    {
        id: 1,
        text: "The map is not the territory. Reality is far more complex than the models we use to understand it.",
        upvotes: 142,
        downvotes: 12,
        comment_count: 5,
        created_at: "2026-06-19T00:00:00Z",
        comments: []
    }
];

// ==========================================
// 3. CORE UI FLOW & NEW INTERACTIONS
// ==========================================
const revealBtn = document.getElementById('reveal-btn');
const takeawayContainer = document.getElementById('takeaway-container');
const takeawayText = document.getElementById('takeaway-text');
const ctaText = document.getElementById('cta-text');
const generateContainer = document.getElementById('generate-container');
const generateAnotherBtn = document.getElementById('generate-another-btn');
const generateWarning = document.getElementById('generate-warning');

let generateClickCount = 0;
let isTyping = false;

async function triggerTakeaway(postData) {
    if (isTyping || !postData) return;
    isTyping = true;
    
    // Reset states
    ctaText.classList.remove('opacity-100');
    ctaText.classList.add('opacity-0');
    generateContainer.classList.remove('opacity-100');
    generateContainer.classList.add('opacity-0');
    generateWarning.classList.add('hidden');
    generateClickCount = 0;

    takeawayContainer.classList.remove('hidden');
    takeawayContainer.classList.add('flex');
    
    // Scroll to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Call clean typing effect
    await typeWriterEffect(takeawayText, postData.text);
    
    // Fade in CTA and Generate buttons
    setTimeout(() => {
        ctaText.classList.remove('opacity-0');
        ctaText.classList.add('opacity-100');
        generateContainer.classList.remove('opacity-0');
        generateContainer.classList.add('opacity-100');
        isTyping = false;
    }, 500);
}

// Clean, fast typing effect with no highlights
async function typeWriterEffect(element, text) {
    element.textContent = ''; 
    for (let char of text) {
        element.textContent += char;
        await new Promise(r => setTimeout(r, 30)); 
    }
}

revealBtn.addEventListener('click', () => {
    revealBtn.classList.add('hidden');
    const dailyPost = posts[0] || MOCK_DATA[0];
    triggerTakeaway(dailyPost);
});

// "Generate Another" Friction Logic
generateAnotherBtn.addEventListener('click', () => {
    if (generateClickCount === 0) {
        // First click: Show friction warning
        generateWarning.classList.remove('hidden');
        generateAnotherBtn.innerText = "Yes, show me another";
        generateClickCount++;
    } else {
        // Second click: Reveal random model
        const randomPost = posts[Math.floor(Math.random() * posts.length)];
        triggerTakeaway(randomPost);
        generateAnotherBtn.innerText = "Reveal Another Model";
    }
});

// Open specific model from Archive
window.openModel = (postId) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
        revealBtn.classList.add('hidden');
        triggerTakeaway(post);
    }
};

// ==========================================
// 4. DATABASE FETCH & FEED RENDER
// ==========================================
async function fetchPosts() {
    try {
        // Fetch posts
        const { data: postData, error: postError } = await supabase.from('posts').select('*');

        if (postError) throw new Error(postError.message);
        
        if (!postData || postData.length === 0) {
            console.warn("Supabase returned empty array. RLS might be enabled, or table is empty.");
            posts = [...MOCK_DATA];
            renderFeed();
            return;
        }

        // Safely try to fetch comments (won't crash if table doesn't exist yet)
        let commentData = [];
        try {
            const { data } = await supabase.from('comments').select('*');
            if (data) commentData = data;
        } catch (e) {
            console.warn("Comments table not found or accessible.");
        }

        // Merge comments into posts safely
        posts = postData.map(post => {
            const postComments = commentData.filter(c => c.post_id === post.id);
            return {
                ...post,
                comments: postComments,
                comment_count: postComments.length,
                upvotes: post.upvotes || 0,
                downvotes: post.downvotes || 0
            };
        });

    } catch (e) {
        console.warn("Supabase fetch failed. Ensure RLS is disabled on 'posts' table.", e);
        posts = [...MOCK_DATA];
    }
    
    renderFeed();
}

function renderFeed() {
    const feedContainer = document.getElementById('feed-container');
    feedContainer.innerHTML = '';

    // Sorting Logic
    let sortedPosts = [...posts];
    if (currentSort === 'newest') sortedPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (currentSort === 'top') sortedPosts.sort((a, b) => b.upvotes - a.upvotes);
    else if (currentSort === 'discussed') sortedPosts.sort((a, b) => b.comment_count - a.comment_count);

    sortedPosts.forEach(post => {
        const postEl = document.createElement('article');
        postEl.className = 'flex flex-col space-y-4';

        postEl.innerHTML = `
            <button onclick="openModel(${post.id})" class="text-left text-xl md:text-2xl font-bold leading-relaxed tracking-tight hover:text-gray-500 transition-colors duration-200">
                ${post.text}
            </button>
            
            <div class="flex items-center space-x-6 text-sm font-bold text-gray-500">
                <button class="hover:text-black transition-colors flex items-center space-x-2" onclick="handleVote(${post.id}, 'upvote')">
                    <span>↑</span> <span id="upvotes-${post.id}">${post.upvotes}</span>
                </button>
                <button class="hover:text-black transition-colors flex items-center space-x-2" onclick="handleVote(${post.id}, 'downvote')">
                    <span>↓</span> <span id="downvotes-${post.id}">${post.downvotes}</span>
                </button>
                <button class="hover:text-black transition-colors flex items-center space-x-2" onclick="toggleComments(${post.id})">
                    <span>💬</span> <span>${post.comment_count}</span>
                </button>
            </div>

            <div id="comments-${post.id}" class="hidden flex-col space-y-4 mt-4 pl-4 border-l-2 border-gray-200">
                <div id="comment-list-${post.id}" class="space-y-4 text-sm">
                    ${post.comments.map(c => `<div class="text-gray-900">${c.text}</div>`).join('')}
                </div>
                <form onsubmit="submitComment(event, ${post.id})" class="flex mt-2">
                    <input type="text" name="commentText" placeholder="Add a direct thought..." required class="flex-1 bg-transparent border-b border-gray-300 focus:border-black outline-none py-2 text-sm transition-colors rounded-none">
                    <button type="submit" class="ml-4 text-sm font-bold uppercase hover:text-gray-500 transition-colors">Post</button>
                </form>
            </div>
        `;
        feedContainer.appendChild(postEl);
    });
}

// ==========================================
// 5. INTERACTIVITY: VOTING, COMMENTS, SORTING
// ==========================================
window.handleVote = async (postId, type) => {
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;

    if (type === 'upvote') {
        posts[postIndex].upvotes++;
        document.getElementById(`upvotes-${postId}`).innerText = posts[postIndex].upvotes;
    } else {
        posts[postIndex].downvotes++;
        document.getElementById(`downvotes-${postId}`).innerText = posts[postIndex].downvotes;
    }

    if (typeof postId === 'number' && postId < 100) return; // Prevent mock update

    const updateData = type === 'upvote' ? { upvotes: posts[postIndex].upvotes } : { downvotes: posts[postIndex].downvotes };
    await supabase.from('posts').update(updateData).eq('id', postId);
};

window.toggleComments = (postId) => {
    const commentSection = document.getElementById(`comments-${postId}`);
    commentSection.classList.toggle('hidden');
    commentSection.classList.toggle('flex');
};

window.submitComment = async (event, postId) => {
    event.preventDefault();
    const input = event.target.elements.commentText;
    const text = input.value.trim();
    if (!text) return;

    const newComment = { post_id: postId, text: text, created_at: new Date().toISOString() };
    const postIndex = posts.findIndex(p => p.id === postId);
    
    posts[postIndex].comments.push(newComment);
    posts[postIndex].comment_count++;
    
    renderFeed();
    
    document.getElementById(`comments-${postId}`).classList.remove('hidden');
    document.getElementById(`comments-${postId}`).classList.add('flex');

    if (typeof postId === 'number' && postId < 100) return; 
    await supabase.from('comments').insert([newComment]);
};

document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.sort-btn').forEach(b => {
            b.classList.remove('text-black', 'border-black');
            b.classList.add('text-gray-500', 'border-transparent');
        });
        e.target.classList.remove('text-gray-500', 'border-transparent');
        e.target.classList.add('text-black', 'border-black');
        
        currentSort = e.target.dataset.sort;
        renderFeed();
    });
});

// Initialize App
fetchPosts();
