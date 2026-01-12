import tseslint from 'typescript-eslint';
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default tseslint.config(
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
			obsidianmd: obsidianmd,
		},
		rules: {
			// Obsidian-specific rules that help with community plugin review
			"obsidianmd/commands/no-command-in-command-id": "error",
			"obsidianmd/commands/no-command-in-command-name": "error", 
			"obsidianmd/commands/no-plugin-id-in-command-id": "error",
			"obsidianmd/commands/no-plugin-name-in-command-name": "error",
			"obsidianmd/no-sample-code": "error",
			"obsidianmd/validate-manifest": "error",
			"obsidianmd/no-tfile-tfolder-cast": "error",
			"obsidianmd/prefer-file-manager-trash-file": "error",
			"obsidianmd/ui/sentence-case": "warn",
			// Disable the problematic one that was crashing
			"obsidianmd/settings-tab/no-problematic-settings-headings": "off",
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
