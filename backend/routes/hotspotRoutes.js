const express = require('express');
const router = express.Router();
const Article = require('../models/Article');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.Gemini_API_key;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || 'fake-key');

// Rich static fallback hotspots based on known ongoing conflicts
const STATIC_FALLBACK = [
    {
        name: "Gaza City",
        country: "Palestine",
        position: [31.5, 34.47],
        severity: "in_war",
        description: "Active urban combat. Sustained aerial bombardment and ground operations causing severe civilian casualties and infrastructure collapse."
    },
    {
        name: "Kherson",
        country: "Ukraine",
        position: [46.64, 32.61],
        severity: "in_war",
        description: "Frontline combat zone. Daily shelling and counter-offensives along the Dnipro River line."
    },
    {
        name: "Kharkiv",
        country: "Ukraine",
        position: [49.99, 36.23],
        severity: "highly",
        description: "Highly affected by persistent missile and drone attacks targeting civilian infrastructure and energy facilities."
    },
    {
        name: "Rafah",
        country: "Palestine",
        position: [31.28, 34.25],
        severity: "highly",
        description: "Major displacement camp under siege conditions. Critical humanitarian crisis with limited aid access."
    },
    {
        name: "Kyiv",
        country: "Ukraine",
        position: [50.45, 30.52],
        severity: "moderate",
        description: "Continues to face drone and missile strikes on critical infrastructure despite strong air defenses."
    },
    {
        name: "Port Sudan",
        country: "Sudan",
        position: [19.61, 37.22],
        severity: "moderate",
        description: "Targeted by drone attacks in ongoing RSF vs SAF conflict. Significant humanitarian displacement."
    },
    {
        name: "Moscow",
        country: "Russia",
        position: [55.75, 37.62],
        severity: "participating",
        description: "Command and logistics hub for the Ukraine theater. Key military procurement and decision-making center."
    },
    {
        name: "Tehran",
        country: "Iran",
        position: [35.69, 51.39],
        severity: "participating",
        description: "Providing drone and ballistic missile support to allied factions across the Middle East."
    },
    {
        name: "Zaporizhzhia",
        country: "Ukraine",
        position: [47.84, 35.14],
        severity: "highly",
        description: "Nuclear power plant area under conflict zone threat. Heavy military presence and shelling near critical infrastructure."
    },
    {
        name: "Beirut",
        country: "Lebanon",
        position: [33.88, 35.49],
        severity: "moderate",
        description: "Recovering from recent conflict but remains in a heightened state of alert due to regional tensions."
    },
    {
        name: "Tel Aviv",
        country: "Israel",
        position: [32.08, 34.78],
        severity: "participating",
        description: "Active military operations headquarters. Conducting air operations over Gaza and southern Lebanon."
    },
    {
        name: "Khartoum",
        country: "Sudan",
        position: [15.55, 32.53],
        severity: "in_war",
        description: "Urban combat between RSF and SAF. City largely destroyed with catastrophic civilian displacement."
    }
];

const Hotspot = require('../models/Hotspot');

router.get('/', async (req, res) => {
    try {
        // Fetch cached hotspots from background analysis
        const cached = await Hotspot.find().sort({ severity: 1 });

        if (cached && cached.length > 0) {
            // Apply slight random offset to simulate active movement for "Live Tracking"
            const liveHotspots = cached.map(h => {
                const doc = h.toObject ? h.toObject() : h;
                if (!doc.position || !Array.isArray(doc.position) || doc.position.length < 2) {
                    return doc;
                }
                const latOffset = (Math.random() - 0.5) * 0.005; // ~0.5km drift
                const lngOffset = (Math.random() - 0.5) * 0.005;
                return {
                    ...doc,
                    position: [doc.position[0] + latOffset, doc.position[1] + lngOffset]
                };
            });
            console.log(`[Hotspots] Serving ${liveHotspots.length} cached intelligence sectors (Live Traced).`);
            return res.json(liveHotspots);
        }

        // Fallback to static data if no analysis has run yet
        console.log('[Hotspots] Cache empty, providing baseline tactical markers.');
        const liveStatic = STATIC_FALLBACK.map(h => {
            const latOffset = (Math.random() - 0.5) * 0.005;
            const lngOffset = (Math.random() - 0.5) * 0.005;
            return {
                ...h,
                position: [h.position[0] + latOffset, h.position[1] + lngOffset]
            };
        });
        res.json(liveStatic);
    } catch (error) {
        console.warn('[Hotspots] Database unreachable. Serving static baseline:', error.message);

        // Return static data so the frontend map doesn't break
        const liveStatic = STATIC_FALLBACK.map(h => {
            const latOffset = (Math.random() - 0.5) * 0.005;
            const lngOffset = (Math.random() - 0.5) * 0.005;
            return {
                ...h,
                position: [h.position[0] + latOffset, h.position[1] + lngOffset]
            };
        });
        res.status(200).json(liveStatic);
    }
});

// Endpoint to fetch simulated live radar pings that move slightly every second
router.get('/live-radar', async (req, res) => {
    try {
        let baseHotspots = await Hotspot.find();
        if (!baseHotspots || baseHotspots.length === 0) {
            baseHotspots = STATIC_FALLBACK;
        }

        // Generate 1-3 random active "ping" events per second across the active hotspots
        const numEvents = Math.floor(Math.random() * 3) + 1;
        const liveEvents = [];

        for (let i = 0; i < numEvents; i++) {
            // Pick a random hotspot to base the event around
            const hotspot = baseHotspots[Math.floor(Math.random() * baseHotspots.length)];

            if (!hotspot || !hotspot.position || !Array.isArray(hotspot.position) || hotspot.position.length < 2) {
                continue;
            }

            // Random offset: roughly up to ~25km radius (1 degree is ~111km, so 0.22 deg is ~25km)
            const latOffset = (Math.random() - 0.5) * 0.44;
            const lngOffset = (Math.random() - 0.5) * 0.44;

            const eventTypes = ["Drone Activity", "Tactical Movement", "Air Defense Intercept", "Artillery Exchange", "Troop Mobilization"];

            liveEvents.push({
                id: `ping-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                position: [hotspot.position[0] + latOffset, hotspot.position[1] + lngOffset],
                type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
                severity: hotspot.severity, // Inherit severity to color match
                timestamp: Date.now()
            });
        }

        res.json(liveEvents);
    } catch (error) {
        console.error('[Hotspots] Radar error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
