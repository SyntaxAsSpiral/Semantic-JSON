import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

// Custom rule to prevent non-ASCII characters
const noNonAsciiRule = {
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow non-ASCII characters in code and comments',
			category: 'Possible Errors',
		},
		schema: [],
		messages: {
			nonAsciiChar: 'Non-ASCII character found: "{{char}}" (use ASCII equivalent)',
		},
	},
	create(context) {
		return {
			Program(node) {
				const sourceCode = context.getSourceCode();
				const text = sourceCode.getText();
				
				for (let i = 0; i < text.length; i++) {
					const char = text[i];
					const charCode = char.charCodeAt(0);
					
					// Check for non-ASCII characters (outside 0-127 range)
					if (charCode > 127) {
						const loc = sourceCode.getLocFromIndex(i);
						context.report({
							loc,
							messageId: 'nonAsciiChar',
							data: { char },
						});
					}
				}
			},
		};
	},
};

export default tseslint.config(
	// Use Obsidian's recommended configuration
	...obsidianmd.configs.recommended,
	{
		files: ["**/*.ts"],
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	{
		files: ["**/*.mjs", "**/*.js"],
		languageOptions: {
			globals: {
				...globals.node,
			},
			ecmaVersion: 2022,
			sourceType: "module",
		},
		rules: {
			// Basic JavaScript linting rules
			"no-unused-vars": "error",
			"no-undef": "error",
			"no-unreachable": "error",
			"no-dupe-keys": "error",
			"no-duplicate-case": "error",
			"no-empty": "error",
			"no-extra-semi": "error",
			"no-func-assign": "error",
			"no-invalid-regexp": "error",
			"no-irregular-whitespace": "error",
			"no-obj-calls": "error",
			"no-sparse-arrays": "error",
			"no-unexpected-multiline": "error",
			"use-isnan": "error",
			"valid-typeof": "error",
		},
	},
	...tseslint.configs.recommended,
	{
		files: ["src/**/*.ts"],
		plugins: {
			custom: {
				rules: {
					'no-non-ascii': noNonAsciiRule,
				},
			},
		},
		rules: {
			// Custom rule to prevent non-ASCII characters (emojis, special symbols)
			"custom/no-non-ascii": "error",
			// Override specific Obsidian rules if needed
			"obsidianmd/ui/sentence-case": "warn",
			// Relax some strict TypeScript rules for plugin development
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-base-to-string": "off",
			// Allow only specific console methods (warn, error, debug)
			"no-console": ["error", { "allow": ["warn", "error", "debug"] }],
		},
	},
	{
		ignores: [
			"node_modules/**",
			"dist/**",
			"esbuild.config.mjs",
			"eslint.config.js",
			"main.js",
		],
	},
);
