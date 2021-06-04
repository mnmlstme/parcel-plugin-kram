module.exports = function(bundler) {
  bundler.addAssetType('kr', require.resolve('./src/KramAsset.js'))
}
