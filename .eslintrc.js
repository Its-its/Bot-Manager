module.exports = {
	root: true,
	env: {
		browser: true,
		node: true
	},
	parser: '@typescript-eslint/parser',
	plugins: [
	  '@typescript-eslint',
	],
	extends: [
	  'eslint:recommended',
	  'plugin:@typescript-eslint/recommended'
	],
	rules: {
		// "require-await": 2,
		"no-return-await": 2,
		"no-unused-vars": 1,
		"prefer-const": 0,
		"@typescript-eslint/ban-ts-comment": 0,
		"@typescript-eslint/explicit-module-boundary-types": 0,
		"@typescript-eslint/no-non-null-assertion": 0
	}
  };