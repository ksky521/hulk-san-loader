/**
 * @file import style module
 * @author zhangsiyuan(zhangsiyuan@baidu.com)
 */
const path = require('path');
const loaderUtils = require('loader-utils');
const cosmiconfig = require('cosmiconfig');
const requireAlias = require('./require');
const sanLoader = require.resolve('../index');

/* eslint-disable no-unused-vars */
const {resolve, join} = path.posix;
/* eslint-enable no-unused-vars */

module.exports = function calceStyleImport({webpackContext, sanStyle, resourcePath}, {sourceMap, minimize}, context) {
    const isProduction = process.env.NODE_ENV === 'production';
    // 路径需要对windows环境区分处理，用path.posix处理，不然windows无法正常编译
    // linux系统确不能用，会导致绝对路径的开头斜杠失效
    if (/^win/.test(require('os').platform())) {
        resourcePath = join(...resourcePath.split(path.sep));
    }
    if (typeof sourceMap === 'boolean') {
        sourceMap = JSON.stringify(sourceMap);
    }
    const genRequest = loaders => {
        const seen = new Map();
        const loaderStrings = [];
        loaders.forEach(loader => {
            const identifier = typeof loader === 'string' ? loader : loader.path + loader.query;
            const request = typeof loader === 'string' ? loader : loader.request;
            if (!seen.has(identifier)) {
                seen.set(identifier, true);
                loaderStrings.push(request);
            }
        });

        /* eslint-disable max-len */
        return loaderUtils.stringifyRequest(
            context,
            '-!' + [...loaderStrings, context.resourcePath + context.resourceQuery].join('!')
        );
    };

    const loaders = [];
    const styleLoader = minimize
        ? `${requireAlias('mini-css-extract-plugin/dist/loader.js')}?{hmr:${!isProduction},reloadAll: true}`
        : requireAlias('style-loader');

    const cssLoader = `${requireAlias('css-loader')}?{sourceMap:${sourceMap},importLoaders:1}`;
    loaders.push(styleLoader, cssLoader);

    const hasPostCSSConfig = cosmiconfig('postcss', {
        searchPlaces: ['.postcssrc', '.postcssrc.js', 'postcss.config.js']
    }).searchSync(process.cwd());

    if (hasPostCSSConfig && hasPostCSSConfig.filepath) {
        const postcssLoader = `${require.resolve('postcss-loader')}?sourceMap=${sourceMap}`;
        loaders.push(postcssLoader);
    }

    const options = loaderUtils.getOptions(webpackContext) || {};
    const stylusOptions = options.stylus;

    const cssLoaderMap = {
        stylus: `${requireAlias('stylus-loader')}?${stylusOptions ? JSON.stringify(stylusOptions) : ''}`,
        less: `${requireAlias('less-loader')}?javascriptEnabled=true`,
        scss: `${requireAlias('sass-loader')}?{sourceMap:${sourceMap}}`,
        sass: `${requireAlias('sass-loader')}?{sourceMap:${sourceMap}}`
    };

    const cssProcessorLoader = (sanStyle.attrs && cssLoaderMap[sanStyle.attrs.lang]) || '';
    if (cssProcessorLoader !== '') {
        loaders.push(cssProcessorLoader);
    }
    loaders.push(require.resolve('./selector.js') + '?type=style');

    const loaderIndex = context.loaders.findIndex(l => sanLoader === l.path);
    if (loaderIndex > -1) {
        // const afterLoaders = context.loaders.slice(0, loaderIndex + 1);
        const beforeLoaders = context.loaders.slice(loaderIndex + 1);
        loaders.push(...beforeLoaders);
    }
    // console.log(loaders);
    // 拼接生成内联loader处理san样式
    // console.log(`import ${genRequest(loaders)}`);
    return `import ${genRequest(loaders)};\n`;
};
