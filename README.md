# Loomii Geo Backend API

Express TypeScript backend server with Prisma ORM for the Loomii Geo application.

## Features

- **Express.js** with TypeScript
- **Prisma ORM** with PostgreSQL
- **Comprehensive API** for topics, competitors, and sources
- **Error handling** with custom error classes
- **Input validation** with Zod schemas
- **Security middleware** (Helmet, CORS, Rate limiting)
- **Development tools** (ESLint, Prettier, Nodemon)

## Setup

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL database
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd loomii-geo
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database configuration:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/loomii_geo"
PORT=3001
NODE_ENV=development
LOG_LEVEL=debug
```

4. Run database migrations:
```bash
npm run db:migrate
```

5. Generate Prisma client:
```bash
npm run db:generate
```

6. (Optional) Seed the database:
```bash
npm run db:seed
```

### Running the Application

#### Development
```bash
npm run dev
```
Server will start at `http://localhost:3001`

#### Production
```bash
npm run build
npm start
```

## API Endpoints

Base URL: `http://localhost:3001/api`

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Check API health status |

**Response:**
```json
{
  "success": true,
  "message": "Loomii Geo API is running",
  "timestamp": "2023-12-07T10:30:00.000Z"
}
```

### Topics

| Method | Endpoint | Description | Query Parameters |
|--------|----------|-------------|------------------|
| GET | `/topics` | Get all topics with pagination | `page`, `limit`, `status` |
| GET | `/topics/:id` | Get topic by ID | - |
| POST | `/topics` | Create new topic | - |
| PUT | `/topics/:id` | Update topic | - |
| DELETE | `/topics/:id` | Delete topic | - |

**GET /topics Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (boolean): Filter by status

**POST/PUT Request Body Example:**
```json
{
  "name": "Technology Trends",
  "description": "Latest technology trends and innovations",
  "status": true
}
```

### Competitors

| Method | Endpoint | Description | Query Parameters |
|--------|----------|-------------|------------------|
| GET | `/competitors` | Get all competitors with history | - |
| GET | `/competitors/:id` | Get competitor by ID | - |
| GET | `/competitors/:id/history` | Get competitor with history data | `months` |
| POST | `/competitors` | Create new competitor | - |
| PUT | `/competitors/:id` | Update competitor | - |
| DELETE | `/competitors/:id` | Delete competitor | - |
| POST | `/competitors/:id/history` | Add history entry | - |

**GET /competitors/:id/history Query Parameters:**
- `months` (number): Number of months of history to retrieve (default: 6)

**POST/PUT Competitor Request Body Example:**
```json
{
  "name": "Competitor Inc.",
  "rank": 1,
  "sentimentPositive": 75.5,
  "sentimentNeutral": 15.0,
  "sentimentNegative": 9.5,
  "visibility": 85.2,
  "visibilityChange": 2.3,
  "favicon": "https://example.com/favicon.ico"
}
```

**POST History Entry Request Body Example:**
```json
{
  "date": "2023-12-07T00:00:00.000Z",
  "visibility": 87.5
}
```

### Sources

| Method | Endpoint | Description | Query Parameters |
|--------|----------|-------------|------------------|
| GET | `/sources` | Get all sources | `yaelOnly` |
| GET | `/sources/:id` | Get source by ID | - |
| GET | `/sources/:id/details` | Get source with details | - |
| POST | `/sources` | Create new source | - |
| PUT | `/sources/:id` | Update source | - |
| DELETE | `/sources/:id` | Delete source | - |
| POST | `/sources/:id/details` | Add source detail | - |
| PUT | `/sources/:id/details/:detailId` | Update source detail | - |
| DELETE | `/sources/:id/details/:detailId` | Delete source detail | - |

**GET /sources Query Parameters:**
- `yaelOnly` (boolean): Filter sources with Yael Group mentions only

**POST/PUT Source Request Body Example:**
```json
{
  "source": "TechCrunch",
  "baseUrl": "https://techcrunch.com",
  "yaelGroupMentions": 15,
  "competitionMentions": 8,
  "totalMentions": 23
}
```

**POST/PUT Source Detail Request Body Example:**
```json
{
  "title": "Article Title",
  "url": "https://example.com/article",
  "publishedAt": "2023-12-07T10:00:00.000Z",
  "yaelGroupMentions": 3,
  "competitionMentions": 1,
  "totalMentions": 4
}
```

## Response Format

All API responses follow this standard format:

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the application for production
- `npm start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed the database with sample data
- `npm run db:studio` - Open Prisma Studio
- `npm run db:generate` - Generate Prisma client
- `npm run db:reset` - Reset database and run migrations
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode

## Database Schema

The application uses PostgreSQL with the following main entities:

- **Topics**: Content topics with status tracking
- **Competitors**: Competitor data with sentiment analysis and visibility metrics
- **CompetitorHistory**: Historical visibility data for competitors
- **Sources**: Media sources with mention tracking
- **SourceDetails**: Detailed articles/content from sources
- **AIProviderResponses**: AI-generated insights and responses
- **Prompts**: AI prompt templates

## Environment Variables

```env
DATABASE_URL="postgresql://username:password@localhost:5432/database"
PORT=3001
NODE_ENV=development
LOG_LEVEL=debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT 