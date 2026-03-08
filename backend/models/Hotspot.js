const mongoose = require('mongoose');

const hotspotSchema = new mongoose.Schema({
    name: { type: String, required: true },
    country: { type: String, required: true },
    position: { type: [Number], required: true }, // [lat, lng]
    severity: {
        type: String,
        enum: ['in_war', 'highly', 'moderate', 'low', 'participating', 'stable'],
        default: 'low'
    },
    description: { type: String, required: true },
    affected: { type: String },
    lastUpdated: { type: Date, default: Date.now },
    articleSource: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' }
});

module.exports = mongoose.model('Hotspot', hotspotSchema);
