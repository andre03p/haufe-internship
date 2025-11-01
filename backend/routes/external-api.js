import express from "express";

const router = express.Router();

/**
 * GET /api/external/test
 * Test external API call - fetches data from JSONPlaceholder
 */
router.get("/test", async (req, res) => {
  try {
    console.log("Testing external API call...");

    const response = await fetch(
      "https://jsonplaceholder.typicode.com/posts/1"
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    res.json({
      success: true,
      message: "External API call successful",
      data,
      source: "JSONPlaceholder API",
    });
  } catch (error) {
    console.error("External API test failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch from external API",
    });
  }
});

/**
 * GET /api/external/users
 * Fetch users from external API
 */
router.get("/users", async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    console.log(`Fetching ${limit} users from external API...`);

    const response = await fetch(
      `https://jsonplaceholder.typicode.com/users?_limit=${limit}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const users = await response.json();

    res.json({
      success: true,
      count: users.length,
      users: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company?.name,
        city: user.address?.city,
      })),
      source: "JSONPlaceholder API",
    });
  } catch (error) {
    console.error("External API users fetch failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch users from external API",
    });
  }
});

/**
 * GET /api/external/posts
 * Fetch posts from external API
 */
router.get("/posts", async (req, res) => {
  try {
    const { userId, limit = 10 } = req.query;

    let url = `https://jsonplaceholder.typicode.com/posts?_limit=${limit}`;
    if (userId) {
      url += `&userId=${userId}`;
    }

    console.log(`Fetching posts from external API...`);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const posts = await response.json();

    res.json({
      success: true,
      count: posts.length,
      posts: posts.map((post) => ({
        id: post.id,
        userId: post.userId,
        title: post.title,
        body: post.body.substring(0, 100) + "...",
      })),
      source: "JSONPlaceholder API",
    });
  } catch (error) {
    console.error("External API posts fetch failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch posts from external API",
    });
  }
});

/**
 * POST /api/external/test-post
 * Test POST request to external API
 */
router.post("/test-post", async (req, res) => {
  try {
    const { title, body, userId = 1 } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: "title and body are required",
      });
    }

    console.log("Testing external API POST request...");

    const response = await fetch("https://jsonplaceholder.typicode.com/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        body,
        userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    res.json({
      success: true,
      message: "External API POST successful",
      data,
      source: "JSONPlaceholder API",
      note: "This is a fake API, data is not actually persisted",
    });
  } catch (error) {
    console.error("External API POST test failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to POST to external API",
    });
  }
});

/**
 * GET /api/external/github-user/:username
 * Fetch GitHub user information
 */
router.get("/github-user/:username", async (req, res) => {
  try {
    const { username } = req.params;

    console.log(`Fetching GitHub user: ${username}`);

    const response = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        "User-Agent": "Haufe-Code-Review-App",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({
          success: false,
          error: "GitHub user not found",
        });
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const user = await response.json();

    res.json({
      success: true,
      user: {
        login: user.login,
        name: user.name,
        bio: user.bio,
        publicRepos: user.public_repos,
        followers: user.followers,
        following: user.following,
        avatarUrl: user.avatar_url,
        htmlUrl: user.html_url,
        createdAt: user.created_at,
      },
      source: "GitHub API",
    });
  } catch (error) {
    console.error("GitHub API fetch failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch GitHub user",
    });
  }
});

/**
 * GET /api/external/weather
 * Fetch weather data (using free weather API)
 */
router.get("/weather", async (req, res) => {
  try {
    const { city = "London" } = req.query;

    console.log(`Fetching weather for: ${city}`);

    const response = await fetch(
      `https://wttr.in/${encodeURIComponent(city)}?format=j1`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const current = data.current_condition[0];

    res.json({
      success: true,
      weather: {
        city,
        temperature: current.temp_C,
        feelsLike: current.FeelsLikeC,
        description: current.weatherDesc[0].value,
        humidity: current.humidity,
        windSpeed: current.windspeedKmph,
        visibility: current.visibility,
        pressure: current.pressure,
      },
      source: "wttr.in Weather API",
    });
  } catch (error) {
    console.error("Weather API fetch failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch weather data",
    });
  }
});

export default router;
