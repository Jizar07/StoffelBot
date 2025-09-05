const fs = require('fs').promises;
const path = require('path');

class StatisticsService {
  constructor() {
    this.statsPath = path.join(__dirname, '../data/moderation-statistics.json');
    this.cacheDuration = 60000; // 1 minute cache
    this.statsCache = new Map();
  }

  // Ensure data directory exists
  async ensureDataDir() {
    const dataDir = path.dirname(this.statsPath);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  // Load statistics from file
  async loadStatistics() {
    try {
      await this.ensureDataDir();
      const data = await fs.readFile(this.statsPath, 'utf8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  // Save statistics to file
  async saveStatistics(stats) {
    await this.ensureDataDir();
    await fs.writeFile(this.statsPath, JSON.stringify(stats, null, 2));
  }

  // Record a moderation action
  async recordAction(guildId, action) {
    const stats = await this.loadStatistics();
    
    if (!stats[guildId]) {
      stats[guildId] = {
        totalActions: 0,
        actionsByType: {},
        actionsByDay: {},
        violationsByType: {},
        userActions: {},
        channelActions: {},
        trends: {
          daily: [],
          weekly: [],
          monthly: []
        },
        lastUpdated: new Date().toISOString()
      };
    }

    const guildStats = stats[guildId];
    const today = new Date().toISOString().split('T')[0];
    
    // Update totals
    guildStats.totalActions++;
    
    // Update action types
    if (!guildStats.actionsByType[action.type]) {
      guildStats.actionsByType[action.type] = 0;
    }
    guildStats.actionsByType[action.type]++;
    
    // Update daily stats
    if (!guildStats.actionsByDay[today]) {
      guildStats.actionsByDay[today] = 0;
    }
    guildStats.actionsByDay[today]++;
    
    // Update violation types
    if (action.violations) {
      action.violations.forEach(violation => {
        if (!guildStats.violationsByType[violation]) {
          guildStats.violationsByType[violation] = 0;
        }
        guildStats.violationsByType[violation]++;
      });
    }
    
    // Update user stats
    if (action.userId) {
      if (!guildStats.userActions[action.userId]) {
        guildStats.userActions[action.userId] = {
          count: 0,
          violations: {},
          actions: {},
          firstAction: new Date().toISOString(),
          lastAction: new Date().toISOString()
        };
      }
      
      const userStats = guildStats.userActions[action.userId];
      userStats.count++;
      userStats.lastAction = new Date().toISOString();
      
      if (!userStats.actions[action.type]) {
        userStats.actions[action.type] = 0;
      }
      userStats.actions[action.type]++;
      
      if (action.violations) {
        action.violations.forEach(violation => {
          if (!userStats.violations[violation]) {
            userStats.violations[violation] = 0;
          }
          userStats.violations[violation]++;
        });
      }
    }
    
    // Update channel stats
    if (action.channelId) {
      if (!guildStats.channelActions[action.channelId]) {
        guildStats.channelActions[action.channelId] = 0;
      }
      guildStats.channelActions[action.channelId]++;
    }
    
    guildStats.lastUpdated = new Date().toISOString();
    
    await this.saveStatistics(stats);
    
    // Clear cache for this guild
    this.statsCache.delete(`guild_${guildId}`);
    
    return guildStats;
  }

  // Get comprehensive statistics for a guild
  async getGuildStatistics(guildId) {
    const cacheKey = `guild_${guildId}`;
    
    // Check cache first
    if (this.statsCache.has(cacheKey)) {
      const cached = this.statsCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheDuration) {
        return cached.data;
      }
    }

    const stats = await this.loadStatistics();
    const guildStats = stats[guildId] || {
      totalActions: 0,
      actionsByType: {},
      actionsByDay: {},
      violationsByType: {},
      userActions: {},
      channelActions: {},
      trends: { daily: [], weekly: [], monthly: [] }
    };

    // Calculate trends
    const enrichedStats = await this.calculateTrends(guildStats);
    
    // Cache the result
    this.statsCache.set(cacheKey, {
      data: enrichedStats,
      timestamp: Date.now()
    });

    return enrichedStats;
  }

  // Calculate trends and analytics
  async calculateTrends(guildStats) {
    const now = new Date();
    const dailyTrend = [];
    const weeklyTrend = [];
    
    // Calculate daily trend (last 30 days)
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      dailyTrend.push({
        date: dateStr,
        actions: guildStats.actionsByDay[dateStr] || 0
      });
    }
    
    // Calculate weekly trend (last 12 weeks)
    for (let i = 11; i >= 0; i--) {
      const startDate = new Date(now);
      startDate.setDate(startDate.getDate() - (i * 7) - 6);
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() - (i * 7));
      
      let weeklyActions = 0;
      for (let j = 0; j < 7; j++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + j);
        const dateStr = date.toISOString().split('T')[0];
        weeklyActions += guildStats.actionsByDay[dateStr] || 0;
      }
      
      weeklyTrend.push({
        weekStart: startDate.toISOString().split('T')[0],
        weekEnd: endDate.toISOString().split('T')[0],
        actions: weeklyActions
      });
    }

    // Calculate top violators (anonymized)
    const topViolators = Object.entries(guildStats.userActions)
      .map(([userId, userStats]) => ({
        userId: userId.substring(0, 4) + '****' + userId.substring(userId.length - 4), // Anonymized
        count: userStats.count,
        mostCommonViolation: this.getMostCommon(userStats.violations),
        lastAction: userStats.lastAction
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate top violation channels
    const topChannels = Object.entries(guildStats.channelActions)
      .map(([channelId, count]) => ({ channelId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate violation severity distribution
    const severityDistribution = this.calculateSeverityDistribution(guildStats.violationsByType);

    return {
      ...guildStats,
      trends: {
        daily: dailyTrend,
        weekly: weeklyTrend
      },
      analytics: {
        topViolators,
        topChannels,
        severityDistribution,
        mostCommonViolation: this.getMostCommon(guildStats.violationsByType),
        mostCommonAction: this.getMostCommon(guildStats.actionsByType),
        averageDailyActions: this.calculateAverageDailyActions(guildStats.actionsByDay),
        violationTrend: this.calculateViolationTrend(dailyTrend)
      }
    };
  }

  // Helper method to get most common item from an object
  getMostCommon(obj) {
    if (!obj || Object.keys(obj).length === 0) return null;
    
    return Object.entries(obj).reduce((a, b) => 
      obj[a[0]] > obj[b[0]] ? a : b
    )[0];
  }

  // Calculate average daily actions
  calculateAverageDailyActions(actionsByDay) {
    const actions = Object.values(actionsByDay);
    if (actions.length === 0) return 0;
    
    const total = actions.reduce((sum, count) => sum + count, 0);
    return Math.round((total / actions.length) * 100) / 100;
  }

  // Calculate violation trend (increasing/decreasing)
  calculateViolationTrend(dailyTrend) {
    if (dailyTrend.length < 2) return 'stable';
    
    const recent = dailyTrend.slice(-7); // Last 7 days
    const previous = dailyTrend.slice(-14, -7); // Previous 7 days
    
    const recentAvg = recent.reduce((sum, day) => sum + day.actions, 0) / recent.length;
    const previousAvg = previous.reduce((sum, day) => sum + day.actions, 0) / previous.length;
    
    const change = ((recentAvg - previousAvg) / (previousAvg || 1)) * 100;
    
    if (change > 20) return 'increasing';
    if (change < -20) return 'decreasing';
    return 'stable';
  }

  // Calculate severity distribution
  calculateSeverityDistribution(violationsByType) {
    const severityMap = {
      'Spam Detection': 'low',
      'Explicit Content Filter': 'medium',
      'Phishing Protection': 'high',
      'Scam Link Detection': 'high',
      'Malicious File Detection': 'critical',
      'AI Toxicity Detection': 'medium',
      'Raid Protection': 'critical'
    };

    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    
    Object.entries(violationsByType).forEach(([violation, count]) => {
      const severity = severityMap[violation] || 'low';
      distribution[severity] += count;
    });

    return distribution;
  }

  // Get statistics summary for dashboard
  async getStatsSummary(guildId) {
    const stats = await this.getGuildStatistics(guildId);
    
    return {
      totalActions: stats.totalActions,
      todayActions: stats.actionsByDay[new Date().toISOString().split('T')[0]] || 0,
      mostCommonViolation: stats.analytics.mostCommonViolation,
      violationTrend: stats.analytics.violationTrend,
      topViolationType: stats.analytics.mostCommonViolation,
      averageDailyActions: stats.analytics.averageDailyActions
    };
  }

  // Record raid protection action
  async recordRaidAction(guildId, userId, reasons, actions) {
    await this.recordAction(guildId, {
      type: 'raid_protection',
      userId: userId,
      violations: ['Raid Protection'],
      reasons: reasons,
      actions: actions,
      timestamp: new Date().toISOString(),
      confidence: 1.0
    });
  }

  // Record message moderation action
  async recordMessageAction(guildId, userId, channelId, violations, actions, confidence) {
    await this.recordAction(guildId, {
      type: 'message_moderation',
      userId: userId,
      channelId: channelId,
      violations: violations,
      actions: actions,
      timestamp: new Date().toISOString(),
      confidence: confidence
    });
  }

  // Get real-time statistics for API endpoints
  async getRealTimeStats(guildId) {
    const stats = await this.getGuildStatistics(guildId);
    const today = new Date().toISOString().split('T')[0];
    
    return {
      // Current day stats
      today: {
        totalActions: stats.actionsByDay[today] || 0,
        violationTypes: stats.violationsByType,
        actionTypes: stats.actionsByType
      },
      
      // Overall stats
      overall: {
        totalActions: stats.totalActions,
        averageDaily: stats.analytics.averageDailyActions,
        trend: stats.analytics.violationTrend
      },
      
      // Charts data
      charts: {
        daily: stats.trends.daily,
        weekly: stats.trends.weekly,
        violations: Object.entries(stats.violationsByType).map(([name, count]) => ({ name, count })),
        actions: Object.entries(stats.actionsByType).map(([name, count]) => ({ name, count }))
      },
      
      // Top lists
      top: {
        violators: stats.analytics.topViolators,
        channels: stats.analytics.topChannels,
        violations: stats.analytics.mostCommonViolation
      }
    };
  }
}

module.exports = StatisticsService;