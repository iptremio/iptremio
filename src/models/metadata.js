/**
 * Class representing metadata for a media item.
 */
class Metadata {
    /**
     * Create a Metadata instance.
     * @param {Object} meta - The metadata object.
     */
    constructor(meta = {}) {
        this.id = meta.id;
        this.type = meta.type;
        this.name = meta.name;
        this.genres = meta.genres || [];
        this.poster = meta.poster;
        this.background = meta.background;
        this.logo = meta.logo;
        this.description = meta.description || '';
        this.releaseInfo = meta.releaseInfo || '';
        this.runtime = meta.runtime || '';
        this.videos = meta.videos || [];
    }

    /**
     * Add a video to the metadata.
     * @param {Object} video - The video object to add.
     */
    addVideo(video) {
        this.videos.push(video);
    }

    /**
     * Add a genre to the metadata.
     * @param {string} genre - The genre to add.
     */
    addGenre(genre) {
        if (!this.genres.includes(genre)) {
            this.genres.push(genre);
        }
    }
}

module.exports = { Metadata };
