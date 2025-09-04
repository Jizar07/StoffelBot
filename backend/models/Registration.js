// Registration Configuration and User Registration Models
// Based on enterprise-grade architecture from reference system

class RegistrationConfig {
  constructor() {
    this.formId = 'registration_form';
    this.functions = [];
    this.settings = {
      oneTimeOnly: true,
      requiresVerification: false,
      welcomeMessage: 'Welcome to our server!',
      channelId: null,
      embedColor: '#0099FF',
      serverIP: null,
      serverPort: null
    };
    this.command = {
      name: 'register-setup',
      description: 'Deploy the registration form to a channel',
      permissions: 'Administrator'
    };
    this.formDisplay = {
      title: '📝 Server Registration',
      description: 'Welcome to our server! Please complete the registration process to gain access.',
      footerText: 'Registration System',
      embedColor: '#0099FF',
      button: {
        text: 'Register',
        emoji: '📝',
        style: 'Primary'
      }
    };
    this.steps = {
      step1: {
        modalTitle: 'Registration - Step 1/3',
        nameLabel: 'Full Name',
        namePlaceholder: 'Enter your full name',
        identifierLabel: 'Unique ID',
        identifierPlaceholder: 'Enter your unique identifier'
      },
      step2: {
        embedTitle: 'Step 2/3 - Select Your Role',
        embedDescription: 'Please select your role/function:',
        dropdownPlaceholder: 'Select your role'
      },
      step3: {
        embedTitle: 'Step 3/3 - Who invited you?',
        embedDescription: 'Select who invited you to the server:\n\n✨ **Type to search** - Start typing to find members quickly!',
        dropdownPlaceholder: 'Select who invited you'
      }
    };
    this.postRegistration = {
      nicknameFormat: '{name}',
      sendDM: true,
      dmTitle: 'Welcome!',
      dmMessage: 'Hello {name},\n\nYour registration as **{functionName}** has been approved!\n\nYou now have access to your role-specific channels.',
      assignRoles: true,
      welcomeChannelMessage: false,
      createChannel: false,
      channelNameFormat: '{name}',
      channelPrefix: '',
      channelPostfix: '',
      channelWelcomeMessage: 'Welcome to your personal channel!',
      channelCategoryId: null,
      channelCategoryName: null
    };
    this.messages = {
      alreadyRegistered: '❌ You are already registered!',
      sessionExpired: '❌ Registration session expired. Please start again.',
      registrationSuccess: '✅ Registration completed successfully!',
      errorGeneric: '❌ An error occurred. Please try again.',
      permissionDenied: '❌ You do not have permission to use this.'
    };
  }
}

class RegistrationFunction {
  constructor(data = {}) {
    this.id = data.id || '';
    this.displayName = data.displayName || '';
    this.discordRoleId = data.discordRoleId || '';
    this.discordRoleName = data.discordRoleName || '';
    this.description = data.description || '';
    this.order = data.order || 0;
    this.active = data.active !== undefined ? data.active : true;
    this.categoryId = data.categoryId || null;
    this.categoryName = data.categoryName || null;
    this.channelEmojiPrefix = data.channelEmojiPrefix || null;
    this.channelPermissions = data.channelPermissions || {
      channelTopic: '',
      allowedRoles: []
    };
  }
}

class UserRegistration {
  constructor(data = {}) {
    this.userId = data.userId || ''; // Discord user ID
    this.username = data.username || ''; // Discord username
    this.name = data.name || ''; // Full name provided
    this.identifier = data.identifier || ''; // Unique identifier (pombo, etc)
    this.functionId = data.functionId || '';
    this.functionName = data.functionName || '';
    this.invitedBy = data.invitedBy || '';
    this.invitedById = data.invitedById || '';
    this.approved = data.approved !== undefined ? data.approved : true;
    this.approvedBy = data.approvedBy || null;
    this.approvedAt = data.approvedAt || null;
    this.deniedReason = data.deniedReason || null;
    this.registeredAt = data.registeredAt || new Date().toISOString();
    this.metadata = data.metadata || {
      discordAvatar: null,
      discordDiscriminator: null,
      assignedRoles: [],
      createdChannel: null
    };
  }
}

module.exports = {
  RegistrationConfig,
  RegistrationFunction,
  UserRegistration
};