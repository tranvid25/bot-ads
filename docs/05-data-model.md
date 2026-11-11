# 05. Data Model & Storage Schema

The local architecture uses SQLite (compatible with Cloudflare D1) managed via `apps/server` and Cloudflare Worker bindings.

## 1. Entity Relationship Diagram

```mermaid
erDiagram
  ORGANIZATION ||--o{ BRAND : owns
  BRAND ||--o{ CHANNEL : contains
  BRAND ||--o{ POST : authors
  CHANNEL ||--o{ PUBLICATION : targets
  POST ||--o{ PUBLICATION : dispatches
  PUBLICATION ||--o{ ATTEMPT : logs
  PUBLICATION ||--o{ METRICS : tracks

  BRAND {
    string id PK
    string user_id FK
    string name
    string website
    string audience
    string language
    datetime created_at
  }

  CHANNEL {
    string id PK
    string brand_id FK
    string provider
    string name
    string avatar_url
    string status
    string credentials_encrypted
    datetime created_at
  }

  POST {
    string id PK
    string brand_id FK
    string title
    string content
    string first_comment
    string media_assets
    string tags
    int revision
    string status
    datetime created_at
  }

  PUBLICATION {
    string id PK
    string post_id FK
    string channel_id FK
    string status
    datetime scheduled_for
    datetime published_at
    string permalink
    string error_message
    datetime created_at
  }

  ATTEMPT {
    string id PK
    string publication_id FK
    int attempt_number
    string status
    string log
    datetime attempted_at
  }

  METRICS {
    string id PK
    string publication_id FK
    int impressions
    int likes
    int comments
    int shares
    int clicks
    datetime recorded_at
  }
```

## 2. Table Specifications

### `channels`
- `id` (TEXT, Primary Key)
- `brand_id` (TEXT, Foreign Key -> `brands.id`)
- `provider` (TEXT): `'linkedin'`, `'dev'`, `'medium'`, `'indiehackers'`, `'facebook_groups'`
- `name` (TEXT): Account or page display name (e.g. "Vi Tran", "DEV browser fixture")
- `avatar_url` (TEXT): Profile photo or platform icon
- `status` (TEXT): `'connected'`, `'needs_reauth'`, `'disconnected'`
- `credentials_encrypted` (TEXT): JSON payload storing tokens, API keys, or cookies

### `posts`
- `id` (TEXT, Primary Key)
- `brand_id` (TEXT, Foreign Key -> `brands.id`)
- `title` (TEXT): Optional internal post label
- `content` (TEXT): Post markdown or plain text
- `first_comment` (TEXT): Optional initial comment automatically scheduled with the post
- `media_assets` (TEXT): JSON array of asset URLs or IDs
- `tags` (TEXT): JSON array of category or campaign tags
- `revision` (INTEGER): Optimistic concurrency and audit version counter
- `status` (TEXT): `'draft'`, `'approved'`, `'scheduled'`, `'published'`

### `publications`
- `id` (TEXT, Primary Key)
- `post_id` (TEXT, Foreign Key -> `posts.id`)
- `channel_id` (TEXT, Foreign Key -> `channels.id`)
- `status` (TEXT): `'scheduled'`, `'publishing'`, `'published'`, `'awaiting_manual'`, `'failed'`, `'user_reported_published'`
- `scheduled_for` (TEXT, ISO-8601): Scheduled dispatch timestamp
- `permalink` (TEXT): External social media post URL
