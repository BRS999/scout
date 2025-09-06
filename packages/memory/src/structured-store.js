const __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? (o, m, k, k2) => {
        if (k2 === undefined) k2 = k
        let desc = Object.getOwnPropertyDescriptor(m, k)
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: () => m[k] }
        }
        Object.defineProperty(o, k2, desc)
      }
    : (o, m, k, k2) => {
        if (k2 === undefined) k2 = k
        o[k2] = m[k]
      })
const __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? (o, v) => {
        Object.defineProperty(o, 'default', { enumerable: true, value: v })
      }
    : (o, v) => {
        o.default = v
      })
const __importStar =
  (this && this.__importStar) ||
  (() => {
    let ownKeys = (o) => {
      ownKeys =
        Object.getOwnPropertyNames ||
        ((o) => {
          const ar = []
          for (const k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k
          return ar
        })
      return ownKeys(o)
    }
    return (mod) => {
      if (mod?.__esModule) return mod
      const result = {}
      if (mod != null)
        for (let k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i])
      __setModuleDefault(result, mod)
      return result
    }
  })()
Object.defineProperty(exports, '__esModule', { value: true })
exports.StructuredStore = void 0
const sqlite3 = __importStar(require('sqlite3'))
const uuid_1 = require('uuid')
class StructuredStore {
  db
  dbPath
  constructor(dbPath = './data/memory.db') {
    this.dbPath = dbPath
    this.db = new sqlite3.Database(dbPath)
  }
  /**
   * Initialize the database with required tables
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Research sessions table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS research_sessions (
            id TEXT PRIMARY KEY,
            query TEXT NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
            tags TEXT, -- JSON array of tags
            metadata TEXT -- JSON metadata
          )
        `)
        // Sources table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS sources (
            id TEXT PRIMARY KEY,
            url TEXT UNIQUE NOT NULL,
            title TEXT,
            author TEXT,
            published_date TEXT,
            domain TEXT,
            content_type TEXT DEFAULT 'article',
            word_count INTEGER,
            language TEXT DEFAULT 'en',
            scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP,
            access_count INTEGER DEFAULT 1,
            reliability_score REAL DEFAULT 0.5,
            metadata TEXT -- JSON metadata
          )
        `)
        // Content chunks table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS content_chunks (
            id TEXT PRIMARY KEY,
            source_id TEXT,
            session_id TEXT,
            text TEXT NOT NULL,
            chunk_index INTEGER,
            chunk_type TEXT DEFAULT 'paragraph',
            word_count INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            metadata TEXT, -- JSON metadata
            FOREIGN KEY (source_id) REFERENCES sources (id) ON DELETE CASCADE,
            FOREIGN KEY (session_id) REFERENCES research_sessions (id) ON DELETE CASCADE
          )
        `)
        // Session-chunk relationships
        this.db.run(`
          CREATE TABLE IF NOT EXISTS session_chunks (
            session_id TEXT,
            chunk_id TEXT,
            relevance_score REAL DEFAULT 0.0,
            added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (session_id, chunk_id),
            FOREIGN KEY (session_id) REFERENCES research_sessions (id) ON DELETE CASCADE,
            FOREIGN KEY (chunk_id) REFERENCES content_chunks (id) ON DELETE CASCADE
          )
        `)
        // Tags table for better organization
        this.db.run(`
          CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            usage_count INTEGER DEFAULT 0
          )
        `)
        // Create indexes for better performance
        this.db.run('CREATE INDEX IF NOT EXISTS idx_chunks_source ON content_chunks (source_id)')
        this.db.run('CREATE INDEX IF NOT EXISTS idx_chunks_session ON content_chunks (session_id)')
        this.db.run('CREATE INDEX IF NOT EXISTS idx_sources_domain ON sources (domain)')
        this.db.run('CREATE INDEX IF NOT EXISTS idx_sources_url ON sources (url)')
        this.db.run('CREATE INDEX IF NOT EXISTS idx_sessions_status ON research_sessions (status)')
        resolve()
      })
      this.db.on('error', (error) => {
        console.error('SQLite error:', error)
        reject(error)
      })
    })
  }
  /**
   * Create a new research session
   */
  async createSession(query, description, tags = []) {
    const session = {
      id: uuid_1.v4(),
      query,
      description,
      created_at: new Date(),
      updated_at: new Date(),
      chunk_ids: [],
      source_urls: [],
      tags,
      status: 'active',
    }
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO research_sessions (id, query, description, tags, status)
        VALUES (?, ?, ?, ?, ?)
      `)
      stmt.run(
        [
          session.id,
          session.query,
          session.description || null,
          JSON.stringify(tags),
          session.status,
        ],
        (error) => {
          if (error) {
            reject(new Error(`Failed to create session: ${error.message}`))
          } else {
            resolve(session)
          }
        }
      )
      stmt.finalize()
    })
  }
  /**
   * Get research session by ID
   */
  async getSession(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `
        SELECT * FROM research_sessions WHERE id = ?
      `,
        [sessionId],
        (error, row) => {
          if (error) {
            reject(new Error(`Failed to get session: ${error.message}`))
          } else if (!row) {
            resolve(null)
          } else {
            const session = {
              id: row.id,
              query: row.query,
              description: row.description,
              created_at: new Date(row.created_at),
              updated_at: new Date(row.updated_at),
              chunk_ids: [], // Will be populated by separate query
              source_urls: [], // Will be populated by separate query
              tags: row.tags ? JSON.parse(row.tags) : [],
              status: row.status,
            }
            resolve(session)
          }
        }
      )
    })
  }
  /**
   * Store source information
   */
  async upsertSource(url, metadata) {
    const sourceId = uuid_1.v4()
    const domain = new URL(url).hostname
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO sources 
        (id, url, title, author, published_date, domain, word_count, metadata, last_accessed, access_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 
                COALESCE((SELECT access_count + 1 FROM sources WHERE url = ?), 1))
      `)
      stmt.run(
        [
          sourceId,
          url,
          metadata.source_title || null,
          metadata.source_author || null,
          metadata.source_published || null,
          domain,
          metadata.word_count || null,
          JSON.stringify(metadata),
          url,
        ],
        (error) => {
          if (error) {
            reject(new Error(`Failed to store source: ${error.message}`))
          } else {
            resolve(sourceId)
          }
        }
      )
      stmt.finalize()
    })
  }
  /**
   * Store content chunk with metadata
   */
  async storeChunk(chunk, sessionId) {
    const sourceId = chunk.metadata.source_url
      ? await this.upsertSource(chunk.metadata.source_url, chunk.metadata)
      : null
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO content_chunks 
        (id, source_id, session_id, text, chunk_index, chunk_type, word_count, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      stmt.run(
        [
          chunk.id,
          sourceId,
          sessionId || null,
          chunk.text,
          chunk.metadata.chunk_index || null,
          chunk.metadata.chunk_type || 'paragraph',
          chunk.metadata.word_count || chunk.text.split(/\s+/).length,
          JSON.stringify(chunk.metadata),
        ],
        (error) => {
          if (error) {
            reject(new Error(`Failed to store chunk: ${error.message}`))
          } else {
            // Link chunk to session if provided
            if (sessionId) {
              const linkStmt = this.db.prepare(`
              INSERT OR REPLACE INTO session_chunks (session_id, chunk_id, relevance_score)
              VALUES (?, ?, ?)
            `)
              linkStmt.run(
                [sessionId, chunk.id, chunk.metadata.relevance_score || 0.0],
                (linkError) => {
                  if (linkError) {
                    reject(new Error(`Failed to link chunk to session: ${linkError.message}`))
                  } else {
                    resolve()
                  }
                }
              )
              linkStmt.finalize()
            } else {
              resolve()
            }
          }
        }
      )
      stmt.finalize()
    })
  }
  /**
   * Link a chunk to a research session
   */
  async linkChunkToSession(sessionId, chunkId, relevanceScore) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO session_chunks (session_id, chunk_id, relevance_score)
        VALUES (?, ?, ?)
      `)
      stmt.run([sessionId, chunkId, relevanceScore || 0.0], (error) => {
        if (error) {
          reject(new Error(`Failed to link chunk to session: ${error.message}`))
        } else {
          resolve()
        }
      })
      stmt.finalize()
    })
  }
  /**
   * Get chunks for a research session
   */
  async getSessionChunks(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `
        SELECT c.*, sc.relevance_score, s.url as source_url
        FROM content_chunks c
        JOIN session_chunks sc ON c.id = sc.chunk_id
        LEFT JOIN sources s ON c.source_id = s.id
        WHERE sc.session_id = ?
        ORDER BY sc.relevance_score DESC, c.created_at ASC
      `,
        [sessionId],
        (error, rows) => {
          if (error) {
            reject(new Error(`Failed to get session chunks: ${error.message}`))
          } else {
            const chunks = rows.map((row) => ({
              id: row.id,
              text: row.text,
              metadata: {
                ...JSON.parse(row.metadata),
                source_url: row.source_url,
                relevance_score: row.relevance_score,
              },
              createdAt: new Date(row.created_at),
              updatedAt: new Date(row.updated_at),
            }))
            resolve(chunks)
          }
        }
      )
    })
  }
  /**
   * Get memory statistics
   */
  async getStats() {
    return new Promise((resolve, reject) => {
      const queries = [
        'SELECT COUNT(*) as count FROM content_chunks',
        'SELECT COUNT(*) as count FROM research_sessions',
        'SELECT COUNT(*) as count FROM sources',
        'SELECT MIN(created_at) as oldest, MAX(created_at) as newest FROM content_chunks',
      ]
      Promise.all(
        queries.map(
          (query) =>
            new Promise((res, rej) => {
              this.db.get(query, (err, row) => {
                if (err) rej(err)
                else res(row)
              })
            })
        )
      )
        .then((results) => {
          const stats = {
            total_chunks: results[0]?.count || 0,
            total_sessions: results[1]?.count || 0,
            total_sources: results[2]?.count || 0,
            storage_size_mb: 0, // TODO: Calculate actual file size
            oldest_chunk: results[3]?.oldest ? new Date(results[3].oldest) : new Date(),
            newest_chunk: results[3]?.newest ? new Date(results[3].newest) : new Date(),
          }
          resolve(stats)
        })
        .catch(reject)
    })
  }
  /**
   * Search sessions by query or tags
   */
  async searchSessions(searchTerm, limit = 10) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `
        SELECT * FROM research_sessions 
        WHERE query LIKE ? OR tags LIKE ?
        ORDER BY updated_at DESC
        LIMIT ?
      `,
        [`%${searchTerm}%`, `%${searchTerm}%`, limit],
        (error, rows) => {
          if (error) {
            reject(new Error(`Failed to search sessions: ${error.message}`))
          } else {
            const sessions = rows.map((row) => ({
              id: row.id,
              query: row.query,
              description: row.description,
              created_at: new Date(row.created_at),
              updated_at: new Date(row.updated_at),
              chunk_ids: [], // TODO: Load chunk IDs if needed
              source_urls: [], // TODO: Load source URLs if needed
              tags: row.tags ? JSON.parse(row.tags) : [],
              status: row.status,
            }))
            resolve(sessions)
          }
        }
      )
    })
  }
  /**
   * Close the database connection
   */
  async close() {
    return new Promise((resolve, reject) => {
      this.db.close((error) => {
        if (error) {
          reject(new Error(`Failed to close database: ${error.message}`))
        } else {
          resolve()
        }
      })
    })
  }
}
exports.StructuredStore = StructuredStore
//# sourceMappingURL=structured-store.js.map
