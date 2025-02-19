const axios = require("axios");
const database = require("./database");
const { Stream, Metadata } = require("../models");
const global_config = require("../config");

const MATCH_TYPES = {
    TMDB: "⭐", // Star for perfect match
    TEXT: "🎯", // Target for title match
    FALLBACK: "📺", // TV for simple result
};

const LANGUAGE_FLAGS = {
    // Main languages
    'FR': '🇫🇷', // French
    'EN': '🇬🇧', // English
    'ES': '🇪🇸', // Spanish
    'DE': '🇩🇪', // German
    'IT': '🇮🇹', // Italian
    'PT': '🇵🇹', // Portuguese
    'RU': '🇷🇺', // Russian
    'JP': '🇯🇵', // Japanese
    'KR': '🇰🇷', // Korean
    'CN': '🇨🇳', // Chinese (Mandarin)

    // Regional variants
    'US': '🇺🇸', // English (United States)
    'AU': '🇦🇺', // English (Australia)
    'CA': '🇨🇦', // French/English (Canada)
    'BR': '🇧🇷', // Portuguese (Brazil)
    'MX': '🇲🇽', // Spanish (Mexico)
    'AR': '🇦🇷', // Spanish (Argentina)
    'BE': '🇧🇪', // French/Dutch (Belgium)
    'CH': '🇨🇭', // French/German/Italian (Switzerland)

    // European languages
    'BG': '🇧🇬', // Bulgarian
    'CZ': '🇨🇿', // Czech
    'DK': '🇩🇰', // Danish
    'EE': '🇪🇪', // Estonian
    'FI': '🇫🇮', // Finnish
    'GR': '🇬🇷', // Greek
    'HR': '🇭🇷', // Croatian
    'HU': '🇭🇺', // Hungarian
    'IE': '🇮🇪', // Irish
    'IS': '🇮🇸', // Icelandic
    'LT': '🇱🇹', // Lithuanian
    'LV': '🇱🇻', // Latvian
    'NL': '🇳🇱', // Dutch
    'NO': '🇳🇴', // Norwegian
    'PL': '🇵🇱', // Polish
    'RO': '🇷🇴', // Romanian
    'SE': '🇸🇪', // Swedish
    'SK': '🇸🇰', // Slovak
    'SI': '🇸🇮', // Slovenian

    // Asian languages
    'TH': '🇹🇭', // Thai
    'VN': '🇻🇳', // Vietnamese
    'ID': '🇮🇩', // Indonesian
    'MY': '🇲🇾', // Malaysian
    'PH': '🇵🇭', // Filipino (Tagalog)
    'KH': '🇰🇭', // Khmer
    'MM': '🇲🇲', // Burmese

    // Middle Eastern languages
    'AR': '🇸🇦', // Arabic
    'HE': '🇮🇱', // Hebrew
    'FA': '🇮🇷', // Persian
    'TR': '🇹🇷', // Turkish

    // African languages
    'ZA': '🇿🇦', // Afrikaans/Zulu (South Africa)
    'NG': '🇳🇬', // English/Hausa/Yoruba/Igbo (Nigeria)
    'EG': '🇪🇬', // Arabic (Egypt)
    'ET': '🇪🇹', // Amharic (Ethiopia)
    'KE': '🇰🇪', // Swahili (Kenya)

    // Indian languages
    'HI': '🇮🇳', // Hindi
    'TA': '🇮🇳', // Tamil
    'TE': '🇮🇳', // Telugu
    'BN': '🇮🇳', // Bengali
    'GU': '🇮🇳', // Gujarati
    'ML': '🇮🇳', // Malayalam
    'MR': '🇮🇳', // Marathi

    // Additional languages
    'LAT': '🌍', // Latin
    'MULTI': '🌐', // Multilingual
    'VOSTFR': '🇫🇷🔤', // Original version with French subtitles
    'VO': '🔤', // Original version
    'VOST': '🌐🔤', // Original version with subtitles
    'OTHER': '❓', // Others
};

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1, str2) {
    const a = str1.toLowerCase();
    const b = str2.toLowerCase();
    const costs = [];
    
    for (let i = 0; i <= a.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= b.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else if (j > 0) {
                let newValue = costs[j - 1];
                if (a.charAt(i - 1) !== b.charAt(j - 1)) {
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                }
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) costs[b.length] = lastValue;
    }
    
    const maxLength = Math.max(a.length, b.length);
    const similarity = ((maxLength - costs[b.length]) / maxLength) * 100;
    return Math.round(similarity);
}

/**
 * Format title with language flag based on language patterns
 */
function formatTitleWithLanguageFlag(title) {
    const patterns = [
        // Match 2-letter language codes with different delimiters
        /^([A-Z]{2})(?:\s*[-\.]|\s+|\s*$)/i,
        // Match language codes in parentheses or brackets at the end
        /[\(\[]\s*([A-Z]{2})\s*[\)\]]$/i,
        // Match special formats (VOSTFR, VF, VO, MULTI)
        /[\s\(\[](VOSTFR|VF|VO|MULTI)[\s\)\]]?$/i
    ];

    for (const pattern of patterns) {
        const match = title.match(pattern);
        if (match) {
            const lang = match[1].toUpperCase();
            const flag = LANGUAGE_FLAGS[lang];
            if (flag) {
                return title.replace(match[0], `${flag} `);
            }
        }
    }

    return title;
}

class XtreamClient {
    constructor(config) {
        if (!config) {
            throw new Error("Config is required to initialize XtreamClient");
        }
        this.config = config;
        this.userId = config.getHash();

        this.axiosInstance = axios.create({ timeout: 20000 });
        console.log(`[XtreamClient] Initialized. userId=${this.userId}`, config);
        console.log(`[XtreamClient] Config: ${JSON.stringify(config)}`);
    }

    /**
     * Internal helper: call the Xtream API
     */
    async _getApiData(action, params = {}) {
        const url = new URL(
            `http://${this.config.host}:${this.config.port}/player_api.php`
        );
        url.searchParams.append("username", this.config.username);
        url.searchParams.append("password", this.config.password);
        url.searchParams.append("action", action);

        for (const [key, val] of Object.entries(params)) {
            url.searchParams.append(key, val);
        }

        console.log(`[XtreamClient] GET -> ${url}`);
        console.log(`[XtreamClient] Params: ${JSON.stringify(params)}`);
        try {
            const resp = await this.axiosInstance.get(url.toString());
            return resp.data;
        } catch (err) {
            console.error(`[XtreamClient] Error calling ${action}:`, err.message);
            throw err;
        }
    }

    /**
     * Update catalog for movie/series
     **/
    async updateCatalog(type) {
        console.log(
            `[Catalog] updateCatalog for type="${type}", userId=${this.userId}`
        );
        console.log(`[Catalog] Fetching catalog for type="${type}"`);
        const collectionName =
            type === "movie" ? "movie_catalog" : "series_catalog";

        // 1. read from DB
        const existing = await database.findMany(collectionName, {
            userId: this.userId,
        });
        console.log(`[Catalog] Existing items length: ${existing.length}`);
        if (existing.length) {
            const metaDoc = await database.findOne("metadata", {
                userId: this.userId,
                key: "last_catalog_fetch",
            });
            const lastFetchTime = metaDoc?.value || 0;
            const now = Date.now();
            const sixh = 6 * 60 * 60 * 1000;

            if (now - lastFetchTime < sixh) {
                console.log("[Catalog] Skipping fetch, last fetch was <6h ago");
                console.log(
                    `[Catalog] Found ${existing.length} items in DB for userId=${this.userId}`
                );
                return existing;
            }
        }

        // 2. fetch from Xtream
        const action = type === "movie" ? "get_vod_streams" : "get_series";
        const data = await this._getApiData(action);
        console.log(`[Catalog] Fetched data length: ${data.length}`);
        if (!Array.isArray(data)) {
            console.error(`[Catalog] Invalid data for type="${type}"`);
            return [];
        }

        console.log(
            `[Catalog] Received ${data.length} items from Xtream for type="${type}".`
        );

        // 3. create docs for *each* item
        const items = data.map((item) => {
            // internalId depends on type
            const internalId = type === "movie" ? item.stream_id : item.series_id;
            return new Stream({
                id: item.tmdb ? `tt${item.tmdb}` : `iptremio:${internalId}`, // fallback
                type,
                name: item.name, // local title
                poster: item.stream_icon || item.cover || "",
                description: item.plot || "",
                internalId,
                tmdbRaw: item.tmdb || "",
                releaseDate: item.releaseDate || "",
                rating: item.rating || "",
                genre: item.genre || "",
            });
        });

        console.log(
            `[Catalog] Upserting ${items.length} docs for userId=${this.userId}`
        );

        // bulk upsert
        await database.insertMany(
            collectionName,
            items.map((item) => ({ userId: this.userId, ...item }))
        );

        // create index on name for text search
        await database.createIndex(collectionName, { name: "text" });

        console.log(`[Catalog] index created for collection: ${collectionName}`);

        // update last fetch time
        await database.upsert(
            "metadata",
            { userId: this.userId, key: "last_catalog_fetch" },
            { userId: this.userId, key: "last_catalog_fetch", value: Date.now() }
        );

        return true;
    }

    /**
     * Cinemeta fetch if needed
     */
    async getCinemetaMetadata(type, imdbId) {
        console.log(
            `[Cinemeta] getCinemetaMetadata for type="${type}", imdbId="${imdbId}"`
        );
        console.log(
            `[Cinemeta] Fetching metadata for type="${type}", imdbId="${imdbId}"`
        );
        if (!imdbId) return null;
        try {
            const url = `https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`;
            const resp = await axios.get(url);
            return new Metadata(resp.data?.meta);
        } catch (err) {
            console.error("[Cinemeta] Error fetching metadata:", err.message);
            return null;
        }
    }

    /**
     * Parse "tt12345:1:2" => { imdbId, season, episode }
     */
    _parseSeriesId(fullId) {
        console.log(`[Series] Parsing series ID: ${fullId}`);
        const [imdbId, season, episode] = fullId.split(":");
        return {
            imdbId,
            season: parseInt(season, 10),
            episode: parseInt(episode, 10),
        };
    }

    /**
     * If TV => handle live
     */
    async _handleTvStream(streamId) {
        console.log(`[Streams] _handleTvStream for streamId="${streamId}"`);
        console.log(`[Streams] Handling TV stream for streamId="${streamId}"`);
        return this.getLiveStreamUrl(decodeURIComponent(streamId));
    }

    async _fetchSeriesMetadata(id, type) {
        console.log(
            `[Series] Fetching series metadata for id="${id}", type="${type}"`
        );
        const { imdbId } = this._parseSeriesId(id);
        return this.getCinemetaMetadata(type, imdbId);
    }

    /**
     * getStreams for movie/series/live
     * => On va désormais essayer d'effectuer une recherche
     *    "ciblée" côté Mongo pour limiter la RAM,
     *    puis on applique TitleMatcher sur le petit set.
     */
    async getStreams(type, id, baseUrl) {
        console.log(
            `[Streams] getStreams: type="${type}", id="${id}", userId=${this.userId}`
        );
        console.log(
            `[Streams] Fetching streams for type="${type}", id="${id}", baseUrl="${baseUrl}"`
        );
        if (!type || !id) return [];

        // Handle TV streams
        if (type === "tv") {
            return this._handleTvStream(id);
        }

        // Fetch metadata from Cinemeta
        let metadata;
        if (type === "series") {
            metadata = await this._fetchSeriesMetadata(id, type);
        } else {
            metadata = await this.getCinemetaMetadata(type, id);
        }

        if (!metadata) {
            console.log("[Streams] No Cinemeta found. Returning empty.");
            return [];
        }

        await this.updateCatalog(type);
        console.log(`[Streams] Cinemeta metadata: "${metadata.name}"`);

        const tmdbId = await this._getTMDBIdFromIMDb(id);
        console.log(`[Streams] TMDB ID resolved: ${tmdbId}`);

        const collectionName = type === "movie" ? "movie_catalog" : "series_catalog";
        const searchName = metadata.name || "";
        let candidateDocs = [];
        let matchTypes = new Map();

        // Try to match by TMDB ID first
        if (tmdbId) {
            const tmdbMatches = await database.findMany(
                collectionName,
                {
                    userId: this.userId,
                    $or: [
                        { tmdbRaw: tmdbId },
                        { tmdbRaw: tmdbId.toString() },
                    ],
                },
                { limit: 50 }
            );
            
            tmdbMatches.forEach(doc => {
                candidateDocs.push(doc);
                matchTypes.set(doc.internalId, MATCH_TYPES.TMDB);
            });

            console.log(
                `[Streams] Found ${tmdbMatches.length} items via TMDB ID match`
            );
        }

        if (searchName) {
            const textMatches = await database.findMany(
                collectionName,
                {
                    userId: this.userId,
                    $text: { $search: searchName },
                },
                {
                    sort: { score: { $meta: "textScore" } },
                    limit: 50,
                }
            );

            const textMatchesWithScores = textMatches
                .map(doc => {
                    if (!matchTypes.has(doc.internalId)) {
                        const similarity = calculateSimilarity(searchName, doc.name);
                        return { doc, similarity };
                    }
                    return null;
                })
                .filter(item => item && item.similarity >= 20)
                .sort((a, b) => b.similarity - a.similarity);

            textMatchesWithScores.forEach(({ doc, similarity }) => {
                candidateDocs.push(doc);
                matchTypes.set(doc.internalId, `${MATCH_TYPES.TEXT}${similarity}%`);
            });
        }

        // Fallback if no matches found
        if (!candidateDocs.length) {
            console.log("[Streams] Fallback to global search");
            const fallbackDocs = await database.findMany(
                collectionName,
                { userId: this.userId },
                { limit: 100 }
            );
            
            fallbackDocs.forEach(doc => {
                if (!matchTypes.has(doc.internalId)) {
                    candidateDocs.push(doc);
                    matchTypes.set(doc.internalId, MATCH_TYPES.FALLBACK);
                }
            });
        }

        return type === "movie"
            ? this._buildMovieStreams(candidateDocs, baseUrl, matchTypes)
            : this._buildSeriesStreams(candidateDocs, id, baseUrl, matchTypes);
    }

    _buildMovieStreams(matchingItems, baseUrl, matchTypes) {
        return matchingItems.map((item) => {
            const matchType = matchTypes.get(item.internalId);
            const formattedTitle = formatTitleWithLanguageFlag(item.name);
            const title = matchType.includes('%') 
                ? `${matchType} ${formattedTitle}`
                : `${matchType} ${formattedTitle}`;
            
            return {
                title,
                url: `${baseUrl}/redirect/movie/${item.internalId}`,
                behaviorHints: {
                    notWebReady: true,
                    bingeGroup: "iptremio-movie",
                },
            };
        });
    }

    _buildSeriesStreams(matchingItems, fullId, baseUrl, matchTypes) {
        const { season, episode } = this._parseSeriesId(fullId);
        return matchingItems.map((item) => {
            const matchType = matchTypes.get(item.internalId);
            const formattedTitle = formatTitleWithLanguageFlag(item.name);
            const episodeCode = `S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}`;
            const title = matchType.includes('%')
                ? `${matchType} ${episodeCode} ${formattedTitle}`
                : `${matchType} ${episodeCode} ${formattedTitle}`;

            return {
                title,
                url: `${baseUrl}/redirect/series/${item.internalId}/${season}/${episode}`,
                behaviorHints: {
                    notWebReady: true,
                    bingeGroup: "iptremio-series",
                },
            };
        });
    }

    /**
     * getLiveCategories, storing by userId if you want
     */
    async getLiveCategories() {
        console.log(`[Live] Fetching live categories`);
        const col = "live_categories";
        const metaDoc = await database.findOne("metadata", {
            userId: this.userId,
            key: "last_live_categories_fetch",
        });
        const lastFetchTime = metaDoc?.value || 0;
        const now = Date.now();
        const twoHoursMs = 2 * 60 * 60 * 1000;

        if (now - lastFetchTime < twoHoursMs) {
            console.log("[Live] Using cached live categories");
            return await database.findMany(col, { userId: this.userId });
        }

        const cats = await this._getApiData("get_live_categories");
        if (!Array.isArray(cats)) return [];
        await database.insertMany(
            col,
            cats.map((cat) => ({ userId: this.userId, ...cat }))
        );

        // Update last fetch time
        await database.upsert(
            "metadata",
            { userId: this.userId, key: "last_live_categories_fetch" },
            { userId: this.userId, key: "last_live_categories_fetch", value: now }
        );

        return await database.findMany(col, { userId: this.userId });
    }

    async getCategoryId(categoryName) {
        console.log(
            `[Live] Fetching category ID for categoryName="${categoryName}"`
        );
        if (!categoryName) return null;

        const col = "live_categories";
        // Use exact match instead of regex for better performance
        const category = await database.findOne(col, {
            userId: this.userId,
            category_name: categoryName.trim(),
        });

        console.log(
            "[Live] Found category:",
            category ? JSON.stringify(category) : "NONE"
        );
        return category ? category.category_id : null;
    }

    /**
     * getLiveStreams(genre?), store in "live_channels"
     * => on limite le nombre de channels pour éviter de tout charger
     */
    async getLiveStreams(genre = null) {
        console.log(`[Live] Fetching live streams for genre="${genre}"`);
        const col = "live_channels";

        await this.getLiveCategories();

        let query = { userId: this.userId };
        if (genre) {
            const catId = await this.getCategoryId(genre);
            console.log(`[Live] catId resolved for "${genre}":`, catId);

            if (catId) {
                query.category_id = catId.toString();
                console.log("[Live] Using query:", JSON.stringify(query));
            }
        }

        let channels = await database.findMany(col, query, {
            limit: 200,
            sort: { num: 1 },
        });

        if (!channels.length) {
            console.log("[Live] No channels in DB, fetching from API");
            try {
                const apiChannels = await this._getApiData("get_live_streams");
                if (Array.isArray(apiChannels) && apiChannels.length > 0) {
                    console.log(`[Live] Got ${apiChannels.length} channels from API`);

                    const channelsToInsert = apiChannels.map((ch) => ({
                        userId: this.userId,
                        ...ch,
                        category_id: ch.category_id ? ch.category_id.toString() : null,
                    }));

                    await database.insertMany(col, channelsToInsert);
                    channels = await database.findMany(col, query, { limit: 200 });
                }
            } catch (err) {
                console.error("[Live] Error fetching channels from API:", err.message);
                return { metas: [] };
            }
        }

        if (!channels.length) {
            console.log("[Live] No channels found after all attempts");
            return { metas: [] };
        }

        if (!global_config.DISABLE_EPG_PROCESSING) {
            try {
                const metaDoc = await database.findOne("metadata", {
                    userId: this.userId,
                    key: "last_epg_fetch",
                });
                const lastFetchTime = metaDoc?.value || 0;
                const now = Date.now();
                const oneHourMs = 60 * 60 * 1000;

                if (now - lastFetchTime >= oneHourMs) {
                    channels = await database.findMany(col, query, { limit: 200 });
                }
            } catch (err) {
                console.error("[Live] EPG update failed but continuing:", err.message);
            }
        }

        console.log(
            `[Live] Found ${channels.length} channels for category_id:`,
            query.category_id
        );

        const filtered = channels.slice(0, 500);
        console.log(`[Live] Filtered channels length: ${filtered.length}`);

        const metas = await Promise.all(
            filtered.map(async (ch) => {
                const epgInfo = await this._getEpgInfo(ch.epg_channel_id);
                const description = this._formatEpgDescription(
                    epgInfo?.currentProgram,
                    epgInfo?.nextProgram
                );

                return new Stream({
                    id: `iptremio:${ch.stream_id}`,
                    type: "tv",
                    name: ch.name,
                    poster: `${global_config.IMG_PROXY}${ch.stream_icon}`,
                    description: description,
                    internalId: ch.stream_id,
                    categoryId: ch.category_id,
                    categoryName: ch.category_name || "",
                    epgChannelId: ch.epg_channel_id,
                });
            })
        );

        return { metas };
    }

    async _getEpgInfo(epgChannelId) {
        if (!epgChannelId) return null;

        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Recherche du programme actuel
        const currentProgram = await database.findOne("EPG", {
            channel: epgChannelId,
            start: { $lte: now.toISOString() },
            stop: { $gte: now.toISOString() },
        });

        // Recherche du programme suivant
        const nextProgram = await database.findOne(
            "EPG",
            {
                channel: epgChannelId,
                start: { $gt: now.toISOString() },
                stop: { $lte: tomorrow.toISOString() },
            },
            {
                sort: { start: 1 },
            }
        );

        return { currentProgram, nextProgram };
    }

    _formatEpgDescription(currentProgram, nextProgram) {
        let description = "";

        if (currentProgram) {
            const start = new Date(currentProgram.start);
            const stop = new Date(currentProgram.stop);
            const duration = Math.floor((stop - start) / 1000 / 60); // Duration in minutes

            description += `🔴 ${currentProgram.title}\n`;
            description += `${start.toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
            })} - ${stop.toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
            })} (${duration}min)\n`;
            if (currentProgram.desc) {
                description += `${currentProgram.desc}\n`;
            }
            description += "\n";
        }

        if (nextProgram) {
            const start = new Date(nextProgram.start);
            const stop = new Date(nextProgram.stop);
            const duration = Math.floor((stop - start) / 1000 / 60);

            description += `⏭️ ${nextProgram.title}\n`;
            description += `${start.toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
            })} - ${stop.toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
            })} (${duration}min)\n`;
            if (nextProgram.desc) {
                description += `${nextProgram.desc}`;
            }
        }

        return description || "EPG not available";
    }

    async getLiveStreamUrl(streamId) {
        console.log(`[Live] Fetching live stream URL for streamId="${streamId}"`);
        const cleanId = streamId.replace("iptremio:", "");
        const url = `http://${this.config.host}:${this.config.port}/live/${this.config.username}/${this.config.password}/${cleanId}.ts`;

        return {
            streams: [
                {
                    url,
                    description: "Watch Now",
                    behaviorHints: {
                        notWebReady: true,
                        bingeGroup: "iptremio-live",
                    },
                },
            ],
        };
    }

    async getLiveStreamMeta(streamId) {
        console.log(
            `[Live] Fetching live stream metadata for streamId="${streamId}"`
        );
        try {
            const col = "live_channels";
            const chan = await database.findOne(col, {
                userId: this.userId,
                stream_id: parseInt(streamId, 10),
            });
            if (!chan) return null;

            // generate description epg
            const epgInfo = await this._getEpgInfo(chan.epg_channel_id);
            const description = this._formatEpgDescription(
                epgInfo?.currentProgram,
                epgInfo?.nextProgram
            );

            // find genre (category_name)
            const cat = await database.findOne("live_categories", {
                userId: this.userId,
                category_id: chan.category_id,
            });

            chan.category_name = cat?.category_name || "";

            console.log(`[Live] Channel found: ${chan.name}`);
            const meta = new Metadata({
                id: `iptremio:${chan.stream_id}`,
                type: "tv",
                name: chan.name,
                description,
                ...chan,
            });

            if (chan.stream_icon) {
                const iconUrl = `${global_config.IMG_PROXY}${encodeURIComponent(
                    chan.stream_icon
                )}`;
                meta.poster = global_config.IMG_PROXY + iconUrl;
                meta.background = global_config.IMG_PROXY + iconUrl;
                meta.logo = global_config.IMG_PROXY + iconUrl;
            }
            return meta;
        } catch (err) {
            console.error("[Live] getLiveStreamMeta error:", err.message);
            return null;
        }
    }

    /**
     * Validate config by calling get_vod_categories
     */
    async validateConfig() {
        console.log(`[Config] Validating configuration`);
        try {
            const res = await this._getApiData("get_vod_categories");
            return Array.isArray(res);
        } catch {
            return false;
        }
    }

    async getMovieStreamUrl(movieId) {
        console.log(`[Movie] Fetching movie stream URL for movieId="${movieId}"`);
        const info = await this._getApiData("get_vod_info", { vod_id: movieId });
        if (!info?.movie_data?.stream_id) {
            throw new Error("Movie stream not found");
        }
        const ext = info.movie_data.container_extension || "mp4";
        return `http://${this.config.host}:${this.config.port}/movie/${this.config.username}/${this.config.password}/${movieId}.${ext}`;
    }

    async getSeriesStreamUrl(seriesId, seasonNum, episodeNum) {
        console.log(
            `[Series] Fetching series stream URL for seriesId="${seriesId}", seasonNum="${seasonNum}", episodeNum="${episodeNum}"`
        );
        const info = await this._getApiData("get_series_info", {
            series_id: seriesId,
        });
        if (!info?.episodes) {
            throw new Error("Series not found");
        }
        const sEps = info.episodes[seasonNum];
        if (!sEps) {
            throw new Error(`Season ${seasonNum} not found`);
        }
        const ep = sEps.find(
            (e) => parseInt(e.episode_num) === parseInt(episodeNum)
        );
        if (!ep) {
            throw new Error(`Episode ${episodeNum} not found`);
        }
        const ext = ep.container_extension || "mp4";
        return `http://${this.config.host}:${this.config.port}/series/${this.config.username}/${this.config.password}/${ep.id}.${ext}`;
    }

    _getExternalUrlLiveGenre(genre) {
        let urlAddonEncoded = encodeURIComponent(
            `${global_config.BASE_URL}/${this.config.toBase64()}`
        );
        return `stremio:///discover/${urlAddonEncoded}/tv/iptremio_live_tv/genre=${encodeURIComponent(
            genre
        )}.json`;
    }

    async _getTMDBIdFromIMDb(imdbId) {

        // remove ":" from IMDb ID
        if (imdbId.includes(":")) {
            imdbId = imdbId.split(":")[0];
        }

        const cached = await database.findOne("tmdb_mapping", {
            imdbId,
        });
        if (cached) {
            console.log(`[TMDB] Found cached TMDB ID for IMDb ID: ${imdbId}`);
            return cached.tmdbId
        }


        try {
            console.log(
                `[TMDB] Fetching with url: https://api.themoviedb.org/3/find/${imdbId}?api_key=${global_config.TMDB_API_KEY}&external_source=imdb_id`
            );
            const resp = await axios.get(
                `https://api.themoviedb.org/3/find/${imdbId}?api_key=${global_config.TMDB_API_KEY}&external_source=imdb_id`
            );
            console.log(`[TMDB] TMDB response: ${JSON.stringify(resp.data)}`);
            const tmdbId = resp.data?.movie_results?.[0]?.id || resp.data?.tv_results?.[0]?.id;

            if (tmdbId) {
                console.log(`[TMDB] Caching TMDB ID for IMDb ID: ${imdbId}`);
                await database.upsert(
                    "tmdb_mapping",
                    { imdbId },
                    { imdbId, tmdbId }
                );
            }

            return tmdbId;
        } catch (err) {
            console.error("[TMDB] Error fetching TMDB ID:", err.message);
            return null;
        }
    }
}

module.exports = { XtreamClient };
