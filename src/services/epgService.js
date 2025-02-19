const axios = require('axios');
const XmlStream = require('xml-stream');
const zlib = require('zlib');
const { EventEmitter } = require('events');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

/**
 * Class representing an EPG parser.
 * @extends EventEmitter
 */
class EPGParser extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      batchSize: options.batchSize || 2000,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 5000,
      timeout: options.timeout || 30000,
      maxBuffer: options.maxBuffer || 64 * 1024 * 1024, // 64MB
      ...options
    };
  }

  /**
   * Parses a date string into a Date object.
   * @param {string} dateStr - The date string to parse.
   * @returns {Date|null} - The parsed Date object or null if parsing fails.
   */
  parseDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    try {
      const [raw, tz] = dateStr.split(' ');
      if (!raw || !tz) return new Date(dateStr);

      const year = raw.slice(0, 4);
      const month = raw.slice(4, 6);
      const day = raw.slice(6, 8);
      const hour = raw.slice(8, 10);
      const min = raw.slice(10, 12);
      const sec = raw.slice(12, 14);
      const tzFormatted = `${tz.slice(0, 3)}:${tz.slice(3)}`;

      return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}${tzFormatted}`);
    } catch (err) {
      this.emit('warning', `Date parsing error: ${dateStr}`, err);
      return null;
    }
  }

  /**
   * Validates a program object.
   * @param {Object} program - The program object to validate.
   * @returns {boolean} - True if the program is valid, false otherwise.
   */
  validateProgram(program) {
    const required = ['start', 'stop', 'channel'];
    const missing = required.filter(field => !program.$?.[field]);
    
    if (missing.length) {
      this.emit('warning', `Missing required fields: ${missing.join(', ')}`);
      return false;
    }
    return true;
  }

  /**
   * Downloads a file with retry logic.
   * @param {string} url - The URL to download.
   * @param {number} [attempt=1] - The current attempt number.
   * @returns {Promise<Object>} - The response object.
   * @throws {Error} - If the download fails after all attempts.
   */
  async downloadWithRetry(url, attempt = 1) {
    try {
      const response = await axios({
        method: 'get',
        url,
        responseType: 'stream',
        timeout: this.options.timeout,
        maxContentLength: Infinity,
        headers: {
          'Accept-Encoding': 'gzip'
        }
      });

      this.emit('progress', { 
        status: 'downloaded',
        statusCode: response.status,
        contentLength: response.headers['content-length']
      });

      return response;
    } catch (err) {
      if (attempt < this.options.retryAttempts) {
        this.emit('warning', `Download attempt ${attempt} failed, retrying...`, err);
        await sleep(this.options.retryDelay);
        return this.downloadWithRetry(url, attempt + 1);
      }
      throw new Error(`Failed to download after ${attempt} attempts: ${err.message}`);
    }
  }

  /**
   * Transforms a program object.
   * @param {Object} program - The program object to transform.
   * @returns {Object} - The transformed program object.
   */
  transformProgram(program) {
    const startDate = this.parseDate(program.$?.start);
    const stopDate = this.parseDate(program.$?.stop);
  
    let titleVal = null;
    if (program.title) {
      if (program.title.$text) {
        titleVal = program.title.$text;
      } 
      else if (program.title._text) {
        titleVal = program.title._text;
      }
    }
  
    let descVal = null;
    if (program.desc) {
      if (program.desc.$text) {
        descVal = program.desc.$text;
      }
      else if (program.desc._text) {
        descVal = program.desc._text;
      }
    }
  
    let langVal = null;
    if (program.title?.$?.lang) {
      langVal = program.title.$.lang; 
    } 
    else if (program.desc?.$?.lang) {
      langVal = program.desc.$.lang;
    }
  
    const result = {
      start: startDate?.toISOString() || program.$?.start,
      stop: stopDate?.toISOString() || program.$?.stop,
      channel: program.$?.channel || null,
      title: titleVal || null,
      desc: descVal || null,
      lang: langVal || null,
      created: new Date(),
    };
  
    return result;
  }
}

/**
 * Class representing the EPG service.
 */
class EpgService {
  constructor(database) {
    this.database = database;
    this.parser = new EPGParser();
    this.stats = {
      processedItems: 0,
      failedItems: 0,
      startTime: null,
      endTime: null
    };
  }

  /**
   * Downloads and parses the EPG data.
   * @param {string} url - The URL to download the EPG data from.
   * @returns {Promise<Object>} - The statistics of the parsing process.
   * @throws {Error} - If the download or parsing fails.
   */
  async downloadAndParseEPG(url) {
    this.stats.startTime = Date.now();
    const programBuffer = [];
    
    try {
      await this.database.deleteMany('EPG', {});
      
      const response = await this.parser.downloadWithRetry(url);
      const gunzip = zlib.createGunzip();
      const xml = new XmlStream(gunzip);

      response.data.pipe(gunzip);

      return new Promise((resolve, reject) => {
        let isProcessing = false;

        const processBatch = async () => {
          if (isProcessing || programBuffer.length === 0) return;
          isProcessing = true;

          const batch = programBuffer.splice(0, this.parser.options.batchSize);
          try {
            await this.database.insertMany('EPG', batch);
            this.stats.processedItems += batch.length;
            this.reportProgress();
          } catch (err) {
            this.stats.failedItems += batch.length;
            console.error('[EPG] Batch insertion error:', err);
          } finally {
            isProcessing = false;
          }
        };

        xml.on('endElement: programme', async (program) => {
          if (!this.parser.validateProgram(program)) return;

          const transformed = this.parser.transformProgram(program);
          if (transformed) {
            programBuffer.push(transformed);
            
            if (programBuffer.length >= this.parser.options.batchSize) {
              xml.pause();
              await processBatch();
              xml.resume();
            }
          }
        });

        xml.on('end', async () => {
          while (programBuffer.length > 0) {
            await processBatch();
          }

          await this.createIndexes();
          this.stats.endTime = Date.now();
          resolve(this.stats);
        });

        xml.on('error', reject);
        gunzip.on('error', reject);
        response.data.on('error', reject);
      });
    } catch (err) {
      console.error('[EPG] Fatal error:', err);
      throw err;
    }
  }

  /**
   * Creates indexes for the EPG collection.
   * @returns {Promise<void>} - A promise that resolves when the indexes are created.
   * @throws {Error} - If creating the indexes fails.
   */
  async createIndexes() {
    const indexes = [
      { channel: 1 },
      { start: 1 },
      { stop: 1 }
    ];

    try {
      for (const index of indexes) {
        await this.database.createIndex('EPG', index);
      }

      await this.database.createIndex('EPG', {
        title: 'text',
        desc: 'text'
      });

      console.log('[EPG] Indexes created successfully');
    } catch (err) {
      console.error('[EPG] Error creating indexes:', err);
      throw err;
    }
  }

  /**
   * Reports the progress of the parsing process.
   */
  reportProgress() {
    const duration = (Date.now() - this.stats.startTime) / 1000;
    const rate = Math.round(this.stats.processedItems / duration);
    
    console.log(`[EPG] Processed: ${this.stats.processedItems} items ` +
                `(${rate} items/sec) | Failed: ${this.stats.failedItems}`);
  }
}

module.exports = EpgService;
