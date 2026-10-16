# MasterPacker

A packing and organization website for everything. Built with Next.js, SQLite, and Prisma.

## Features

- **Items Management**: Create, edit, and organize items with custom attributes
- **Boxes**: Nested box hierarchy for organizing items
- **Tags**: Flexible tagging system with classes and colors
- **Pictures**: Upload images for items and boxes (stored in SQLite BLOBs)
- **Labels & QR Codes**: Generate labels with QR codes for items and boxes
- **Search & Filter**: Find items and boxes by name, description, or tags
- **Snapshots**: Automatic and manual database snapshots for versioning
- **Multi-User**: User authentication with read-only mode
- **Dark/Light Mode**: Theme toggle with system preference support
- **Responsive**: Works on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: SQLite via Prisma ORM
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Auth**: Session-based authentication
- **Labels**: Satori + Resvg for label generation
- **QR Codes**: qrcode library

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd MasterPacker/app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set your `DATABASE_URL` and `NEXT_PUBLIC_BASE_URL`.

4. Initialize database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Create data directory:
   ```bash
   mkdir -p data/snapshots
   ```

6. Run the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production

To run in production mode:

```bash
npm run build
npm run start
```

The app will be available at the port specified in your environment.

## Configuration

### Database

The app uses SQLite by default. The database file is stored at `./data/masterpacker.db`.

### Snapshots

Snapshots are automatically created based on the settings in the app. They are stored in `./data/snapshots/`.

### QR Codes

QR codes on labels link to the item/box detail pages. Make sure `NEXT_PUBLIC_BASE_URL` is set correctly for your deployment.

## Project Structure

```
app/
├── src/
│   ├── app/              # Next.js pages and API routes
│   │   ├── api/          # API endpoints
│   │   ├── items/        # Item pages
│   │   ├── boxes/        # Box pages
│   │   ├── tags/         # Tag pages
│   │   └── settings/     # Settings page
│   ├── components/       # React components
│   ├── lib/              # Utility libraries
│   ├── hooks/            # React hooks
│   └── types/            # TypeScript types
├── prisma/              # Prisma schema and migrations
├── public/              # Static files
│   └── fonts/           # Fonts for label generation
└── data/                # Database and snapshots
    └── snapshots/        # Database snapshots
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Items
- `GET /api/items` - List all items (with filters)
- `POST /api/items` - Create new item
- `GET /api/items/:id` - Get item details
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item
- `POST /api/items/:id/pictures` - Upload picture
- `GET /api/items/:id/pictures` - Get pictures
- `DELETE /api/items/:id/pictures/:pictureId` - Delete picture

### Boxes
- `GET /api/boxes` - List all boxes (with filters)
- `POST /api/boxes` - Create new box
- `GET /api/boxes/:id` - Get box details
- `PUT /api/boxes/:id` - Update box
- `DELETE /api/boxes/:id` - Delete box
- `GET /api/boxes/:id/items` - Get items in box
- `POST /api/boxes/:id/items` - Add item to box
- `DELETE /api/boxes/:id/items/:itemId` - Remove item from box
- `POST /api/boxes/:id/pictures` - Upload picture
- `GET /api/boxes/:id/pictures` - Get pictures
- `DELETE /api/boxes/:id/pictures/:pictureId` - Delete picture

### Tags
- `GET /api/tags` - List all tags
- `POST /api/tags` - Create new tag
- `GET /api/tags/:id` - Get tag details
- `PUT /api/tags/:id` - Update tag
- `DELETE /api/tags/:id` - Delete tag (with merge option)

### Tag Classes
- `GET /api/tag-classes` - List all tag classes
- `POST /api/tag-classes` - Create new tag class
- `GET /api/tag-classes/:id` - Get tag class details
- `PUT /api/tag-classes/:id` - Update tag class
- `DELETE /api/tag-classes/:id` - Delete tag class

### Attributes
- `GET /api/attributes` - List all custom attributes
- `POST /api/attributes` - Create new attribute
- `GET /api/attributes/:id` - Get attribute details
- `PUT /api/attributes/:id` - Update attribute
- `DELETE /api/attributes/:id` - Delete attribute

### Labels
- `GET /api/labels/item/:id` - Generate label for item
- `GET /api/labels/box/:id` - Generate label for box

### Snapshots
- `GET /api/snapshots` - List all snapshots
- `POST /api/snapshots` - Create new snapshot
- `POST /api/snapshots/:id` - Restore snapshot
- `DELETE /api/snapshots/:id` - Delete snapshot

### Config
- `GET /api/config` - Get app configuration
- `PUT /api/config` - Update app configuration

## Usage Examples

### Creating Your First Item

1. Navigate to **Items** page
2. Click **Add Item**
3. Fill in the name and description
4. Add tags (create them first if needed)
5. Set custom attributes (create them in Settings first)
6. Click **Create Item**

### Organizing Items in Boxes

1. Navigate to **Boxes** page
2. Click **Add Box**
3. Give it a name and description
4. Optionally set a parent box for nesting
5. Go to the box detail page
6. Click **Add Items** and select items to add

### Generating Labels

1. Navigate to an item or box detail page
2. Click the **Generate Label** button (or access via `/api/labels/item/:id` or `/api/labels/box/:id`)
3. The label will be downloaded as a PNG file with QR code

### Tag Management

- Tags can be created, edited, and deleted
- When deleting a tag that's in use, you can merge it with another tag
- Tags can have colors and belong to tag classes
- Tags are used to filter items and boxes

## Database Schema

The app uses the following main models:

- **User**: User accounts with authentication
- **Session**: User sessions for authentication
- **Item**: Items with name, description, tags, attributes, and pictures
- **Box**: Boxes with name, description, parent-child relationships, tags, and pictures
- **Tag**: Tags with name, color, and optional tag class
- **TagClass**: Tag categories with name and color
- **Attribute**: Custom attribute definitions
- **ItemAttribute**: Attribute values for items
- **ItemTag**: Many-to-many relationship between items and tags
- **BoxTag**: Many-to-many relationship between boxes and tags
- **ItemPicture**: Pictures for items (stored as BLOBs)
- **BoxPicture**: Pictures for boxes (stored as BLOBs)
- **BoxItem**: Many-to-many relationship between boxes and items with quantity
- **Snapshot**: Database snapshot records
- **AppConfig**: Application configuration

## Customization

### Adding Custom Attributes

1. Go to **Settings** page
2. Scroll to **Custom Attributes** section
3. Click **Add Attribute**
4. Set name, type (TEXT, NUMBER, BOOLEAN, DATE, SELECT), and options (for SELECT type)
5. The attribute will be available for all items

### Theme Configuration

The app supports three theme modes:
- **Light**: Always use light theme
- **Dark**: Always use dark theme
- **System**: Use system preference

Users can toggle between themes in the Settings page.

### Snapshot Configuration

Configure automatic snapshots in Settings:
- **Snapshot Interval**: How often to create snapshots (in hours)
- **Maximum Snapshots**: How many snapshots to keep (oldest are deleted automatically)

Manual snapshots can be created at any time from the Settings page.

## Deployment

### Docker

Create a Dockerfile:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
```

Build and run:
```bash
docker build -t masterpacker .
docker run -p 3000:3000 -v ./data:/app/data masterpacker
```

### Manual Deployment

1. Build the app: `npm run build`
2. Copy the `.next` directory and `package.json` to your server
3. Install production dependencies: `npm install --production`
4. Set environment variables
5. Run: `npm run start`

## License

MIT
