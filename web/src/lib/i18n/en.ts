export const en = {
  // Header
  'header.logo': 'YoYOapi',
  'header.login': 'Login',
  'header.register': 'Register',
  'header.dashboard': 'Dashboard',
  'header.admin': 'Admin',
  'header.logout': 'Logout',

  // Home
  'home.title': 'YoYOapi',
  'home.subtitle': 'OpenAI / Anthropic / Gemini \u2014 Unified API Relay',
  'home.cta.getStarted': 'Get Started',
  'home.cta.signIn': 'Sign In',
  'home.feature1.title': 'Multi-Format Support',
  'home.feature1.desc': 'OpenAI to Anthropic / Gemini format auto-conversion, one codebase for all models.',
  'home.feature2.title': 'Email Login',
  'home.feature2.desc': 'Simple email verification code login, no phone number required.',
  'home.feature3.title': 'QQ Binding',
  'home.feature3.desc': 'Bind QQ account for security and anti-abuse protection.',

  // Auth - common
  'auth.email': 'Email',
  'auth.emailPlaceholder': 'you@example.com',
  'auth.password': 'Password',
  'auth.passwordPlaceholder': 'At least 6 characters',
  'auth.code': 'Verification Code',
  'auth.codePlaceholder': '123456',
  'auth.sendCode': 'Send Verification Code',
  'auth.sendResetCode': 'Send Reset Code',
  'auth.sending': 'Sending...',
  'auth.codeSent': 'Verification code sent to {email}',
  'auth.resend': 'Resend code',
  'auth.resendIn': 'Resend code in {s}s',
  'auth.or': 'or',

  // Login
  'login.title': 'Sign In',
  'login.button': 'Sign In',
  'login.loading': 'Signing in...',
  'login.forgot': 'Forgot password?',
  'login.noAccount': "Don't have an account?",
  'login.register': 'Register',

  // Register
  'register.title': 'Create Account',
  'register.button': 'Create Account',
  'register.creating': 'Creating...',
  'register.haveAccount': 'Already have an account?',
  'register.signIn': 'Sign In',

  // Reset Password
  'reset.title': 'Reset Password',
  'reset.newPassword': 'New Password',
  'reset.button': 'Reset Password',
  'reset.resetting': 'Resetting...',
  'reset.rememberPassword': 'Remember your password?',
  'reset.signIn': 'Sign In',

  // Dashboard
  'dashboard.title': 'Dashboard',
  'dashboard.tab.profile': 'Profile',
  'dashboard.tab.apiKeys': 'API Keys',
  'dashboard.tab.settings': 'Settings',

  // Dashboard - Profile
  'profile.email': 'Email',
  'profile.displayName': 'Display Name',
  'profile.role': 'Role',
  'profile.admin': 'Admin',
  'profile.user': 'User',
  'profile.quota': 'Quota Used',
  'profile.quotaValue': '{used} / {total}',
  'profile.qqBind': 'QQ Bind',
  'profile.qqBound': 'Bound ({id})',
  'profile.qqNotBound': 'Not bound',

  // Dashboard - API Keys
  'apikeys.create': 'Create',
  'apikeys.name': 'Name',
  'apikeys.namePlaceholder': 'Key name (optional)',
  'apikeys.key': 'Key',
  'apikeys.status': 'Status',
  'apikeys.lastUsed': 'Last Used',
  'apikeys.never': 'Never',
  'apikeys.active': 'Active',
  'apikeys.disabled': 'Disabled',
  'apikeys.delete': 'Delete',
  'apikeys.noKeys': 'No API keys yet. Create one above.',
  'apikeys.dash': '\u2014',
  'apikeys.created': 'API Key Created',
  'apikeys.createdHint': 'Copy this key now. You won\'t be able to see it again.',
  'apikeys.copy': 'Copy',
  'apikeys.copied': 'Copied!',
  'apikeys.dismiss': 'Done',

  // Dashboard - Settings / QQ Bind
  'qq.bind': 'Bind QQ',
  'qq.unbind': 'Unbind',
  'qq.confirm': 'Confirm Bind',
  'qq.loading': 'Loading...',
  'qq.unbinding': 'Unbinding...',
  'qq.confirming': 'Confirming...',
  'qq.sendCode': 'Send this code to the QQ bot',
  'qq.expiresIn': 'Expires in {s} seconds',
  'qq.description': 'Bind your QQ account for additional security.',
  'qq.bound': 'QQ Bound',
  'qq.boundSuccess': 'QQ bound successfully',
  'qq.unboundSuccess': 'QQ unbound successfully',

  // Admin
  'admin.title': 'Admin Panel',
  'admin.tab.users': 'Users',
  'admin.tab.channels': 'Channels',
  'admin.tab.logs': 'Logs',
  'admin.tab.stats': 'Stats',
  'admin.accessDenied': 'Access Denied',
  'admin.accessDenied.desc': 'You do not have admin privileges.',

  // Admin - Users
  'users.id': 'ID',
  'users.email': 'Email',
  'users.displayName': 'Display Name',
  'users.role': 'Role',
  'users.quota': 'Quota',
  'users.qqId': 'QQ ID',
  'users.actions': 'Actions',
  'users.edit': 'Edit',
  'users.delete': 'Delete',
  'users.editTitle': 'Edit User #{id}',
  'users.dash': '\u2014',
  'users.confirmDelete': 'Are you sure you want to delete this user?',
  'users.noUsers': 'No users found.',
  'users.prev': 'Previous',
  'users.next': 'Next',
  'users.page': 'Page {current} of {total}',

  // Admin - Channels
  'channels.name': 'Name',
  'channels.type': 'Type',
  'channels.baseUrl': 'Base URL',
  'channels.models': 'Models',
  'channels.status': 'Status',
  'channels.priority': 'Priority',
  'channels.actions': 'Actions',
  'channels.edit': 'Edit',
  'channels.delete': 'Delete',
  'channels.create': 'Create Channel',
  'channels.createTitle': 'Create Channel',
  'channels.editTitle': 'Edit Channel #{id}',
  'channels.apiKey': 'API Key',
  'channels.modelsPlaceholder': 'Comma-separated model names',
  'channels.active': 'Active',
  'channels.disabled': 'Disabled',
  'channels.confirmDelete': 'Are you sure you want to delete this channel?',
  'channels.noChannels': 'No channels found.',
  'channels.cancel': 'Cancel',
  'channels.save': 'Save',
  'channels.saving': 'Saving...',

  // Admin - Logs
  'logs.id': 'ID',
  'logs.userId': 'User ID',
  'logs.model': 'Model',
  'logs.promptTokens': 'Prompt Tokens',
  'logs.completionTokens': 'Completion Tokens',
  'logs.cost': 'Cost',
  'logs.timestamp': 'Timestamp',
  'logs.filter': 'Filter',
  'logs.filterPlaceholder': 'Filter by user ID',
  'logs.prev': 'Previous',
  'logs.next': 'Next',
  'logs.page': 'Page {current} of {total}',
  'logs.noLogs': 'No logs found.',

  // Admin - Stats
  'stats.totalUsers': 'Total Users',
  'stats.todayUsage': "Today's Usage",

  // 404
  'notFound.title': 'Page Not Found',
  'notFound.status': '404',
  'notFound.desc': "The page you're looking for doesn't exist.",
  'notFound.goHome': 'Go Home',

  // Loading / Error
  'loading': 'Loading...',
  'error.default': 'An error occurred. Please try again.',
  'accessDenied': 'Access Denied',
  'accessDenied.desc': 'You do not have permission to access this page.',

  // Language
  'lang.switch': 'Language',
  'lang.zh': '中文',
  'lang.en': 'English',
} as const

export type TranslationKey = keyof typeof en
