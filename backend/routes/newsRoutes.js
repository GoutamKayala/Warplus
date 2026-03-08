const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const axios = require('axios');

// Get all stored news articles with optional search and pagination
router.get('/', async (req, res) => {
    try {
        const { search, limit = 20, page = 1 } = req.query;
        let query = {};

        if (search) {
            query = {
                $or: [
                    { $text: { $search: search } },
                    { title: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const articles = await Article.find(query)
            .sort({ publishedAt: -1, isHighlighted: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const count = await Article.countDocuments(query);

        res.json({
            articles,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page),
            totalArticles: count
        });
    } catch (error) {
        console.error('[News] Fetch error:', error);
        res.status(500).json({ message: 'Error fetching articles', error: error.message });
    }
});

// Refresh / Fetch new articles from API (e.g. GNews)
router.post('/fetch', async (req, res) => {
    try {
        const GNEWS_API_KEY = process.env.GNEWS_API_KEY;
        // We search for "war" or specific conflict keywords
        const keyword = req.body.keyword || 'war';

        // In a real scenario, you'd want to handle multiple sources (Gnews, World News)
        let gnewsData = { articles: [] };

        if (GNEWS_API_KEY && GNEWS_API_KEY !== 'your_gnews_api_key') {
            const response = await axios.get(`https://gnews.io/api/v4/search?q=${keyword}&lang=en&max=10&apikey=${GNEWS_API_KEY}`);
            gnewsData = response.data;
        } else {
            // Mock Data if API key is not present during development
            gnewsData.articles = [
                {
                    title: "Mock Conflict Report: Significant Developments Near the Border",
                    description: "This is a mocked response since there's no API key. A major conflict has seen new developments today as forces move closer to the border regions.",
                    content: "Full content about the conflict... (Mocked)",
                    url: "https://example.com/mock-news-1",
                    image: "https://images.unsplash.com/photo-1596720426673-e4e14290f0cc?w=800&q=80",
                    source: { name: "Mock News" },
                    publishedAt: new Date().toISOString()
                },
                {
                    title: "Global Summit Addresses Ongoing Wars",
                    description: "Leaders from around the globe met today to discuss the economic and humanitarian impact of ongoing wars.",
                    content: "Full content about the global summit... (Mocked)",
                    url: "https://example.com/mock-news-2",
                    image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80",
                    source: { name: "Mock World News" },
                    publishedAt: new Date(Date.now() - 86400000).toISOString()
                }
            ];
        }

        // Process and save to MongoDB
        let newArticlesCount = 0;

        for (const article of gnewsData.articles) {
            // Check if it already exists
            const existing = await Article.findOne({ url: article.url });

            if (!existing) {
                // Here you would integrate with OpenAI/Perplexity to summarize or enrich "article.content"
                // e.g. const enrichedContent = await enrichWithPerplexity(article.content);

                const newArticle = new Article({
                    title: article.title,
                    description: article.description,
                    content: article.content, // replace with enrichedContent if implemented
                    url: article.url,
                    imageUrl: article.image,
                    source: article.source.name,
                    publishedAt: new Date(article.publishedAt),
                    isHighlighted: false // Can be determined by some logic (e.g. importance score from LLM)
                });

                await newArticle.save();
                newArticlesCount++;
            }
        }

        // Ensure the most recent article is highlighted (or clear old highlights)
        await Article.updateMany({}, { isHighlighted: false });
        const latestArticle = await Article.findOne().sort({ publishedAt: -1 });
        if (latestArticle) {
            latestArticle.isHighlighted = true;
            await latestArticle.save();
        }

        res.json({ message: `Fetched and saved ${newArticlesCount} new articles` });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching from external API', error: error.message });
    }
});

// Direct Web Sync — fetches from NewsData.io and returns fresh articles immediately
router.post('/sync', async (req, res) => {
    try {
        const apiKey = 'pub_1f9ede10034f49f3af1f102666f0339f';
        const query = req.body.query || 'war OR conflict OR airstrike OR frontline OR military OR shelling';
        const url = `https://newsdata.io/api/1/latest?apikey=${apiKey}&q=${encodeURIComponent(query)}&language=en`;

        console.log('[SYNC] Fetching live from NewsData.io...');
        const response = await axios.get(url, { timeout: 10000 });
        const results = response.data.results || [];

        const FALLBACK_IMAGES = [
            "https://images.unsplash.com/photo-1596720426673-e4e14290f0cc?w=1200&q=80",
            "https://images.unsplash.com/photo-1579822239403-9dcd615d0452?w=1200&q=80",
            "https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?w=1200&q=80",
            "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1200&q=80"
        ];
        const getRandomFallback = () => FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];

        let newCount = 0;
        for (const item of results) {
            if (!item.title || !item.link) continue;
            const sanitizedUrl = item.link.split('?')[0];
            const cleanTitle = item.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 60);

            const existing = await Article.findOne({
                $or: [{ url: sanitizedUrl }, { url: item.link }, { title: { $regex: new RegExp('^' + cleanTitle, 'i') } }]
            });

            if (!existing) {
                // Correctly parse NewsData.io 'YYYY-MM-DD HH:MM:SS' UTC format
                let pubDate = new Date();
                if (item.pubDate) {
                    pubDate = new Date(item.pubDate.replace(' ', 'T') + 'Z');
                    if (isNaN(pubDate.getTime())) pubDate = new Date();
                }
                await new Article({
                    title: item.title,
                    description: item.description || item.title,
                    content: item.content || item.description || item.title,
                    url: sanitizedUrl,
                    imageUrl: item.image_url || getRandomFallback(),
                    source: item.source_id || 'Global Intel',
                    publishedAt: pubDate,
                    isHighlighted: false
                }).save();
                newCount++;
            }
        }

        // Highlight the most recent article
        if (newCount > 0) {
            await Article.updateMany({}, { isHighlighted: false });
            const latest = await Article.findOne().sort({ publishedAt: -1 });
            if (latest) { latest.isHighlighted = true; await latest.save(); }
        }

        // Return fresh articles immediately
        const freshArticles = await Article.find()
            .sort({ publishedAt: -1 })
            .limit(20);

        console.log(`[SYNC] Done — ${newCount} new articles added. Returning ${freshArticles.length} articles.`);

        res.json({
            success: true,
            newArticles: newCount,
            articles: freshArticles,
            totalPages: 1,
            currentPage: 1,
            totalArticles: await Article.countDocuments()
        });

    } catch (error) {
        console.warn('[SYNC] External fetch failed (likely rate-limited):', error.message);

        // Fallback: return existing articles from DB so the UI stays populated
        try {
            const fallbackArticles = await Article.find().sort({ publishedAt: -1 }).limit(20);
            res.status(200).json({
                success: false,
                isRateLimited: error.response?.status === 429,
                message: 'Satellite link congested. Serving cached tactical data.',
                newArticles: 0,
                articles: fallbackArticles,
                totalPages: 1,
                currentPage: 1
            });
        } catch (dbErr) {
            console.error('[SYNC] Database fallback failed:', dbErr.message);
            res.status(500).json({ success: false, error: 'Tactical database unreachable' });
        }
    }
});

// Live Search — queries NewsData.io directly AND local DB, merges and deduplicates results
router.get('/search', async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        if (!q || !q.trim()) return res.status(400).json({ message: 'Query required' });

        const apiKey = 'pub_1f9ede10034f49f3af1f102666f0339f';
        const FALLBACK_IMAGES = [
            'https://images.unsplash.com/photo-1596720426673-e4e14290f0cc?w=1200&q=80',
            'https://images.unsplash.com/photo-1579822239403-9dcd615d0452?w=1200&q=80',
        ];
        const getRandomFallback = () => FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];

        // Fetch live from NewsData.io AND search local DB in parallel
        const [liveRes, dbResults] = await Promise.allSettled([
            axios.get(`https://newsdata.io/api/1/latest?apikey=${apiKey}&q=${encodeURIComponent(q)}&language=en`, { timeout: 8000 }),
            Article.find(
                { $text: { $search: q } },
                { score: { $meta: "textScore" } }
            ).sort({ score: { $meta: "textScore" }, publishedAt: -1 }).limit(parseInt(limit))
        ]);

        // Process live results
        const liveArticles = [];
        if (liveRes.status === 'fulfilled') {
            const results = liveRes.value.data.results || [];
            for (const item of results) {
                if (!item.title || !item.link) continue;
                let pubDate = new Date();
                if (item.pubDate) {
                    pubDate = new Date(item.pubDate.replace(' ', 'T') + 'Z');
                    if (isNaN(pubDate.getTime())) pubDate = new Date();
                }
                // Save to DB for future searches
                const sanitizedUrl = item.link.split('?')[0];
                const exists = await Article.findOne({ $or: [{ url: sanitizedUrl }, { url: item.link }] });
                let savedArticle;
                if (!exists) {
                    savedArticle = await new Article({
                        title: item.title,
                        description: item.description || item.title,
                        content: item.content || item.description || item.title,
                        url: sanitizedUrl,
                        imageUrl: item.image_url || getRandomFallback(),
                        source: item.source_id || 'Global Intel',
                        publishedAt: pubDate,
                        isHighlighted: false
                    }).save();
                } else {
                    savedArticle = exists;
                }
                liveArticles.push(savedArticle);
            }
        }

        // Merge live + DB, deduplicate by URL
        const dbArticles = dbResults.status === 'fulfilled' ? dbResults.value : [];
        const seen = new Set();
        const merged = [...liveArticles, ...dbArticles].filter(a => {
            if (seen.has(a.url)) return false;
            seen.add(a.url);
            return true;
        }).sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt)).slice(0, parseInt(limit));

        res.json({
            articles: merged,
            totalPages: 1,
            currentPage: 1,
            totalArticles: merged.length,
            source: liveRes.status === 'fulfilled' ? 'live+db' : 'db_only'
        });

    } catch (error) {
        console.error('[SEARCH] Error:', error.message);
        res.status(500).json({ message: 'Search failed', error: error.message });
    }
});

module.exports = router;
