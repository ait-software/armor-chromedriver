/**
 * Parses The output of the corresponding JSON API
 * that retrieves Chromedriver versions. See
 * https://github.com/GoogleChromeLabs/chrome-for-testing#json-api-endpoints
 * for more details.
 *
 * @param {string} jsonStr
 * @returns {ChromedriverDetailsMapping}
 */
export function parseKnownGoodVersionsWithDownloadsJson(jsonStr: string): ChromedriverDetailsMapping;
/**
 * Parses The output of the corresponding JSON API
 * that retrieves the most recent stable Chromedriver version. See
 * https://github.com/GoogleChromeLabs/chrome-for-testing#json-api-endpoints
 * for more details.
 *
 * @param {string} jsonStr
 * @returns {string} The most recent available chromedriver version
 */
export function parseLatestKnownGoodVersionsJson(jsonStr: string): string;
export type ChromedriverDetailsMapping = import('../types').ChromedriverDetailsMapping;
//# sourceMappingURL=chromelabs.d.ts.map