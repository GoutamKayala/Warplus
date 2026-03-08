const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  content: {
    type: String,
  },
  url: {
    type: String,
    required: true,
    unique: true,
  },
  imageUrl: {
    type: String,
  },
  source: {
    type: String,
    default: 'External',
  },
  publishedAt: {
    type: Date,
    default: Date.now,
  },
  isHighlighted: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });

// Add text index for optimized searching
articleSchema.index({
  title: 'text',
  description: 'text',
  content: 'text'
}, {
  weights: {
    title: 10,
    description: 5,
    content: 1
  },
  name: "ArticleTextIndex"
});

module.exports = mongoose.model('Article', articleSchema);
