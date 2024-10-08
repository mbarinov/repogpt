/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        // Add these lines to exclude .node files from being processed by webpack
        config.module.rules.push({
            test: /\.node$/,
            use: 'node-loader',
        });

        // Ensure native modules are treated as external
        config.externals = [...(config.externals || []), /onnxruntime-node/];

        return config;
    },
    experimental: {
        turbo: {
            rules: {
                '*.node': {
                    loaders: ['node-loader'],
                }
            }
        }
    }
};

export default nextConfig;
