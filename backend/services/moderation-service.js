const fs = require('fs').promises;
const path = require('path');

class ModerationService {
  constructor() {
    this.phishingDomains = new Set();
    this.scamPatterns = [];
    this.toxicityCache = new Map();
    this.raidTracker = new Map(); // guildId -> { joins: [], threshold: number }
    
    this.initializeService();
  }

  async initializeService() {
    await this.loadPhishingDomains();
    await this.loadScamPatterns();
  }

  // 🎣 PHISHING PROTECTION
  async loadPhishingDomains() {
    try {
      // Load basic phishing domains (static list)
      const basicPhishingDomains = [
        'discord-nitro.com', 'discordnitro.info', 'discord-app.net', 'discordapp.org',
        'steam-community.com', 'steamcommunlty.com', 'steampowered.org',
        'paypal-secure.com', 'paypal-verification.com', 'amazon-security.com',
        'apple-support.com', 'microsoft-support.com', 'google-security.com',
        'facebook-security.com', 'twitter-security.com', 'instagram-security.com'
      ];
      
      basicPhishingDomains.forEach(domain => this.phishingDomains.add(domain.toLowerCase()));

      // Add known Discord phishing patterns
      const discordPhishingPatterns = [
        'discord-gift.com', 'discord-nitro.com', 'discordapp-gift.com',
        'steam-discord.com', 'discord-steam.com', 'discrod.com',
        'disc0rd.com', 'discordsteam.com', 'discord-app.com',
        'discord-nitro.org', 'discord-nitro.net', 'free-nitro.com',
        'nitro-discord.com', 'steamcommunity-discord.com'
      ];

      discordPhishingPatterns.forEach(domain => this.phishingDomains.add(domain));
      
      console.log(`Loaded ${this.phishingDomains.size} phishing domains`);
    } catch (error) {
      console.error('Error loading phishing domains:', error);
      
      // Fallback to basic Discord phishing domains
      const fallbackDomains = [
        'discord-gift.com', 'discord-nitro.com', 'discordapp-gift.com',
        'discrod.com', 'disc0rd.com', 'free-nitro.com'
      ];
      fallbackDomains.forEach(domain => this.phishingDomains.add(domain));
    }
  }

  async detectPhishing(message) {
    const urlRegex = /https?:\/\/(www\.)?([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    const urls = message.match(urlRegex) || [];
    const results = [];

    for (const url of urls) {
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.toLowerCase();
        
        // Check exact match
        if (this.phishingDomains.has(domain)) {
          results.push({
            url,
            domain,
            type: 'known_phishing',
            confidence: 0.95
          });
          continue;
        }

        // Check for suspicious patterns
        const suspiciousPatterns = [
          /discord.*nitro/i,
          /free.*discord/i,
          /steam.*discord/i,
          /discord.*gift/i,
          /claim.*nitro/i
        ];

        for (const pattern of suspiciousPatterns) {
          if (pattern.test(domain)) {
            results.push({
              url,
              domain,
              type: 'suspicious_pattern',
              confidence: 0.75
            });
            break;
          }
        }

        // Check for domain spoofing (character substitution)
        const legitimateDomains = ['discord.com', 'discord.gg', 'steamcommunity.com'];
        for (const legitDomain of legitimateDomains) {
          const similarity = this.calculateSimilarity(domain, legitDomain);
          if (similarity > 0.8 && domain !== legitDomain) {
            results.push({
              url,
              domain,
              type: 'domain_spoofing',
              confidence: similarity,
              spoofing: legitDomain
            });
            break;
          }
        }

      } catch (error) {
        // Invalid URL, skip
      }
    }

    return results;
  }

  // 💸 SCAM LINK DETECTION
  async loadScamPatterns() {
    this.scamPatterns = [
      // Cryptocurrency scams
      { pattern: /free.*bitcoin/i, type: 'crypto_scam', confidence: 0.9 },
      { pattern: /double.*bitcoin/i, type: 'crypto_scam', confidence: 0.95 },
      { pattern: /ethereum.*giveaway/i, type: 'crypto_scam', confidence: 0.8 },
      { pattern: /crypto.*multiplier/i, type: 'crypto_scam', confidence: 0.85 },
      
      // Investment scams
      { pattern: /guaranteed.*profit/i, type: 'investment_scam', confidence: 0.8 },
      { pattern: /make.*money.*fast/i, type: 'investment_scam', confidence: 0.7 },
      { pattern: /forex.*trading.*bot/i, type: 'investment_scam', confidence: 0.75 },
      
      // Prize/lottery scams
      { pattern: /you.*won.*prize/i, type: 'prize_scam', confidence: 0.85 },
      { pattern: /congratulations.*winner/i, type: 'prize_scam', confidence: 0.8 },
      { pattern: /claim.*reward/i, type: 'prize_scam', confidence: 0.7 },
      
      // Tech support scams
      { pattern: /microsoft.*support/i, type: 'tech_scam', confidence: 0.75 },
      { pattern: /computer.*infected/i, type: 'tech_scam', confidence: 0.8 },
      { pattern: /virus.*detected/i, type: 'tech_scam', confidence: 0.85 },
      
      // Romance scams
      { pattern: /lonely.*looking.*love/i, type: 'romance_scam', confidence: 0.7 },
      { pattern: /send.*money.*family/i, type: 'romance_scam', confidence: 0.8 }
    ];
  }

  async detectScamLinks(message) {
    const results = [];
    
    for (const scamPattern of this.scamPatterns) {
      if (scamPattern.pattern.test(message)) {
        results.push({
          type: scamPattern.type,
          confidence: scamPattern.confidence,
          pattern: scamPattern.pattern.source
        });
      }
    }

    // Check for suspicious financial terms
    const financialTerms = ['investment', 'roi', 'profit', 'trading', 'forex', 'crypto', 'bitcoin'];
    const urgencyTerms = ['limited time', 'act now', 'urgent', 'expires soon'];
    
    const financialMatches = financialTerms.filter(term => 
      new RegExp(term, 'i').test(message)
    ).length;
    
    const urgencyMatches = urgencyTerms.filter(term => 
      new RegExp(term, 'i').test(message)
    ).length;

    if (financialMatches >= 2 && urgencyMatches >= 1) {
      results.push({
        type: 'suspicious_financial',
        confidence: 0.7,
        reason: 'Multiple financial terms with urgency indicators'
      });
    }

    return results;
  }

  // 🦠 MALICIOUS FILE DETECTION
  async detectMaliciousFile(attachment) {
    const results = [];
    const filename = attachment.name.toLowerCase();
    const fileExtension = path.extname(filename);

    // Dangerous file extensions
    const dangerousExtensions = [
      '.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.js', 
      '.jar', '.ps1', '.msi', '.deb', '.rpm', '.dmg', '.pkg', '.app'
    ];

    if (dangerousExtensions.includes(fileExtension)) {
      results.push({
        type: 'dangerous_extension',
        confidence: 0.9,
        extension: fileExtension,
        reason: 'Executable file type detected'
      });
    }

    // Double extensions (common malware technique)
    const doubleExtensions = /\.(txt|pdf|doc|jpg|png)\.(exe|scr|bat|cmd)$/i;
    if (doubleExtensions.test(filename)) {
      results.push({
        type: 'double_extension',
        confidence: 0.95,
        reason: 'Double file extension detected (malware technique)'
      });
    }

    // Suspicious filenames
    const suspiciousNames = [
      /setup.*exe/i, /install.*exe/i, /update.*exe/i, /patch.*exe/i,
      /crack.*exe/i, /keygen.*exe/i, /hack.*exe/i, /cheat.*exe/i,
      /virus.*exe/i, /trojan.*exe/i, /backdoor.*exe/i
    ];

    for (const pattern of suspiciousNames) {
      if (pattern.test(filename)) {
        results.push({
          type: 'suspicious_filename',
          confidence: 0.8,
          pattern: pattern.source,
          reason: 'Suspicious filename pattern'
        });
        break;
      }
    }

    // Check file size (very large or very small executable files are suspicious)
    if (fileExtension === '.exe') {
      if (attachment.size < 1024) { // Less than 1KB
        results.push({
          type: 'suspicious_size',
          confidence: 0.7,
          reason: 'Executable file unusually small'
        });
      } else if (attachment.size > 100 * 1024 * 1024) { // Larger than 100MB
        results.push({
          type: 'suspicious_size',
          confidence: 0.6,
          reason: 'Executable file unusually large'
        });
      }
    }

    return results;
  }

  // 🔞 EXPLICIT CONTENT FILTER
  async detectExplicitContent(message, attachments = []) {
    const results = [];

    // Text-based explicit content detection
    const explicitTerms = [
      // Adult content
      'porn', 'xxx', 'nude', 'naked', 'sex', 'adult', 'mature',
      'nsfw', 'explicit', 'erotic', 'sexual', 'intimate',
      
      // Violence
      'gore', 'blood', 'violence', 'death', 'kill', 'murder',
      'torture', 'brutal', 'graphic'
    ];

    const explicitMatches = explicitTerms.filter(term => 
      new RegExp(`\\b${term}\\b`, 'i').test(message)
    );

    if (explicitMatches.length > 0) {
      results.push({
        type: 'explicit_text',
        confidence: Math.min(0.9, explicitMatches.length * 0.3),
        matches: explicitMatches,
        reason: 'Explicit terms detected in message'
      });
    }

    // Image analysis (basic filename detection)
    for (const attachment of attachments) {
      if (this.isImageFile(attachment.name)) {
        const filename = attachment.name.toLowerCase();
        
        for (const term of explicitTerms) {
          if (filename.includes(term)) {
            results.push({
              type: 'explicit_filename',
              confidence: 0.8,
              filename: attachment.name,
              reason: 'Explicit content suggested by filename'
            });
            break;
          }
        }
      }
    }

    return results;
  }

  // ☢️ AI TOXICITY DETECTION
  async detectToxicity(message) {
    // For now, implement rule-based toxicity detection
    // In production, you'd integrate with services like Perspective API
    
    const results = [];
    const text = message.toLowerCase();

    // Hate speech detection
    const hateSpeechPatterns = [
      { pattern: /kill\s+yourself/i, severity: 'high', type: 'self_harm' },
      { pattern: /kys/i, severity: 'high', type: 'self_harm' },
      { pattern: /go\s+die/i, severity: 'medium', type: 'death_wish' },
      { pattern: /retard|retarded/i, severity: 'medium', type: 'ableism' },
      { pattern: /f[a@]gg?[o0]t/i, severity: 'high', type: 'homophobia' },
      { pattern: /n[i1]gg[e3]r/i, severity: 'high', type: 'racism' }
    ];

    for (const hate of hateSpeechPatterns) {
      if (hate.pattern.test(text)) {
        results.push({
          type: 'hate_speech',
          subtype: hate.type,
          severity: hate.severity,
          confidence: hate.severity === 'high' ? 0.9 : 0.7,
          reason: `${hate.type} detected`
        });
      }
    }

    // Harassment patterns
    const harassmentPatterns = [
      /you\s+(are|r)\s+.*(stupid|dumb|idiot|moron)/i,
      /shut\s+up/i,
      /nobody\s+asked/i,
      /nobody\s+cares/i
    ];

    for (const pattern of harassmentPatterns) {
      if (pattern.test(text)) {
        results.push({
          type: 'harassment',
          confidence: 0.6,
          reason: 'Harassment pattern detected'
        });
        break;
      }
    }

    // Excessive profanity (already handled in basic spam detection)
    const profanityCount = this.countProfanity(message);
    if (profanityCount > 2) {
      results.push({
        type: 'excessive_profanity',
        confidence: Math.min(0.9, profanityCount * 0.2),
        count: profanityCount,
        reason: 'Excessive profanity detected'
      });
    }

    return results;
  }

  // 🛡️ RAID PROTECTION
  async detectRaid(guildId, member) {
    const now = Date.now();
    const timeWindow = 60 * 1000; // 1 minute

    if (!this.raidTracker.has(guildId)) {
      this.raidTracker.set(guildId, { joins: [], threshold: 10 });
    }

    const guildData = this.raidTracker.get(guildId);
    
    // Add new join
    guildData.joins.push({
      userId: member.id,
      timestamp: now,
      accountAge: now - member.user.createdTimestamp
    });

    // Remove old joins outside time window
    guildData.joins = guildData.joins.filter(join => 
      now - join.timestamp < timeWindow
    );

    const recentJoins = guildData.joins.length;
    
    // Analyze join patterns
    const results = [];

    if (recentJoins >= guildData.threshold) {
      // Check for suspicious patterns
      const newAccounts = guildData.joins.filter(join => 
        join.accountAge < 7 * 24 * 60 * 60 * 1000 // Less than 7 days old
      ).length;

      const suspiciousRatio = newAccounts / recentJoins;

      results.push({
        type: 'raid_detected',
        confidence: Math.min(0.95, 0.5 + suspiciousRatio * 0.5),
        joinCount: recentJoins,
        newAccountCount: newAccounts,
        suspiciousRatio: suspiciousRatio,
        threshold: guildData.threshold,
        timeWindow: timeWindow / 1000,
        reason: `${recentJoins} joins in ${timeWindow/1000}s (${newAccountCount} new accounts)`
      });
    }

    return results;
  }

  // Helper methods
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  isImageFile(filename) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const ext = path.extname(filename.toLowerCase());
    return imageExtensions.includes(ext);
  }

  countProfanity(message) {
    const profanityWords = [
      'damn', 'hell', 'shit', 'fuck', 'bitch', 'ass', 'bastard',
      'crap', 'piss', 'whore', 'slut'
    ];
    
    const text = message.toLowerCase();
    return profanityWords.filter(word => 
      new RegExp(`\\b${word}\\b`, 'i').test(text)
    ).length;
  }

  // Main moderation analysis function
  async analyzeMessage(message, attachments = [], guildConfig = {}) {
    const results = {
      isViolation: false,
      confidence: 0,
      violations: [],
      actions: []
    };

    // Run all enabled detection methods
    if (guildConfig.phishingProtection !== false) {
      const phishingResults = await this.detectPhishing(message.content);
      if (phishingResults.length > 0) {
        results.violations.push(...phishingResults);
      }
    }

    if (guildConfig.scamLinkDetection !== false) {
      const scamResults = await this.detectScamLinks(message.content);
      if (scamResults.length > 0) {
        results.violations.push(...scamResults);
      }
    }

    if (guildConfig.maliciousFileDetection !== false && attachments.length > 0) {
      for (const attachment of attachments) {
        const malwareResults = await this.detectMaliciousFile(attachment);
        if (malwareResults.length > 0) {
          results.violations.push(...malwareResults);
        }
      }
    }

    if (guildConfig.explicitContentFilter !== false) {
      const explicitResults = await this.detectExplicitContent(message.content, attachments);
      if (explicitResults.length > 0) {
        results.violations.push(...explicitResults);
      }
    }

    if (guildConfig.toxicityDetection !== false) {
      const toxicityResults = await this.detectToxicity(message.content);
      if (toxicityResults.length > 0) {
        results.violations.push(...toxicityResults);
      }
    }

    // Calculate overall confidence and determine if it's a violation
    if (results.violations.length > 0) {
      const maxConfidence = Math.max(...results.violations.map(v => v.confidence));
      results.confidence = maxConfidence;
      
      const threshold = guildConfig.toxicityThreshold || 70;
      results.isViolation = maxConfidence >= (threshold / 100);
    }

    return results;
  }
}

module.exports = ModerationService;