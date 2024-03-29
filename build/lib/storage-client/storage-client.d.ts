export class ChromedriverStorageClient {
    /**
     *
     * @param {import('../types').ChromedriverStorageClientOpts} args
     */
    constructor(args?: import('../types').ChromedriverStorageClientOpts);
    chromedriverDir: string;
    timeout: number;
    /** @type {ChromedriverDetailsMapping} */
    mapping: ChromedriverDetailsMapping;
    /**
     * Retrieves chromedriver mapping from the storage
     *
     * @param {boolean} shouldParseNotes [true] - if set to `true`
     * then additional chromedrivers info is going to be retrieved and
     * parsed from release notes
     * @returns {Promise<ChromedriverDetailsMapping>}
     */
    retrieveMapping(shouldParseNotes?: boolean): Promise<ChromedriverDetailsMapping>;
    /**
     * Extracts downloaded chromedriver archive
     * into the given destination
     *
     * @param {string} src - The source archive path
     * @param {string} dst - The destination chromedriver path
     */
    unzipDriver(src: string, dst: string): Promise<void>;
    /**
     * Filters `this.mapping` to only select matching
     * chromedriver entries by operating system information
     * and/or additional synchronization options (if provided)
     *
     * @param {OSInfo} osInfo
     * @param {SyncOptions} opts
     * @returns {Array<String>} The list of filtered chromedriver
     * entry names (version/archive name)
     */
    selectMatchingDrivers(osInfo: OSInfo, opts?: SyncOptions): Array<string>;
    /**
     * Checks whether the given chromedriver matches the operating system to run on
     *
     * @param {string} cdName
     * @param {OSInfo} osInfo
     * @returns {boolean}
     */
    doesMatchForOsInfo(cdName: string, { name, arch, cpu }: OSInfo): boolean;
    /**
     * Retrieves the given chromedriver from the storage
     * and unpacks it into `this.chromedriverDir` folder
     *
     * @param {number} index - The unique driver index
     * @param {string} driverKey - The driver key in `this.mapping`
     * @param {string} archivesRoot - The temporary folder path to extract
     * downloaded archives to
     * @param {boolean} isStrict [true] - Whether to throw an error (`true`)
     * or return a boolean result if the driver retrieval process fails
     * @throws {Error} if there was a failure while retrieving the driver
     * and `isStrict` is set to `true`
     * @returns {Promise<boolean>} if `true` then the chromedriver is successfully
     * downloaded and extracted.
     */
    retrieveDriver(index: number, driverKey: string, archivesRoot: string, isStrict?: boolean): Promise<boolean>;
    /**
     * Retrieves chromedrivers from the remote storage
     * to the local file system
     *
     * @param {SyncOptions} opts
     * @throws {Error} if there was a problem while retrieving
     * the drivers
     * @returns {Promise<string[]>} The list of successfully synchronized driver keys
     */
    syncDrivers(opts?: SyncOptions): Promise<string[]>;
}
export default ChromedriverStorageClient;
export type SyncOptions = import('../types').SyncOptions;
export type OSInfo = import('../types').OSInfo;
export type ChromedriverDetails = import('../types').ChromedriverDetails;
export type ChromedriverDetailsMapping = import('../types').ChromedriverDetailsMapping;
//# sourceMappingURL=storage-client.d.ts.map