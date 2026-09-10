process.env.BETTER_AUTH_SECRET = 'test_secret_that_is_at_least_32_characters_long';
process.env.SENTRY_DSN = 'https://public@sentry.example.com/1';

// Prevent mongodb-memory-server from running into race conditions
process.env.MONGOMS_DISABLE_POSTINSTALL = '1';
process.env.MONGOMS_SYSTEM_BINARY = '';
process.env.MONGOMS_PREFER_GLOBAL_PATH = '1';
