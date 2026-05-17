const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
    {
        ignores: ['node_modules/**', '.dist/**', 'legacy/**', '*.config.js', 'eslint.config.cjs'],
    },
    {
        files: ['Dev/src/**/*.ts'],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: 2021,
                sourceType: 'module',
                project: './tsconfig.json',
            },
            globals: {
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                requestAnimationFrame: 'readonly',
                Blob: 'readonly',
                URL: 'readonly',
                Node: 'readonly',
                MutationObserver: 'readonly',
                IntersectionObserver: 'readonly',
                navigator: 'readonly',
                location: 'readonly',
                localStorage: 'readonly',
                GM_setValue: 'readonly',
                GM_getValue: 'readonly',
                GM_deleteValue: 'readonly',
                GM_setClipboard: 'readonly',
                GM_addStyle: 'readonly',
            },
        },
        plugins: { '@typescript-eslint': tsPlugin },
        rules: {
            ...tsPlugin.configs.recommended.rules,
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            'no-console': ['warn', { allow: ['warn', 'error'] }],
        },
    },
    prettierConfig,
];
