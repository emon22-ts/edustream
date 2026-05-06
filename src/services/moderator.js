// src/services/moderator.js
// Content moderation with two-tier strategy:
//   1. If Azure AI Content Safety is configured → use the cloud API
//   2. Otherwise → use a local word-list fallback
//
// This dual-path design is deliberate, demonstrating graceful degradation.

const { config } = require('../config');

// Local fallback list — enough to demonstrate the moderation hook in the video.
// In production this would be augmented by the cloud Content Safety service.
const FLAGGED_WORDS = [
  'hate', 'hateful', 'violent', 'violence', 'kill', 'murder',
  'racist', 'racism', 'nazi', 'terrorist', 'bomb',
  'fuck', 'shit', 'bitch', 'asshole', 'cunt'
];

async function moderateText(text) {
  if (!text?.trim()) {
    return { approved: true, reason: 'empty', categories: [] };
  }

  // Tier 1: cloud service if available
  if (config.contentModeratorEndpoint && config.contentModeratorKey) {
    try {
      const url = `${config.contentModeratorEndpoint.replace(/\/$/, '')}/contentsafety/text:analyze?api-version=2024-09-01`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': config.contentModeratorKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text.slice(0, 1000),
          categories: ['Hate', 'SelfHarm', 'Sexual', 'Violence'],
          outputType: 'FourSeverityLevels'
        })
      });

      if (response.ok) {
        const result = await response.json();
        const flagged = (result.categoriesAnalysis || []).filter(c => c.severity >= 4);
        return {
          approved: flagged.length === 0,
          reason: flagged.length ? 'flagged-cloud' : 'safe-cloud',
          categories: flagged.map(c => ({ category: c.category, severity: c.severity })),
          provider: 'azure-content-safety'
        };
      }
      console.warn('[Moderator] Cloud service returned', response.status, '— falling through to fallback');
    } catch (err) {
      console.warn('[Moderator] Cloud service error, falling through to fallback:', err.message);
    }
  }

  // Tier 2: local word-list fallback
  const lower = text.toLowerCase();
  const matched = FLAGGED_WORDS.filter(w => {
    const re = new RegExp(`\\b${w}\\b`, 'i');
    return re.test(lower);
  });

  if (matched.length) {
    return {
      approved: false,
      reason: 'flagged-fallback',
      categories: matched.map(w => ({ category: 'Inappropriate', term: w, severity: 4 })),
      provider: 'local-wordlist'
    };
  }

  return {
    approved: true,
    reason: 'safe-fallback',
    categories: [],
    provider: 'local-wordlist'
  };
}

module.exports = { moderateText };
