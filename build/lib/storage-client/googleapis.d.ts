/**
 *
 * @param {Node|Attr} parent
 * @param {string?} childName
 * @param {string?} text
 * @returns
 */
export function findChildNode(parent: Node | Attr, childName?: string | null, text?: string | null): Attr | Element | null;
/**
 * Gets additional chromedriver details from chromedriver
 * release notes
 *
 * @param {string} content - Release notes of the corresponding chromedriver
 * @returns {import('../types').AdditionalDriverDetails}
 */
export function parseNotes(content: string): import('../types').AdditionalDriverDetails;
/**
 * Parses chromedriver storage XML and returns
 * the parsed results
 *
 * @param {string} xml - The chromedriver storage XML
 * @param {boolean} shouldParseNotes [true] - If set to `true`
 * then additional drivers information is going to be parsed
 * and assigned to `this.mapping`
 * @returns {Promise<ChromedriverDetailsMapping>}
 */
export function parseGoogleapiStorageXml(xml: string, shouldParseNotes?: boolean): Promise<ChromedriverDetailsMapping>;
export type SyncOptions = import('../types').SyncOptions;
export type OSInfo = import('../types').OSInfo;
export type ChromedriverDetails = import('../types').ChromedriverDetails;
export type ChromedriverDetailsMapping = import('../types').ChromedriverDetailsMapping;
//# sourceMappingURL=googleapis.d.ts.map