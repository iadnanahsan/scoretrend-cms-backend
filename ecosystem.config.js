module.exports = {
	apps: [
		{
			name: "scoretrend-cms-backend",
			script: "dist/index.js",
			instances: 1,
			autorestart: true,
			watch: false,
			max_memory_restart: "1G",
			env: {
				NODE_ENV: "production",
			},
			env_development: {
				NODE_ENV: "development",
			},
		},
	],
}
