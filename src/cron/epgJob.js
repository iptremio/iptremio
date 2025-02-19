const cron = require('node-cron');
const EpgService = require('../services/epgService');
const database = require('../services/database');

class EpgJob {
    constructor() {
        this.epgService = new EpgService(database);
        this.EPG_UPDATE_KEY = 'last_epg_update';
    }

    async start() {
        // Check the last update time
        const lastUpdate = await database.getLastUpdateTime(this.EPG_UPDATE_KEY);
        const shouldUpdate = !lastUpdate || 
            (Date.now() - lastUpdate.getTime()) > (12 * 60 * 60 * 1000); // 12 hours

        if (shouldUpdate) {
            console.log('EPG needs update, last update:', lastUpdate);
            await this.updateEPG();
        } else {
            console.log('EPG is up to date, last update:', lastUpdate);
        }
        
        // Schedule job to run at midnight every day
        cron.schedule('0 0 * * *', () => {
            this.updateEPG();
        });
    }

    async updateEPG() {
        console.log('Starting EPG update...');
        try {
            await this.epgService.downloadAndParseEPG("https://epgshare01.online/epgshare01/epg_ripper_ALL_SOURCES1.xml.gz");
            await database.setLastUpdateTime(this.EPG_UPDATE_KEY);
            console.log('EPG update completed successfully');
        } catch (error) {
            console.error('Failed to download EPG:', error);
        }
    }
}

module.exports = EpgJob;
