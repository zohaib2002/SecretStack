document.addEventListener("DOMContentLoaded", () => {
    const isDarkMode = localStorage.getItem("darkMode") === "enabled";

    if (isDarkMode) {
        document.body.classList.add("dark-mode");
        document.getElementById("theme-toggle").textContent = "🔆";
    }

    // Update logo based on dark mode state
    const logo = document.querySelector(".logo");
    if (logo) {
        logo.src = isDarkMode ? "logo/dark.png" : "logo/light.png";
    }

    const postId = new URLSearchParams(window.location.search).get("post");
    postId ? loadPost(postId) : loadHome();
});

let postsData = [];  // Stores all posts from posts.json
let currentIndex = 0;  // Tracks how many posts have been loaded
const postsPerPage = 5;  // Number of posts to load at a time
let isLoading = false;  // Prevents multiple simultaneous loads

function loadHome() {
    showSearchBar();
    history.pushState(null, "", "/");
    const content = document.getElementById("content");
    content.innerHTML = '<div class="loader"></div>';

    fetch("./posts.json")
        .then(response => response.json())
        .then(posts => {
            postsData = posts;  // Store posts for pagination
            currentIndex = 0;  // Reset index
            content.innerHTML = "";  // Clear content
            loadNextPosts();  // Load the first batch
        })
        .catch(error => console.error("Error loading posts:", error));
}

function loadNextPosts() {
    if (isLoading || currentIndex >= postsData.length) return;
    isLoading = true;

    const content = document.getElementById("content");

    // Show a small circular loader
    const loader = document.createElement("div");
    loader.id = "post-loader";
    loader.innerHTML = `<div class="loader"></div>`;
    content.appendChild(loader);

    // Load the next batch of posts
    const postsToLoad = postsData.slice(currentIndex, currentIndex + postsPerPage);
    const postPromises = postsToLoad.map(post =>
        fetch(`posts/${post.id}/post.html`)
            .then(response => response.text())
            .then(html => {
                const cover = extractCover(html);
                const summary = extractSummary(html);
                const tags = post.tags.map(tag => `<span class="tag">${tag}</span>`).join(" ");

                const postDiv = document.createElement("div");
                postDiv.className = "post-preview";
                postDiv.setAttribute("data-title", post.title.toLowerCase());

                postDiv.innerHTML = `
                    ${cover ? `<img class="cover-img" src="${cover}" alt="Cover Image">` : ""}
                    <h2><a href="?post=${post.id}" onclick="event.preventDefault(); loadPost('${post.id}');">${post.title}</a></h2>
                    <p class="meta">By ${post.author} | ${post.date}</p>
                    <p class="summary">${summary}</p>
                    <div class="tags">${tags}</div>
                    <a href="?post=${post.id}" class="read-more" onclick="event.preventDefault(); loadPost('${post.id}');">Read More</a>
                `;

                return postDiv;
            })
    );

    Promise.all(postPromises).then(postElements => {
        postElements.forEach(post => content.appendChild(post));
        currentIndex += postsPerPage;  // Update index
        loader.remove();  // Remove loader
        isLoading = false;
    });
}

// Detect when user reaches the bottom and load more posts
window.addEventListener("scroll", () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 50) {
        loadNextPosts();
    }
});

function loadPost(postId) {
    history.pushState(null, "", `?post=${postId}`);
    const content = document.getElementById("content");
    content.innerHTML = "<p>Loading post...</p>";

    fetch("posts.json")
        .then(response => response.json())
        .then(posts => {
            const post = posts.find(p => p.id === postId);
            if (!post) throw new Error("Post not found");

            fetch(`posts/${postId}/post.html`)
                .then(response => response.text())
                .then(html => {
                   // document.head.innerHTML += '<link rel="stylesheet" href="post.css">';
                    content.innerHTML = `
                        <article>
                            <h2>${post.title}</h2>
                            <p class="meta">By ${post.author} | ${post.date}</p>
                            <div class="tags">${post.tags.map(tag => `<span class="tag">${tag}</span>`).join(" ")}</div>
                            <hr>
                            ${html}
                        </article>
                        <br>
                        <a href="/" onclick="event.preventDefault(); loadHome();">Back to Home</a>
                        <div id="disqus_thread"></div>
                    `;

                    // If Disqus is already loaded, reset it for the new post
                    if (window.DISQUS) {
                        window.DISQUS.reset({
                            reload: true,
                            config: function () {
                                this.page.url = window.location.href;
                                this.page.identifier = postId;
                            }
                        });
                    } else {
                        // Load Disqus for the first time
                        var d = document, s = d.createElement('script');
                        s.src = 'https://longlongdouble.disqus.com/embed.js';
                        s.setAttribute('data-timestamp', +new Date());
                        (d.head || d.body).appendChild(s);
                    }

                    hideSearchBar();
                });
        })
        .catch(error => console.error("Error loading post:", error));
}


function extractSummary(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const summary = doc.querySelector("summary");
    return summary ? summary.textContent : "No summary available.";
}

function extractCover(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const coverImg = doc.querySelector("cover img"); // Select the <img> inside <cover>
    return coverImg ? coverImg.getAttribute("src") : null;
}


function filterPosts() {
    const query = document.getElementById("search").value.toLowerCase();
    document.querySelectorAll(".post-preview").forEach(post => {
        post.style.display = post.getAttribute("data-title").includes(query) ? "block" : "none";
    });
}

function toggleDarkMode() {
    document.body.classList.toggle("dark-mode");
    const isDarkMode = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDarkMode ? "enabled" : "disabled");
    document.getElementById("theme-toggle").textContent = isDarkMode ? "🔆" : "🔅";

    // Change logo image source
    const logo = document.querySelector(".logo");
    if (logo) {
        logo.src = isDarkMode ? "logo/dark.png" : "logo/light.png";
    }
}

window.onpopstate = () => {
    const postId = new URLSearchParams(window.location.search).get("post");
    postId ? loadPost(postId) : loadHome();
};

function hideSearchBar() {
    document.getElementById("search").style.display = "none";
}

function showSearchBar() {
    document.getElementById("search").style.display = "block";
}

// Ensure search bar reappears when going back to home
document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("logo-container").addEventListener("click", function () {
        showSearchBar();
    });
});

