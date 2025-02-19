/**
 * Class representing a TV program.
 */
class Program {
    /**
     * Create a Program instance.
     * @param {Object} param0 - The program details.
     * @param {string} param0.title - The title of the program.
     * @param {string} param0.description - The description of the program.
     * @param {number} param0.start - The start time of the program.
     * @param {number} param0.end - The end time of the program.
     * @param {string} param0.category - The category of the program.
     */
    constructor({ title, description, start, end, category }) {
        this.title = title;
        this.description = description;
        this.start = start;
        this.end = end;
        this.category = category;
    }

    /**
     * Format the time range of the program.
     * @returns {string} - The formatted time range.
     */
    formatTimeRange() {
        const startTime = new Date(this.start);
        const endTime = new Date(this.end);
        const pad = (num) => String(num).padStart(2, '0');
        
        return `${pad(startTime.getHours())}:${pad(startTime.getMinutes())} - ${pad(endTime.getHours())}:${pad(endTime.getMinutes())}`;
    }

    /**
     * Check if the program is currently playing.
     * @returns {boolean} - True if the program is currently playing, false otherwise.
     */
    isCurrentlyPlaying() {
        const now = Date.now();
        return this.start <= now && this.end >= now;
    }

    /**
     * Get the duration of the program in minutes.
     * @returns {number} - The duration of the program in minutes.
     */
    getDuration() {
        return Math.round((this.end - this.start) / 60000);
    }
}

module.exports = { Program };
