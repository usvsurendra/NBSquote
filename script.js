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

// Fallback data if your Supabase tables are currently empty
const MOCK_DATA = [
    {
        id: 1,
        text: "The map is not the territory. Reality is far more complex than the models we use to understand it.",
        highlighted_words: ["map", "territory.", "Reality"],
        upvotes: 142,
        downvotes: 12,
        comment_count: 5,
        created_at: "2026-06-19T00:00:00Z",
        comments: [
            { id: 101, text: "Always forget this when looking at financial models.", created_at: "2026-06-19T01:00:00Z" }
        ]
    },
    {
        id: 2,
        text: "Inversion. Instead of asking how to achieve success, ask how to guarantee failure, and avoid those things.",
        highlighted_words: ["Inversion.", "guarantee", "failure,"],
        upvotes: 350,
        downvotes: 5,
        comment_count: 18,
        created_at: "2026-06-18T00:00:00Z",
        comments: []
    },
    {
        id: 3,
        text: "Occam's Razor. When presented with competing hypotheses about the same prediction, one should select the solution with the fewest assumptions.",
        highlighted_words: ["Occam's", "Razor.", "fewest", "assumptions."],
        upvotes: 89,
        downvotes: 21,
        comment_count: 2,
        created_at: "2026-06-17T00:00:00Z",
        comments: []
    }
];

// ==========================================
// 3. CORE UI FLOW: REVEAL & TYPEWRITER
// ==========================================
const revealBtn = document.getElementById('reveal-btn');
const takeawayContainer = document.getElementById('takeaway-container');
const takeawayText = document.getElementById('takeaway-text');
const ctaText = document.getElementById('cta-text');

revealBtn.addEventListener('click', async () => {
    revealBtn.classList.add('hidden');
    takeawayContainer.classList.remove('hidden');
    takeawayContainer.classList.add('flex');
    
    // Pick the most recent post as "Today's Takeaway"
    const dailyPost = posts[0] || MOCK_DATA[0];
    
    await typeWriterEffect(takeawayText, dailyPost.text, dailyPost.highlighted_words);
    
    // Trigger CTA fade-in
    setTimeout(() => {
        ctaText.classList.remove('opacity-0');
        ctaText.classList.add('opacity-100');
    }, 500);
});

async function typeWriterEffect(element, text, highlights) {
    element.innerHTML = '';
    const words = text.split(' ');
    
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const cleanWordForMatch = word.replace(/[.,!?]/g, ''); // strip basic punctuation for check
        
        // Check if word (with or without punctuation) is in highlights array
        const isHighlighted = highlights.includes(word) || highlights.includes(cleanWordForMatch);
        
        const span = document.createElement('span');
        // Apply ultra-minimalist inverted highlighting
        if (isHighlighted) {
            span.className = 'bg-black text-white px-2 py-1 mx-1 rounded-sm inline-block transition-all duration-300';
        } else {
            span.className = 'mx-1 inline-block';
        }
        
        element.appendChild(span);

        // Type character by character
        for (let char of word) {
            span.textContent += char;
            await new Promise(r => setTimeout(r, 40)); // 40ms per keystroke
        }
        
        // Add trailing space
        element.appendChild(document.createTextNode(' '));
    }
}

// ==========================================
// 4. DATABASE FETCH & FEED RENDER
// ==========================================
async function fetchPosts() {
    try {
        // Fetch posts
        const { data: postData, error: postError } = await supabase
            .from('posts')
            .select('*');

        if (postError) throw new Error(postError.message);
        
        if (!postData || postData.length === 0) {
            console.warn("Supabase tables are empty. Rendering MOCK_DATA.");
            posts = [...MOCK_DATA];
            renderFeed();
            return;
        }

        // Fetch comments to calculate comment counts natively client-side
        const { data: commentData } = await supabase
            .from('comments')
            .select('*');

        // Merge comments into posts
        posts = postData.map(post => {
            const postComments = commentData ? commentData.filter(c => c.post_id === post.id) : [];
            return {
                ...post,
                comments: postComments,
                comment_count: postComments.length
            };
        });

    } catch (e) {
        console.warn("Supabase fetch failed. Falling back to MOCK_DATA.", e);
        posts = [...MOCK_DATA];
    }
    
    renderFeed();
}

function renderFeed() {
    const feedContainer = document.getElementById('feed-container');
    feedContainer.innerHTML = '';

    // Sorting Logic
    let sortedPosts = [...posts];
    if (currentSort === 'newest') {
        sortedPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (currentSort === 'top') {
        sortedPosts.sort((a, b) => b.upvotes - a.upvotes);
    } else if (currentSort === 'discussed') {
        sortedPosts.sort((a, b) => b.comment_count - a.comment_count);
    }

    sortedPosts.forEach(post => {
        const postEl = document.createElement('article');
        postEl.className = 'flex flex-col space-y-4';

        postEl.innerHTML = `
            <p class="text-xl md:text-2xl font-bold leading-relaxed tracking-tight">${post.text}</p>
            
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

// Attach to window object to be accessible from inline HTML onclick handlers
window.handleVote = async (postId, type) => {
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return;

    // Optimistic UI Update
    if (type === 'upvote') {
        posts[postIndex].upvotes++;
        document.getElementById(`upvotes-${postId}`).innerText = posts[postIndex].upvotes;
    } else {
        posts[postIndex].downvotes++;
        document.getElementById(`downvotes-${postId}`).innerText = posts[postIndex].downvotes;
    }

    // Supabase Update (Only runs if data isn't mock data based on ID type)
    if (typeof postId === 'number' && postId < 100) return; // Prevent updating MOCK_DATA in Supabase

    const updateData = type === 'upvote' 
        ? { upvotes: posts[postIndex].upvotes } 
        : { downvotes: posts[postIndex].downvotes };
        
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

    // Optimistic UI Update
    const postIndex = posts.findIndex(p => p.id === postId);
    posts[postIndex].comments.push(newComment);
    posts[postIndex].comment_count++;
    
    // Re-render feed to reflect new comment count & list
    renderFeed();
    
    // Keep the comment section open after re-rendering
    document.getElementById(`comments-${postId}`).classList.remove('hidden');
    document.getElementById(`comments-${postId}`).classList.add('flex');

    // Supabase Insertion (Only runs if data isn't mock data)
    if (typeof postId === 'number' && postId < 100) return; 

    await supabase.from('comments').insert([newComment]);
};

// Sort Switcher Logic
document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Reset styles
        document.querySelectorAll('.sort-btn').forEach(b => {
            b.classList.remove('text-black', 'border-black');
            b.classList.add('text-gray-500', 'border-transparent');
        });
        
        // Apply active style
        e.target.classList.remove('text-gray-500', 'border-transparent');
        e.target.classList.add('text-black', 'border-black');
        
        currentSort = e.target.dataset.sort;
        renderFeed();
    });
});

// Initialize App
fetchPosts();
