# VideoMax Backend API

A comprehensive Node.js/Express backend supporting both admin dashboard and user platform frontends.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment setup:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   - `MONGODB_URI`: Your MongoDB connection string
   - `JWT_SECRET`: A secure random string for JWT tokens
   - `ADMIN_EMAIL` & `ADMIN_PASSWORD`: Admin login credentials

3. **Start the server:**
   ```bash
   # Development with auto-reload
   npm run dev
   
   # Production
   npm start
   ```

4. **Seed database (optional):**
   ```bash
   npm run seed
   ```

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout

### Videos
- `GET /api/videos` - Get published videos (with filters)
- `GET /api/videos/search` - Search videos
- `GET /api/videos/:id` - Get single video
- `POST /api/videos/:id/view` - Record video view
- `POST /api/videos/:id/like` - Like/unlike video
- `GET /api/videos/:id/comments` - Get video comments
- `POST /api/videos/:id/comments` - Add comment

### Upload
- `POST /api/upload/video` - Upload video with metadata
- `POST /api/upload/thumbnail/:videoId` - Upload thumbnail
- `DELETE /api/upload/video/:id` - Delete video
- `GET /api/upload/user-videos` - Get user's videos

### Users
- `GET /api/users/:id` - Get user profile
- `GET /api/users/:id/videos` - Get user's videos
- `GET /api/users/:id/stats` - Get user statistics
- `PUT /api/users/:id/avatar` - Update avatar
- `GET /api/users/search` - Search users

### Admin (Requires admin role)
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/users` - Manage users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/videos` - Manage videos

### Analytics
- `GET /api/analytics/overview` - Platform analytics (admin)
- `GET /api/analytics/video/:id` - Video analytics
- `GET /api/analytics/user` - User analytics
- `POST /api/analytics/event` - Record analytics event

## 📊 Database Models

### User
- Personal information and authentication
- Role-based access (user, admin, moderator)
- Profile settings and preferences
- Statistics tracking

### Video
- Video metadata and file information
- Category, tags, and visibility settings
- View counts, likes, and engagement metrics
- Status management (processing, published, private)

### Comment
- User comments on videos
- Nested replies support
- Moderation features (flagging, deletion)
- Engagement tracking

### Analytics
- Comprehensive event tracking
- Device and traffic source analysis
- Performance metrics
- Time-based analytics

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **Rate Limiting** - API abuse prevention
- **CORS Protection** - Cross-origin request security
- **Helmet.js** - Security headers
- **Input Validation** - Request validation and sanitization
- **Role-based Access** - Admin, moderator, and user roles

## 📝 File Upload

- **Multer Integration** - Efficient file handling
- **Multiple Formats** - Video and image support
- **Size Limits** - Configurable upload limits
- **Storage Management** - Local storage with cleanup
- **Validation** - File type and size validation

## 📈 Analytics & Monitoring

- **Real-time Metrics** - View counts, engagement tracking
- **Performance Analytics** - Video and user statistics
- **Admin Dashboard** - Platform overview and insights
- **Event Tracking** - Comprehensive user interaction logging

## 🌐 Deployment

### Render.com (Recommended)
1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Deploy automatically on git push

### Railway
1. Connect repository to Railway
2. Configure environment variables
3. Deploy with automatic builds

### Environment Variables
```bash
NODE_ENV=production
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure_admin_password
CORS_ORIGIN=https://your-frontend-domain.com
```

## 🛠️ Development

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed database with sample data

### Project Structure
```
backend/
├── models/          # Database models
├── routes/          # API route handlers
├── middleware/      # Authentication & error handling
├── scripts/         # Database seeding and utilities
├── uploads/         # File storage directory
├── server.js        # Main server file
└── package.json     # Dependencies and scripts
```

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check MONGODB_URI in .env file
   - Ensure MongoDB service is running
   - For Atlas: check network access and credentials

2. **File Upload Errors**
   - Check file size limits in configuration
   - Ensure uploads directory exists and is writable
   - Verify file type restrictions

3. **CORS Errors**
   - Update CORS_ORIGIN in .env
   - Check frontend URL configuration

4. **Authentication Issues**
   - Verify JWT_SECRET is set
   - Check token expiration settings
   - Ensure proper Authorization header format

## 📜 API Documentation

The API follows RESTful conventions with consistent response formats:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": []
}
```

### Authentication
Include JWT token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

🌟 **VideoMax Backend** - Built with ❤️ by MiniMax Agent