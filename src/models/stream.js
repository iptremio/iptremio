class Stream {
    constructor({ id, type, name, poster, description, internalId, tmdbRaw, releaseDate, rating, genre, streamIcon = null, categoryId = null, categoryName = null }) {
        this.id = id;
        this.type = type;
        this.name = name;
        this.poster = poster;
        this.description = description;
        this.internalId = internalId;
        this.tmdbRaw = tmdbRaw;
        this.releaseDate = releaseDate;
        this.rating = rating;
        this.genre = genre;
        this.streamIcon = streamIcon;
        this.categoryId = categoryId;
        this.categoryName = categoryName;
    }

    /**
     * Converts the stream object to a meta preview object.
     * @returns {Object} - The meta preview object.
     */
    toMetaPreview() {
        const meta = {
            id: this.type === 'tv' ? `iptremio:${this.internalId}` : this.id,
            type: this.type,
            name: this.name,
            poster: this.poster,
            posterShape: this.type === 'tv' ? 'square' : 'poster'
        };

        if (this.description) meta.description = this.description;
        if (this.categoryName) meta.genres = [this.categoryName];

        return meta;
    }
}

module.exports = { Stream };
