require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require('openai');
const Article = require('./models/Article');
const Hotspot = require('./models/Hotspot');
const newsRoutes = require('./routes/newsRoutes');
const hotspotRoutes = require('./routes/hotspotRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Render/Local Environment Variable Handling
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.Gemini_API_key;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
    console.warn('CRITICAL: Both GEMINI_API_KEY and OPENAI_API_KEY are missing.');
}

if (!process.env.MONGODB_URI) {
    console.warn('CRITICAL: MONGODB_URI is missing. Falling back to local (will fail on Render).');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || 'fake-key-to-prevent-crash');
const openai = new OpenAI({ apiKey: OPENAI_API_KEY || 'fake-key-to-prevent-crash' });

async function callGemini(prompt) {
    if (!GEMINI_API_KEY) return null;

    // Use the SDK with a targeted model rotation approach
    const models = ['gemini-1.5-flash-8b', 'gemini-1.5-flash', 'gemini-1.0-pro'];
    for (const modelName of models) {
        try {
            console.log(`[GEMINI] Satellite uplink via ${modelName}...`);
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
            });
            const result = await model.generateContent(prompt);
            const text = result.response.text();
            if (text) {
                console.log(`[GEMINI] ✔ Uplink stabilized via ${modelName}`);
                return text;
            }
        } catch (err) {
            console.warn(`[GEMINI] ✘ ${modelName} Failure: ${err.message}`);
            // If it's a true 1.5 region block, try the next model. Most blocks are model-specific.
        }
    }
    return null;
}

async function callOpenAI(prompt) {
    if (!OPENAI_API_KEY) return null;
    try {
        console.log('[OPENAI] Attempting tactical uplink...');
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-4o-mini",
            max_tokens: 1024,
            temperature: 0.7
        });
        const text = completion.choices[0].message.content;
        if (text) {
            console.log('[OPENAI] ✔ Uplink successful');
            return text;
        }
    } catch (err) {
        console.error('[OPENAI] ✘ Failure:', err.message);
    }
    return null;
}


// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: false
}));
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/warnews', {
    serverSelectionTimeoutMS: 15000, // 15s timeout
    socketTimeoutMS: 45000,        // 45s timeout
})
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch((err) => console.error('❌ CRITICAL: MongoDB Connection Error:', err.message));

// Request Logger
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.path}`);
    next();
});

// Set of fallback high-quality war-related images
const FALLBACK_IMAGES = [
    "https://images.unsplash.com/photo-1596720426673-e4e14290f0cc?w=1200&q=80",
    "https://images.unsplash.com/photo-1579822239403-9dcd615d0452?w=1200&q=80",
    "https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?w=1200&q=80",
    "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1200&q=80"
];
const getRandomFallback = () => FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];

// Automated Fetch Function
const fetchLiveNews = async () => {
    try {
        console.log('Fetching live news from NewsData.io...');
        const apiKey = process.env.NEWSDATA_API_KEY || 'pub_1f9ede10034f49f3af1f102666f0339f';
        const url = `https://newsdata.io/api/1/latest?apikey=${apiKey}&q=war%20OR%20conflict%20OR%20airstrike%20OR%20bombardment%20OR%20shelling%20OR%20military%20OR%20frontline%20OR%20siege%20OR%20troop`;

        const response = await axios.get(url);
        const results = response.data.results || [];
        let newItemsCount = 0;

        const WAR_KEYWORDS = /war|conflict|combat|battle|airstrike|bombardment|shelling|military|frontline|siege|troop|missile|army|navy|air force|invasion|offensive|defense/i;

        for (const item of results) {
            let sanitizedUrl = item.link.split('?')[0];
            const contentToCheck = (item.title + " " + (item.description || "")).toLowerCase();

            // Strict Tactical Filter: Discard general news
            if (!WAR_KEYWORDS.test(contentToCheck)) {
                // console.log(`[SYNC] Skipping non-war item: ${item.title}`);
                continue;
            }

            try {
                await Article.findOneAndUpdate(
                    { url: sanitizedUrl },
                    {
                        $set: {
                            title: item.title,
                            description: item.description || item.title,
                            content: item.content || item.description || item.title,
                            imageUrl: item.image_url || getRandomFallback(),
                            source: item.source_id || 'Global Intel',
                            publishedAt: item.pubDate ? new Date(item.pubDate.replace(' ', 'T') + 'Z') : new Date()
                        }
                    },
                    { upsert: true, new: true }
                );
                newItemsCount++;
            } catch (err) {
                if (err.code !== 11000) console.error('[SYNC] Article upsert failed:', err.message);
            }
        }

        if (newItemsCount > 0) {
            await Article.updateMany({}, { isHighlighted: false });
            const latestArticle = await Article.findOne().sort({ publishedAt: -1 });
            if (latestArticle) {
                latestArticle.isHighlighted = true;
                await latestArticle.save();
            }
        }
        console.log(`[SYNC] Live news update completed. Added ${newItemsCount} new articles.`);
    } catch (error) {
        console.error('Error fetching live news:', error.message);
    }
};

// ─── Intelligence Analysis Engine ───
const runIntelAnalysis = async () => {
    try {
        console.log('[INTEL] Commencing strategic news analysis...');

        // Fetch recent conflict-related articles
        const articles = await Article.find({
            $or: [
                { title: { $regex: /war|combat|battle|airstrike|bombardment|shelling|missile|attack|clash|offensive|military|frontline|siege|troop/i } },
                { description: { $regex: /war|combat|battle|airstrike|bombardment|shelling|missile|attack|clash|offensive|military|frontline|siege|troop/i } }
            ]
        })
            .sort({ publishedAt: -1 })
            .limit(30);

        if (!articles.length) {
            console.log('[INTEL] No viable intelligence found in recent reports.');
            return;
        }

        const newsText = articles.map(a => `Source: ${a.source}\nTitle: ${a.title}\nDesc: ${a.description}`).join('\n\n');

        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash"
        });
        const intelPrompt = `
            System: You are a High-Level War Intelligence & Geopolitical Strategic Assistant for WarPulse. Your tone is professional, authoritative, and precise.

            Analyze these reports and extract active conflict hotspots.
            Return a JSON array of objects with:
            {
              "name": "Specific City/Region",
              "country": "Country",
              "position": [lat, lng],
              "severity": "in_war" | "highly" | "moderate" | "low" | "participating",
              "description": "Tactical summary: [What happened]",
              "affected": "Specific infrastructure or assets affected (e.g., 'Power Grid', 'Residential Block', 'Port', 'Airbase')"
            }
            Reports:
            ${newsText}

            Return ONLY the valid JSON array.
        `;

        const result = await model.generateContent(intelPrompt);
        let text = result.response.text();
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const hotspotsData = JSON.parse(text);

        if (Array.isArray(hotspotsData) && hotspotsData.length > 0) {
            await Hotspot.deleteMany({});
            await Hotspot.insertMany(hotspotsData.map(h => ({ ...h, lastUpdated: new Date() })));
            console.log(`[INTEL] Strategic map updated with ${hotspotsData.length} active sectors.`);
        }
    } catch (error) {
        console.error('[INTEL] Analysis interrupted:', error.message);
        // Fallback: if cache is empty, prime with baseline
        try {
            const count = await Hotspot.countDocuments();
            if (count === 0) {
                console.log('[INTEL] Prime cache with baseline markers.');
                const baseline = [
                    { name: "Gaza City", country: "Palestine", position: [31.5, 34.47], severity: "in_war", description: "Urban combat intensive. Structural damage in northern sectors.", affected: "Civilian Infrastructure" },
                    { name: "Tel Aviv", country: "Israel", position: [32.08, 34.78], severity: "in_war", description: "Active interception of aerial threats; continuous high-alert status.", affected: "Air Defense Systems, Urban Centers" },
                    { name: "Tehran", country: "Iran", position: [35.68, 51.38], severity: "participating", description: "Strategic mobilization; logistical support for regional operations.", affected: "Command Centers, Logistics" },
                    { name: "Brussels", country: "NATO (Belgium)", position: [50.85, 4.35], severity: "participating", description: "Coordination of defensive aid and strategic oversight for eastern flanks.", affected: "Strategic Planning Hubs" },
                    { name: "Washington D.C.", country: "USA", position: [38.90, -77.03], severity: "participating", description: "Deployment of naval carrier groups and strategic military assistance.", affected: "Naval Assets, Financial Channels" },
                    { name: "Taipei", country: "Taiwan", position: [25.03, 121.56], severity: "participating", description: "Heightened defensive mobilization in response to regional naval activity.", affected: "Early Warning Systems" },
                    { name: "Kharkiv", country: "Ukraine", position: [49.99, 36.23], severity: "highly", description: "Frequent missile and drone strikes targeting strategic logistics hubs.", affected: "Energy Grid, Logistics" },
                    { name: "Beijing", country: "China", position: [39.90, 116.40], severity: "moderate", description: "Large-scale naval exercises and strategic positioning in South China Sea.", affected: "Naval Ports, Satellites" }
                ];
                await Hotspot.insertMany(baseline.map(h => ({ ...h, lastUpdated: new Date() })));
            }
        } catch (dbErr) {
            console.error('[INTEL] Baseline prime failed: Database remains unreachable.');
        }
    }
};

// Start Cycles
cron.schedule('*/10 * * * *', fetchLiveNews); // Fetch news every 10 min
// Intelligence analysis is now manual or very infrequent to preserve free tier quota
// cron.schedule('0 * * * *', runIntelAnalysis); 


// Initial news fetch
setTimeout(fetchLiveNews, 30000);
// Skip runIntelAnalysis on startup entirely to prioritize chat quota

// API Routes
app.use('/api/news', newsRoutes);
app.use('/api/hotspots', hotspotRoutes);

// In-memory query tracker (session-based, resets on refresh)
const userSessions = new Map();

app.post('/api/chat', async (req, res) => {
    const { message, sessionId } = req.body;
    const trackerId = sessionId || req.ip;

    // Check Query Limit (10 per session/refresh)
    let session = userSessions.get(trackerId) || { count: 0 };
    if (session.count >= 10) {
        return res.json({
            limitReached: true,
            reply: "⚠️ **TACTICAL LIMIT REACHED**\n\nCommander, your 10 free reconnaissance queries have been used. Please **reload the page** to re-establish satellite access."
        });
    }

    session.count++;
    userSessions.set(trackerId, session);
    const remaining = 10 - session.count;
    console.log(`[CHAT] Session ${trackerId.slice(-6)} | Query ${session.count}/10`);

    try {
        // Fetch live context from DB for grounding the AI
        const latestNews = await Article.find().sort({ publishedAt: -1 }).limit(5);
        const activeHotspots = await Hotspot.find().limit(5);
        const sitRep = latestNews.map(n => `• ${n.title}`).join('\n');
        const mapSectors = activeHotspots.map(h => `${h.name} (${h.severity})`).join(', ');

        const prompt = `You are WarPulse, a military intelligence AI assistant. Be concise, authoritative, and tactical.

CURRENT WAR INTELLIGENCE CONTEXT:
Latest Headlines:
${sitRep}

Active Conflict Sectors: ${mapSectors}

USER QUERY: ${message}

Provide a brief, direct tactical response based on the above intelligence. Keep it under 500 words.`;

        // Priority 1: Gemini (User's request to use "my" API)
        let aiReply = await callGemini(prompt);

        // Priority 2: OpenAI (If Gemini fails and key is provided)
        if (!aiReply && OPENAI_API_KEY) {
            console.warn('[CHAT] Gemini failed. Attempting OpenAI backup...');
            aiReply = await callOpenAI(prompt);
        }

        if (aiReply) {
            return res.json({ reply: aiReply, queriesRemaining: remaining });
        }

        // Fallback: High-Fidelity Tactical Narrative Generator
        const keywords = (message.toLowerCase().match(/\b(\w{4,})\b/g) || []);
        let poolNews = await Article.find().sort({ publishedAt: -1 }).limit(20);
        let matched = poolNews.filter(n =>
            keywords.some(k => (n.title + (n.description || '')).toLowerCase().includes(k))
        );

        // Build a sophisticated "Synthetic Intel" report
        let intelSource = matched.length > 0 ? matched : poolNews.slice(0, 5);
        let sector = activeHotspots.length > 0 ? activeHotspots[Math.floor(Math.random() * activeHotspots.length)] : null;

        let report = `🛰️ **STRATEGIC INTELLIGENCE UPDATE [UPLINK: SECURE-LOCAL]**\n\n`;
        report += `Commander, direct satellite uplink via Gemini is currently restricted in this sector. However, local tactical processing is ACTIVE.\n\n`;

        report += `**SITUATIONAL AWARENESS:**\n`;
        if (sector) {
            report += `Currently monitoring active sector: **${sector.name} (${sector.country})**. Status: *${sector.severity.toUpperCase()} ALERT*. ${sector.description}\n\n`;
        }

        report += `**LATEST RECONNAISSANCE:**\n`;
        report += intelSource.slice(0, 3).map(n => `• **[SIGINT: ${n.source.toUpperCase()}]** ${n.title}`).join('\n');

        report += `\n\n**TACTICAL ASSESSMENT:**\n`;
        const templates = [
            "Frontline stability is currently variable across multiple sectors. Logistical mobilization continues as regional entities reposition assets.",
            "Satellite telemetry indicates active troop movements and infrastructure reinforcement. Combat intensity remains high in localized hotspots.",
            "Strategic intelligence suggests a transition to defensive posturing in several key sectors, while naval activity remains elevated in regional transit lanes.",
            "Conflict resolution remains stalled as multiple participating entities increase their operational readiness and deployment cycles."
        ];
        report += templates[Math.floor(Math.random() * templates.length)];

        report += `\n\n_System Status: Logic Fallback Active | Queries: ${remaining} Remaining_`;

        res.json({ reply: report, queriesRemaining: remaining });

    } catch (err) {
        console.error('[CHAT] Error:', err.message);
        res.status(500).json({ reply: "Intelligence link disrupted. Please try again." });
    }
});

app.get("/api", (req, res) => {
    res.json({ message: "WarPulse API is online and accepting requests 🚀", status: "ok" });
});

app.get("/", (req, res) => {
    res.send("WarPulse API running 🚀");
});

app.listen(PORT, () => {
    console.log(`WarPulse Server running on port ${PORT}`);
});
